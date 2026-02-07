import { ChatService } from './chat.service';
import { ChatMessageType, NotificationType } from '@prisma/client';
import { ForbiddenException, TooManyRequestsException } from '@nestjs/common';

const thread = {
  id: 'thread-1',
  buyerId: 'user-1',
  sellerId: 'user-2',
  storeId: 'store-1',
  store: {},
  buyer: { id: 'user-1', name: 'Buyer' },
  seller: { id: 'user-2', name: 'Seller' },
  messages: [],
  lastMessageAt: new Date(),
};

describe('ChatService unread counts', () => {
  it('updates unread after markRead', async () => {
    let lastReadAt = new Date('2026-02-01T00:00:00Z');

    const prisma = {
      block: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      chatThread: {
        findMany: jest.fn().mockResolvedValue([thread]),
        findUnique: jest.fn().mockResolvedValue(thread),
      },
      threadRead: {
        findMany: jest.fn().mockImplementation(() => [{ threadId: 'thread-1', lastReadAt }]),
        upsert: jest.fn().mockImplementation(({ update }) => {
          lastReadAt = update.lastReadAt;
          return { threadId: 'thread-1', userId: 'user-1', lastReadAt };
        }),
      },
      chatMessage: {
        count: jest.fn().mockImplementation(({ where }) => {
          const gt = where.createdAt.gt as Date;
          return gt > lastReadAt ? 0 : 2;
        }),
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', createdAt: new Date('2026-02-10T00:00:00Z') }),
      },
    } as any;

    const notifications = {
      create: jest.fn(),
    } as any;

    const service = new ChatService(prisma, notifications);

    const first = await service.getThreads('user-1');
    expect(first[0].unreadCount).toBe(2);

    await service.markRead({ threadId: 'thread-1', userId: 'user-1', lastReadAt: '2026-02-10T00:00:00Z' });

    const second = await service.getThreads('user-1');
    expect(second[0].unreadCount).toBe(0);
  });
});

describe('ChatService notifications', () => {
  it('creates notification for receiver on message', async () => {
    const prisma = {
      block: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      chatThread: {
        findUnique: jest.fn().mockResolvedValue(thread),
        update: jest.fn().mockResolvedValue({}),
      },
      chatMessage: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'msg-1',
          senderId: 'user-1',
          createdAt: new Date(),
        }),
      },
    } as any;

    const notifications = {
      create: jest.fn().mockResolvedValue({}),
    } as any;

    const service = new ChatService(prisma, notifications);

    await service.createMessage({
      threadId: 'thread-1',
      senderId: 'user-1',
      type: ChatMessageType.TEXT,
      text: 'Salut',
    });

    expect(notifications.create).toHaveBeenCalledWith(
      'user-2',
      NotificationType.CHAT_MESSAGE,
      'New message',
      expect.stringContaining('Buyer'),
      expect.objectContaining({ threadId: 'thread-1', senderId: 'user-1' }),
    );
  });

  it('blocks message send when users are blocked', async () => {
    const prisma = {
      block: {
        findFirst: jest.fn().mockResolvedValue({ id: 'block-1' }),
      },
      chatThread: {
        findUnique: jest.fn().mockResolvedValue(thread),
      },
      chatMessage: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;

    const notifications = {
      create: jest.fn(),
    } as any;

    const service = new ChatService(prisma, notifications);

    await expect(
      service.createMessage({
        threadId: 'thread-1',
        senderId: 'user-1',
        type: ChatMessageType.TEXT,
        text: 'Salut',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rate limits messages per minute', async () => {
    const prisma = {
      block: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      chatThread: {
        findUnique: jest.fn().mockResolvedValue(thread),
      },
      chatMessage: {
        count: jest.fn().mockResolvedValue(20),
      },
    } as any;

    const notifications = {
      create: jest.fn(),
    } as any;

    const service = new ChatService(prisma, notifications);

    await expect(
      service.createMessage({
        threadId: 'thread-1',
        senderId: 'user-1',
        type: ChatMessageType.TEXT,
        text: 'Spam',
      }),
    ).rejects.toThrow(TooManyRequestsException);
  });
});
