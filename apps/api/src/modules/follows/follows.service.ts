import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(userId: string, storeId: string) {
    return this.prisma.storeFollow.upsert({
      where: { userId_storeId: { userId, storeId } },
      update: {},
      create: { userId, storeId },
    });
  }

  async unfollow(userId: string, storeId: string) {
    await this.prisma.storeFollow.deleteMany({ where: { userId, storeId } });
    return { success: true };
  }
}

