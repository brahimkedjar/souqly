import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedAction, ListingStatus, ModerationStatus, ReportStatus, ReportTargetType } from '@prisma/client';
import { StorageService } from '../../common/storage/storage.service';

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private applyListingImageUrls(listing: any) {
    if (!listing?.product?.images) return listing;
    const images = listing.product.images.map((img: any) => {
      const urlMain = img.keyMain ? this.storage.getPublicUrl(img.keyMain) : img.urlMain || img.url || null;
      const urlThumb = img.keyThumb ? this.storage.getPublicUrl(img.keyThumb) : img.urlThumb || img.url || null;
      return { ...img, urlMain, urlThumb, url: urlMain };
    });
    return { ...listing, product: { ...listing.product, images } };
  }

  async recordEvent(userId: string, listingId: string, action: FeedAction) {
    const event = await this.prisma.feedEvent.create({
      data: {
        userId,
        listingId,
        action,
      },
    });

    if (action === FeedAction.VIEW || action === FeedAction.CLICK) {
      await this.prisma.feedSeen.upsert({
        where: { userId_listingId: { userId, listingId } },
        update: { seenAt: new Date() },
        create: { userId, listingId },
      });
    }

    return event;
  }

  async getFeed(userId: string | null, page: number, limit: number) {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const seenSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let seenIds: string[] = [];
    if (userId) {
      const seen = await this.prisma.feedSeen.findMany({
        where: { userId, seenAt: { gte: seenSince } },
        select: { listingId: true },
      });
      seenIds = seen.map((s) => s.listingId);
    }

    const moderationFilter = {
      OR: [{ moderation: { is: null } }, { moderation: { status: ModerationStatus.ACTIVE } }],
    };
    const baseWhere: any = { status: ListingStatus.ACTIVE, ...moderationFilter };
    if (seenIds.length > 0) {
      baseWhere.id = { notIn: seenIds };
    }

    let candidates = await this.prisma.listing.findMany({
      where: baseWhere,
      include: {
        product: { include: { images: true, category: true } },
        store: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    if (candidates.length < limit && seenIds.length > 0) {
      const extra = await this.prisma.listing.findMany({
        where: { status: ListingStatus.ACTIVE, id: { in: seenIds }, ...moderationFilter },
        include: {
          product: { include: { images: true, category: true } },
          store: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200 - candidates.length,
      });
      candidates = candidates.concat(extra);
    }

    if (candidates.length === 0) {
      return { data: [], page, limit, total: 0 };
    }

    const listingIds = candidates.map((l) => l.id);
    const productIds = candidates.map((l) => l.productId);
    const storeIds = candidates.map((l) => l.storeId);

    const [eventGroups, favoriteGroups, orderGroups, reviews, reports] = await Promise.all([
      this.prisma.feedEvent.groupBy({
        by: ['listingId'],
        where: { listingId: { in: listingIds }, createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.favorite.groupBy({
        by: ['listingId'],
        where: { listingId: { in: listingIds } },
        _count: { _all: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { productId: { in: productIds } },
        _count: { _all: true },
      }),
      this.prisma.review.findMany({
        where: { productId: { in: productIds } },
        include: { product: true },
      }),
      this.prisma.report.findMany({
        where: {
          status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
          OR: [
            { targetType: ReportTargetType.STORE, targetId: { in: storeIds } },
            { targetType: ReportTargetType.LISTING, targetId: { in: listingIds } },
          ],
        },
      }),
    ]);

    const popularityMap = new Map<string, number>();
    const eventMap = new Map(eventGroups.map((g) => [g.listingId, g._count._all]));
    const favMap = new Map(favoriteGroups.map((g) => [g.listingId, g._count._all]));
    const orderMap = new Map(orderGroups.map((g) => [g.productId, g._count._all]));

    for (const listing of candidates) {
      const events = eventMap.get(listing.id) || 0;
      const favs = favMap.get(listing.id) || 0;
      const orders = orderMap.get(listing.productId) || 0;
      const popularity = events + favs * 2 + orders * 3;
      popularityMap.set(listing.id, popularity);
    }

    const maxPopularity = Math.max(...Array.from(popularityMap.values()), 1);

    const storeRatingMap = new Map<string, number>();
    const ratingAgg = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
      const storeId = review.product.storeId;
      const current = ratingAgg.get(storeId) || { sum: 0, count: 0 };
      ratingAgg.set(storeId, { sum: current.sum + review.rating, count: current.count + 1 });
    }
    for (const [storeId, agg] of ratingAgg.entries()) {
      storeRatingMap.set(storeId, agg.sum / agg.count);
    }

    const storeReportMap = new Map<string, number>();
    const listingReportMap = new Map<string, number>();
    for (const report of reports) {
      if (report.targetType === 'STORE') {
        storeReportMap.set(report.targetId, (storeReportMap.get(report.targetId) || 0) + 1);
      } else if (report.targetType === 'LISTING') {
        listingReportMap.set(report.targetId, (listingReportMap.get(report.targetId) || 0) + 1);
      }
    }

    let followedStoreIds = new Set<string>();
    let categoryAffinity = new Map<string, number>();

    if (userId) {
      const [follows, events] = await Promise.all([
        this.prisma.storeFollow.findMany({ where: { userId } }),
        this.prisma.feedEvent.findMany({
          where: { userId, createdAt: { gte: since } },
          include: { listing: { include: { product: true } } },
        }),
      ]);

      followedStoreIds = new Set(follows.map((f) => f.storeId));

      const categoryCount = new Map<string, number>();
      for (const event of events) {
        const categoryId = event.listing.product.categoryId;
        if (!categoryId) continue;
        categoryCount.set(categoryId, (categoryCount.get(categoryId) || 0) + 1);
      }

      const maxCategory = Math.max(...Array.from(categoryCount.values()), 1);
      for (const [categoryId, count] of categoryCount.entries()) {
        categoryAffinity.set(categoryId, count / maxCategory);
      }
    }

    const seenSet = new Set(seenIds);
    const scored = this.rankListings(candidates, {
      followedStoreIds,
      categoryAffinity,
      popularityMap,
      maxPopularity,
      now,
      seenSet,
      storeRatingMap,
      storeReportMap,
      listingReportMap,
    });

    const windowSize = Math.max(limit * page, limit);
    const diversified = this.diversifyListings(scored, windowSize);

    const total = scored.length;
    const start = (page - 1) * limit;
    const paged = diversified.slice(start, start + limit).map((item) => item.listing);
    const data = paged.map((item) => this.applyListingImageUrls(item));

    return { data, page, limit, total };
  }

  rankListings(
    listings: any[],
    inputs: {
      followedStoreIds: Set<string>;
      categoryAffinity: Map<string, number>;
      popularityMap: Map<string, number>;
      maxPopularity: number;
      now: Date;
      seenSet: Set<string>;
      storeRatingMap: Map<string, number>;
      storeReportMap: Map<string, number>;
      listingReportMap: Map<string, number>;
    },
  ) {
    const weights = {
      followedStore: 3.0,
      categoryAffinity: 2.0,
      popularity: 1.5,
      recency: 1.0,
      sellerResponse: 0.5,
    };

    const scored: { listing: any; score: number }[] = listings.map((listing) => {
      const isFromFollowedStore = inputs.followedStoreIds.has(listing.storeId) ? 1 : 0;
      const categoryId = listing.product?.categoryId;
      const categoryAffinity = categoryId ? inputs.categoryAffinity.get(categoryId) || 0 : 0;
      const popularity = (inputs.popularityMap.get(listing.id) || 0) / inputs.maxPopularity;
      const ageMs = inputs.now.getTime() - new Date(listing.createdAt).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-ageDays / 7);
      const sellerResponse = 0;

      const baseScore =
        weights.followedStore * isFromFollowedStore +
        weights.categoryAffinity * categoryAffinity +
        weights.popularity * popularity +
        weights.recency * recency +
        weights.sellerResponse * sellerResponse;

      const seenPenalty = inputs.seenSet.has(listing.id) ? 0.4 : 0;
      const storeRating = inputs.storeRatingMap.get(listing.storeId);
      const ratingPenalty = storeRating && storeRating < 3.5 ? (3.5 - storeRating) / 3.5 : 0;
      const storeReports = inputs.storeReportMap.get(listing.storeId) || 0;
      const listingReports = inputs.listingReportMap.get(listing.id) || 0;
      const reportPenalty = Math.min((storeReports + listingReports) / 5, 1) * 0.5;

      const penalty = Math.min(0.8, seenPenalty + ratingPenalty + reportPenalty);
      const score = baseScore * (1 - penalty);

      return { listing, score };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  diversifyListings(scored: { listing: any; score: number }[], limit: number) {
    const maxPerStore = limit >= 20 ? 2 : 1;
    const selected: { listing: any; score: number }[] = [];
    const selectedIds = new Set<string>();
    const storeCounts = new Map<string, number>();
    const categories = new Set<string>();

    const uniqueCategories = new Set(
      scored.map((item) => item.listing.product?.categoryId).filter((id) => !!id),
    );
    const targetCategories = Math.min(3, uniqueCategories.size);

    for (const item of scored) {
      if (selected.length >= limit || categories.size >= targetCategories) {
        break;
      }
      const storeId = item.listing.storeId;
      const categoryId = item.listing.product?.categoryId || 'uncat';
      const count = storeCounts.get(storeId) || 0;
      if (!categories.has(categoryId) && count < maxPerStore && !selectedIds.has(item.listing.id)) {
        selected.push(item);
        selectedIds.add(item.listing.id);
        storeCounts.set(storeId, count + 1);
        categories.add(categoryId);
      }
    }

    for (const item of scored) {
      if (selected.length >= limit) {
        break;
      }
      if (selectedIds.has(item.listing.id)) {
        continue;
      }
      const storeId = item.listing.storeId;
      const count = storeCounts.get(storeId) || 0;
      if (count < maxPerStore) {
        selected.push(item);
        selectedIds.add(item.listing.id);
        storeCounts.set(storeId, count + 1);
      }
    }

    if (selected.length < limit) {
      for (const item of scored) {
        if (selected.length >= limit) {
          break;
        }
        if (selectedIds.has(item.listing.id)) {
          continue;
        }
        selected.push(item);
        selectedIds.add(item.listing.id);
      }
    }

    return selected;
  }
}


