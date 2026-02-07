import { AdminService } from './admin.service';
import { ReportStatus, ModerationStatus } from '@prisma/client';

describe('AdminService', () => {
  it('lists reports with cursor', async () => {
    const prisma = {
      report: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'r1', createdAt: new Date('2026-02-01T00:00:00Z') },
        ]),
      },
      listing: { findMany: jest.fn(), count: jest.fn() },
      listingModeration: { upsert: jest.fn(), count: jest.fn() },
      user: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    } as any;

    const notifications = { create: jest.fn() } as any;
    const service = new AdminService(prisma, notifications);

    const result = await service.listReports(ReportStatus.OPEN, 20);
    expect(result.data.length).toBe(1);
    expect(result.nextCursor).toBeTruthy();
  });

  it('updates report status and notifies reporter', async () => {
    const prisma = {
      report: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', reporterId: 'user-1' }),
        update: jest.fn().mockResolvedValue({ id: 'r1', status: ReportStatus.RESOLVED }),
      },
      listing: { findMany: jest.fn(), count: jest.fn() },
      listingModeration: { upsert: jest.fn(), count: jest.fn() },
      user: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    } as any;
    const notifications = { create: jest.fn() } as any;
    const service = new AdminService(prisma, notifications);

    await service.updateReportStatus('r1', ReportStatus.RESOLVED, 'ok', 'admin-1');
    expect(notifications.create).toHaveBeenCalled();
  });

  it('updates listing moderation', async () => {
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({ id: 'l1', store: { ownerId: 'owner-1' } }),
      },
      listingModeration: {
        upsert: jest.fn().mockResolvedValue({ listingId: 'l1', status: ModerationStatus.HIDDEN }),
        count: jest.fn(),
      },
      report: { findMany: jest.fn() },
      user: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    } as any;
    const notifications = { create: jest.fn() } as any;
    const service = new AdminService(prisma, notifications);

    const result = await service.updateListingModeration('l1', ModerationStatus.HIDDEN, 'test');
    expect(result.moderation.status).toBe(ModerationStatus.HIDDEN);
    expect(notifications.create).toHaveBeenCalled();
  });
});
