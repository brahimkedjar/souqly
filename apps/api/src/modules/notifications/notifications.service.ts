import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(userId: string, type: NotificationType, title: string, body: string, data?: Record<string, any>) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data,
      },
    });

    await this.emitToUser(userId, notification);
    return notification;
  }

  async list(userId: string, limit = 20, cursor?: string) {
    const where: any = { userId };
    if (cursor) {
      const [createdAt, id] = this.decodeCursor(cursor);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const data = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const nextCursor = data.length === limit ? this.encodeCursor(data[data.length - 1]) : null;
    return { data, nextCursor };
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
    await this.emitUnreadCount(userId);
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true, readAt: new Date() },
    });
    await this.emitUnreadCount(userId);
    return { success: true };
  }

  async since(userId: string, after: string, limit = 50) {
    const afterDate = new Date(after);
    const data = await this.prisma.notification.findMany({
      where: { userId, createdAt: { gt: afterDate } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return { data, nextCursor: null };
  }

  async emitToUser(userId: string, notification: any) {
    try {
      this.gateway.emitNew(userId, notification);
      await this.emitUnreadCount(userId);
    } catch (error) {
      this.logger.warn('Failed to emit notification', error as any);
    }
  }

  async emitUnreadCount(userId: string) {
    const count = await this.unreadCount(userId);
    this.gateway.emitUnreadCount(userId, count);
  }

  private encodeCursor(notification: { createdAt: Date; id: string }) {
    const raw = `${notification.createdAt.toISOString()}|${notification.id}`;
    return Buffer.from(raw).toString('base64');
  }

  private decodeCursor(cursor: string): [Date, string] {
    const raw = Buffer.from(cursor, 'base64').toString('utf8');
    const [createdAt, id] = raw.split('|');
    return [new Date(createdAt), id];
  }
}
