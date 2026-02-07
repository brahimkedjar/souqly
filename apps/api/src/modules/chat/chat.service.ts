import { ForbiddenException, Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatMessageType, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async buildThread(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        store: true,
        buyer: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        seller: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!thread) {
      throw new NotFoundException({ message: 'Thread not found', code: 'THREAD_NOT_FOUND' });
    }
    const read = await this.prisma.threadRead.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    const lastReadAt = read?.lastReadAt ?? new Date(0);
    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        threadId,
        createdAt: { gt: lastReadAt },
        senderId: { not: userId },
      },
    });
    return { ...thread, unreadCount };
  }

  async getThreads(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    const blockedIds = new Set(
      blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)),
    );

    const threads = await this.prisma.chatThread.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        store: true,
        buyer: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        seller: { select: { id: true, name: true, avatarUrl: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const filteredThreads = threads.filter((thread) => {
      const counterpartId = thread.buyerId === userId ? thread.sellerId : thread.buyerId;
      return !blockedIds.has(counterpartId);
    });

    const threadIds = filteredThreads.map((t) => t.id);
    const reads = await this.prisma.threadRead.findMany({
      where: { userId, threadId: { in: threadIds } },
    });
    const readMap = new Map(reads.map((r) => [r.threadId, r.lastReadAt]));

    const enriched = await Promise.all(
      filteredThreads.map(async (thread) => {
        const lastReadAt = readMap.get(thread.id) || new Date(0);
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            threadId: thread.id,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
          },
        });
        return { ...thread, unreadCount };
      }),
    );

    return enriched;
  }

  async createThread(buyerId: string, storeId: string, sellerId: string) {
    await this.ensureNotBlocked(buyerId, sellerId);
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== sellerId) {
      throw new ForbiddenException({ message: 'Seller mismatch', code: 'SELLER_MISMATCH' });
    }

    const thread = await this.prisma.chatThread.upsert({
      where: { buyerId_sellerId_storeId: { buyerId, sellerId, storeId } },
      update: {},
      create: { buyerId, sellerId, storeId },
    });
    return this.buildThread(thread.id, buyerId);
  }

  async createThreadDirect(buyerId: string, sellerId: string, storeId: string) {
    await this.ensureNotBlocked(buyerId, sellerId);
    const thread = await this.prisma.chatThread.upsert({
      where: { buyerId_sellerId_storeId: { buyerId, sellerId, storeId } },
      update: {},
      create: { buyerId, sellerId, storeId },
    });
    return this.buildThread(thread.id, buyerId);
  }

  async getMessages(threadId: string, userId: string, page: number, limit: number, after?: string) {
    await this.ensureParticipant(threadId, userId);

    if (after) {
      const afterDate = new Date(after);
      const data = await this.prisma.chatMessage.findMany({
        where: { threadId, createdAt: { gt: afterDate } },
        orderBy: { createdAt: 'asc' },
      });
      return { data, page: 1, limit: data.length, total: data.length };
    }

    const [data, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.chatMessage.count({ where: { threadId } }),
    ]);

    return { data, page, limit, total };
  }

  async createMessage(params: {
    threadId: string;
    senderId: string;
    type: ChatMessageType;
    text?: string | null;
    imageUrl?: string | null;
  }) {
    const thread = await this.ensureParticipant(params.threadId, params.senderId);

    const receiverId = thread.buyerId === params.senderId ? thread.sellerId : thread.buyerId;
    await this.ensureNotBlocked(params.senderId, receiverId);

    const windowStart = new Date(Date.now() - 60 * 1000);
    const recentCount = await this.prisma.chatMessage.count({
      where: {
        threadId: params.threadId,
        senderId: params.senderId,
        createdAt: { gte: windowStart },
      },
    });
    if (recentCount >= 20) {
      throw new HttpException({ message: 'Rate limit', code: 'CHAT_RATE_LIMIT' }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: params.threadId,
        senderId: params.senderId,
        type: params.type,
        text: params.text,
        imageUrl: params.imageUrl,
      },
    });

    await this.prisma.chatThread.update({
      where: { id: params.threadId },
      data: { lastMessageAt: new Date() },
    });

    const senderName = thread.buyerId === params.senderId ? thread.buyer.name : thread.seller.name;
    const preview = params.text ? params.text : 'Image';
    await this.notificationsService.create(
      receiverId,
      NotificationType.CHAT_MESSAGE,
      'New message',
      `${senderName}: ${preview}`.slice(0, 140),
      { threadId: thread.id, senderId: params.senderId, storeId: thread.storeId },
    );

    return message;
  }

  async markRead(params: { threadId: string; userId: string; messageId?: string; lastReadAt?: string }) {
    await this.ensureParticipant(params.threadId, params.userId);

    let lastReadAt = params.lastReadAt ? new Date(params.lastReadAt) : new Date();
    if (params.messageId) {
      const message = await this.prisma.chatMessage.findUnique({ where: { id: params.messageId } });
      if (message) {
        lastReadAt = message.createdAt;
      }
    }

    return this.prisma.threadRead.upsert({
      where: { threadId_userId: { threadId: params.threadId, userId: params.userId } },
      update: { lastReadAt },
      create: { threadId: params.threadId, userId: params.userId, lastReadAt },
    });
  }

  async ensureParticipant(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: { buyer: true, seller: true, store: true },
    });
    if (!thread) {
      throw new NotFoundException({ message: 'Thread not found', code: 'THREAD_NOT_FOUND' });
    }
    if (thread.buyerId !== userId && thread.sellerId !== userId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'THREAD_FORBIDDEN' });
    }
    return thread;
  }

  private async ensureNotBlocked(userA: string, userB: string) {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException({ message: 'User blocked', code: 'USER_BLOCKED' });
    }
  }
}
