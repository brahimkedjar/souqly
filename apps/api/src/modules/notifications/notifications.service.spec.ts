import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  it('creates notification and emits', async () => {
    const notification = {
      id: 'notif-1',
      userId: 'user-1',
      title: 'Hello',
      body: 'World',
      type: NotificationType.SYSTEM,
      createdAt: new Date(),
      isRead: false,
    };

    const prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(notification),
        count: jest.fn().mockResolvedValue(1),
      },
    } as any;

    const gateway = {
      emitNew: jest.fn(),
      emitUnreadCount: jest.fn(),
    } as any;

    const service = new NotificationsService(prisma, gateway);
    const result = await service.create('user-1', NotificationType.SYSTEM, 'Hello', 'World');

    expect(result).toEqual(notification);
    expect(prisma.notification.create).toHaveBeenCalled();
    expect(gateway.emitNew).toHaveBeenCalledWith('user-1', notification);
    expect(gateway.emitUnreadCount).toHaveBeenCalledWith('user-1', 1);
  });
});
