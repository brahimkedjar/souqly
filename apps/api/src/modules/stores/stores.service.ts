import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        location: dto.location,
      },
    });
  }

  async getById(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    return store;
  }

  async update(id: string, userId: string, dto: UpdateStoreDto, isAdmin = false) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (!isAdmin && store.ownerId !== userId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    return this.prisma.store.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        location: dto.location,
      },
    });
  }

  async delete(id: string, userId: string, isAdmin = false) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (!isAdmin && store.ownerId !== userId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    await this.prisma.store.delete({ where: { id } });
    return { success: true };
  }

  async listByOwner(ownerId: string) {
    return this.prisma.store.findMany({ where: { ownerId } });
  }

  async analytics(storeId: string) {
    const [views, favorites, orders, followers] = await Promise.all([
      this.prisma.feedEvent.count({ where: { action: 'VIEW', listing: { storeId } } }),
      this.prisma.favorite.count({ where: { listing: { storeId } } }),
      this.prisma.orderItem.count({ where: { product: { storeId } } }),
      this.prisma.storeFollow.count({ where: { storeId } }),
    ]);

    return {
      views,
      favorites,
      orders,
      followers,
    };
  }
}

