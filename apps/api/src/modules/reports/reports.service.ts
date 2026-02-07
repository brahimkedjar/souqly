import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportTargetType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    if (dto.targetType === ReportTargetType.USER && dto.targetId === reporterId) {
      throw new BadRequestException({ message: 'Cannot report yourself', code: 'REPORT_SELF' });
    }

    await this.ensureTargetExists(dto.targetType, dto.targetId);

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async listMine(reporterId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { reporterId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where: { reporterId } }),
    ]);
    return { data, page, limit, total };
  }

  private async ensureTargetExists(targetType: ReportTargetType, targetId: string) {
    switch (targetType) {
      case ReportTargetType.LISTING: {
        const item = await this.prisma.listing.findUnique({ where: { id: targetId } });
        if (!item) throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
        return;
      }
      case ReportTargetType.PRODUCT: {
        const item = await this.prisma.product.findUnique({ where: { id: targetId } });
        if (!item) throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
        return;
      }
      case ReportTargetType.STORE: {
        const item = await this.prisma.store.findUnique({ where: { id: targetId } });
        if (!item) throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
        return;
      }
      case ReportTargetType.USER: {
        const item = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!item) throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
        return;
      }
      case ReportTargetType.MESSAGE: {
        const item = await this.prisma.chatMessage.findUnique({ where: { id: targetId } });
        if (!item) throw new NotFoundException({ message: 'Message not found', code: 'MESSAGE_NOT_FOUND' });
        return;
      }
      default:
        return;
    }
  }
}
