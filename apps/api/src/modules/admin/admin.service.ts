import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModerationStatus, NotificationType, ReportStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listReports(status?: ReportStatus, limit = 20, cursor?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (cursor) {
      const [createdAt, id] = this.decodeCursor(cursor);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ];
    }

    const data = await this.prisma.report.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true, email: true } },
      },
    });

    const nextCursor = data.length === limit ? this.encodeCursor(data[data.length - 1]) : null;
    return { data, nextCursor };
  }

  async updateReportStatus(id: string, status: ReportStatus, resolutionNote?: string, resolverId?: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException({ message: 'Report not found', code: 'REPORT_NOT_FOUND' });
    }

    const resolved = status === ReportStatus.RESOLVED || status === ReportStatus.REJECTED;
    const updated = await this.prisma.report.update({
      where: { id },
      data: {
        status,
        resolutionNote,
        resolverId,
        resolvedAt: resolved ? new Date() : null,
      },
    });

    if (resolved) {
      await this.notificationsService.create(
        report.reporterId,
        NotificationType.SYSTEM,
        'Report update',
        `Votre signalement est ${status}`,
        { reportId: report.id, status },
      );
    }

    return updated;
  }

  async listListings(status?: string, page = 1, limit = 20) {
    let where: any = {};
    if (status === ModerationStatus.ACTIVE) {
      where = { OR: [{ moderation: { is: null } }, { moderation: { status: ModerationStatus.ACTIVE } }] };
    } else if (status) {
      where = { moderation: { status } };
    }
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { product: true, store: true, moderation: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { data, page, limit, total };
  }

  async updateListingModeration(id: string, status: ModerationStatus, reason?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }

    const moderation = await this.prisma.listingModeration.upsert({
      where: { listingId: id },
      update: { status, reason },
      create: { listingId: id, status, reason },
    });

    if (status !== ModerationStatus.ACTIVE) {
      await this.notificationsService.create(
        listing.store.ownerId,
        NotificationType.SYSTEM,
        'Listing moderated',
        `Votre listing est ${status}`,
        { listingId: listing.id, status, reason },
      );
    }

    return { listing, moderation };
  }

  async deleteListing(id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    await this.prisma.listing.delete({ where: { id } });
    return { success: true };
  }

  async listUsers(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, email: true, name: true, roles: true, createdAt: true, isBanned: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data, page, limit, total };
  }

  async updateUserRoles(id: string, roles: Role[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return this.prisma.user.update({ where: { id }, data: { roles } });
  }

  async updateUserBan(id: string, isBanned: boolean, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        isBanned,
        bannedAt: isBanned ? new Date() : null,
        banReason: isBanned ? reason : null,
      },
    });
  }

  async stats() {
    const [openReports, removedListings, bannedUsers] = await Promise.all([
      this.prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      this.prisma.listingModeration.count({ where: { status: ModerationStatus.REMOVED } }),
      this.prisma.user.count({ where: { isBanned: true } }),
    ]);
    return {
      openReports,
      removedListings,
      bannedUsers,
    };
  }

  private encodeCursor(report: { createdAt: Date; id: string }) {
    const raw = `${report.createdAt.toISOString()}|${report.id}`;
    return Buffer.from(raw).toString('base64');
  }

  private decodeCursor(cursor: string): [Date, string] {
    const raw = Buffer.from(cursor, 'base64').toString('utf8');
    const [createdAt, id] = raw.split('|');
    return [new Date(createdAt), id];
  }
}
