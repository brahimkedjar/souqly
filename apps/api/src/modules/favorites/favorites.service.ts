import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedService } from '../feed/feed.service';
import { FeedAction } from '@prisma/client';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService, private readonly feedService: FeedService) {}

  async add(userId: string, listingId: string) {
    const favorite = await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });

    await this.feedService.recordEvent(userId, listingId, FeedAction.FAVORITE);
    return favorite;
  }

  async remove(userId: string, listingId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    return { success: true };
  }
}

