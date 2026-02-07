import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  it('returns unread count', async () => {
    const service = {
      unreadCount: jest.fn().mockResolvedValue(3),
      list: jest.fn(),
      since: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    } as any;

    const controller = new NotificationsController(service);
    const result = await controller.unreadCount({ id: 'user-1' });
    expect(result).toEqual({ count: 3 });
    expect(service.unreadCount).toHaveBeenCalledWith('user-1');
  });

  it('validates since parameter', async () => {
    const service = {
      unreadCount: jest.fn(),
      list: jest.fn(),
      since: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    } as any;

    const controller = new NotificationsController(service);
    await expect(controller.since({ id: 'user-1' }, {})).rejects.toThrow();
  });
});
