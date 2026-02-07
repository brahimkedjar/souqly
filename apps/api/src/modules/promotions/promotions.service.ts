import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: string, ownerId: string, dto: CreatePromotionDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    return this.prisma.promotion.create({
      data: {
        storeId,
        title: dto.title,
        description: dto.description,
        discountPct: dto.discountPct,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  async listByStore(storeId: string) {
    return this.prisma.promotion.findMany({
      where: { storeId },
      orderBy: { startsAt: 'desc' },
    });
  }

  async remove(id: string, ownerId: string) {
    const promo = await this.prisma.promotion.findUnique({ where: { id }, include: { store: true } });
    if (!promo) {
      throw new NotFoundException({ message: 'Promotion not found', code: 'PROMO_NOT_FOUND' });
    }
    if (promo.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    await this.prisma.promotion.delete({ where: { id } });
    return { success: true };
  }
}

