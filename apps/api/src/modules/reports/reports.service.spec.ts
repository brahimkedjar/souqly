import { ReportsService } from './reports.service';
import { ReportReason, ReportTargetType } from '@prisma/client';

describe('ReportsService', () => {
  it('creates report', async () => {
    const prisma = {
      report: {
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
      listing: { findUnique: jest.fn().mockResolvedValue({ id: 'listing-1' }) },
      product: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      chatMessage: { findUnique: jest.fn() },
    } as any;

    const service = new ReportsService(prisma);
    const result = await service.create('user-1', {
      targetType: ReportTargetType.LISTING,
      targetId: 'listing-1',
      reason: ReportReason.SPAM,
      description: 'test',
    });

    expect(result).toEqual({ id: 'r1' });
    expect(prisma.report.create).toHaveBeenCalled();
  });

  it('lists mine', async () => {
    const prisma = {
      report: {
        findMany: jest.fn().mockResolvedValue([{ id: 'r1' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      listing: { findUnique: jest.fn() },
      product: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      chatMessage: { findUnique: jest.fn() },
    } as any;

    const service = new ReportsService(prisma);
    const result = await service.listMine('user-1', 1, 20);
    expect(result.total).toBe(1);
    expect(result.data.length).toBe(1);
  });
});
