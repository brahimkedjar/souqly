import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateUsedListingDto } from './dto/create-used-listing.dto';
import { UpdateUsedListingDto } from './dto/update-used-listing.dto';
import { ListingIntent, ListingStatus, ModerationStatus, ProductStatus } from '@prisma/client';

@Injectable()
export class ListingsService {
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

  async create(storeId: string, ownerId: string, dto: CreateListingDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.storeId !== storeId) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (!product.categoryId) {
      throw new BadRequestException({ message: 'Category is required', code: 'CATEGORY_REQUIRED' });
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException({ message: 'Product not active', code: 'PRODUCT_NOT_ACTIVE' });
    }
    const imagesCount = await this.prisma.productImage.count({ where: { productId: product.id } });
    if (imagesCount < 1) {
      throw new BadRequestException({ message: 'Images required', code: 'IMAGES_REQUIRED' });
    }

    return this.prisma.listing.create({
      data: {
        storeId,
        productId: dto.productId,
        titleOverride: dto.titleOverride,
        descriptionOverride: dto.descriptionOverride,
        status: dto.status || ListingStatus.DRAFT,
        tags: dto.tags || [],
      },
    });
  }

  private ensureUsedValid(params: {
    conditionScore?: number | null;
    intent?: ListingIntent | null;
    priceOverride?: number | null;
    productPrice?: number | null;
    exchangeWanted?: string | null;
  }) {
    const conditionScore = params.conditionScore;
    if (conditionScore == null || Number.isNaN(Number(conditionScore))) {
      throw new BadRequestException({ message: 'Condition required', code: 'CONDITION_REQUIRED' });
    }
    if (conditionScore < 0 || conditionScore > 10) {
      throw new BadRequestException({ message: 'Condition invalid', code: 'CONDITION_INVALID' });
    }
    const intent = params.intent;
    if (!intent) {
      throw new BadRequestException({ message: 'Intent required', code: 'INTENT_REQUIRED' });
    }
    if (intent === ListingIntent.SELL) {
      const price = params.priceOverride ?? params.productPrice;
      if (price == null || Number(price) <= 0) {
        throw new BadRequestException({ message: 'Price required', code: 'PRICE_REQUIRED' });
      }
    }
    if (intent === ListingIntent.EXCHANGE) {
      const wanted = params.exchangeWanted?.trim();
      if (!wanted) {
        throw new BadRequestException({ message: 'Exchange wanted required', code: 'EXCHANGE_WANTED_REQUIRED' });
      }
    }
  }

  async createUsedListing(storeId: string, ownerId: string, dto: CreateUsedListingDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.storeId !== storeId) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (!product.categoryId) {
      throw new BadRequestException({ message: 'Category is required', code: 'CATEGORY_REQUIRED' });
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException({ message: 'Product not active', code: 'PRODUCT_NOT_ACTIVE' });
    }
    const imagesCount = await this.prisma.productImage.count({ where: { productId: product.id } });
    if (imagesCount < 1) {
      throw new BadRequestException({ message: 'Images required', code: 'IMAGES_REQUIRED' });
    }

    this.ensureUsedValid({
      conditionScore: dto.conditionScore,
      intent: dto.intent,
      priceOverride: dto.priceOverride,
      productPrice: Number(product.price),
      exchangeWanted: dto.exchangeWanted,
    });

    const listing = await this.prisma.listing.create({
      data: {
        storeId,
        productId: dto.productId,
        status: dto.status || ListingStatus.ACTIVE,
        tags: dto.tags || [],
        isUsed: true,
        conditionScore: dto.conditionScore,
        intent: dto.intent,
        priceOverride: dto.priceOverride,
        remark: dto.remark,
        exchangeWanted: dto.exchangeWanted,
        exchangeCategoryId: dto.exchangeCategoryId,
      },
      include: { product: { include: { images: true, category: true } }, store: true },
    });
    return this.applyListingImageUrls(listing);
  }

  async updateUsedListing(id: string, ownerId: string, dto: UpdateUsedListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { store: true, product: true },
    });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    if (listing.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    if (!listing.isUsed) {
      throw new BadRequestException({ message: 'Not used listing', code: 'NOT_USED_LISTING' });
    }

    const nextCondition = dto.conditionScore ?? listing.conditionScore;
    const nextIntent = dto.intent ?? listing.intent;
    const nextPriceOverrideRaw = dto.priceOverride ?? listing.priceOverride;
    const nextPriceOverride = nextPriceOverrideRaw == null ? null : Number(nextPriceOverrideRaw);
    const nextExchangeWanted = dto.exchangeWanted ?? listing.exchangeWanted;

    this.ensureUsedValid({
      conditionScore: nextCondition,
      intent: nextIntent,
      priceOverride: nextPriceOverride,
      productPrice: Number(listing.product.price),
      exchangeWanted: nextExchangeWanted,
    });

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        conditionScore: dto.conditionScore,
        intent: dto.intent,
        priceOverride: dto.priceOverride,
        remark: dto.remark,
        exchangeWanted: dto.exchangeWanted,
        exchangeCategoryId: dto.exchangeCategoryId,
        status: dto.status,
        tags: dto.tags,
      },
      include: { product: { include: { images: true, category: true } }, store: true },
    });
    return this.applyListingImageUrls(updated);
  }

  async getById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        product: { include: { images: true, category: true } },
        store: true,
        moderation: true,
      },
    });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    if (listing.moderation && listing.moderation.status !== ModerationStatus.ACTIVE) {
      throw new NotFoundException({ message: 'Listing not available', code: 'LISTING_HIDDEN' });
    }
    return this.applyListingImageUrls(listing);
  }

  async getUsedById(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        product: { include: { images: true, category: true } },
        store: true,
        moderation: true,
      },
    });
    if (!listing || !listing.isUsed) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    if (listing.moderation && listing.moderation.status !== ModerationStatus.ACTIVE) {
      throw new NotFoundException({ message: 'Listing not available', code: 'LISTING_HIDDEN' });
    }
    return this.applyListingImageUrls(listing);
  }

  async update(id: string, ownerId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    if (listing.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    return this.prisma.listing.update({
      where: { id },
      data: {
        titleOverride: dto.titleOverride,
        descriptionOverride: dto.descriptionOverride,
        status: dto.status,
        tags: dto.tags,
      },
    });
  }

  async delete(id: string, ownerId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!listing) {
      throw new NotFoundException({ message: 'Listing not found', code: 'LISTING_NOT_FOUND' });
    }
    if (listing.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    await this.prisma.listing.delete({ where: { id } });
    return { success: true };
  }

  async listByStore(storeId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { storeId },
        include: { product: { include: { images: true } }, store: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where: { storeId } }),
    ]);
    return { data: data.map((item) => this.applyListingImageUrls(item)), page, limit, total };
  }

  async listUsedByStore(storeId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { storeId, isUsed: true },
        include: { product: { include: { images: true, category: true } }, store: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.listing.count({ where: { storeId, isUsed: true } }),
    ]);
    return { data: data.map((item) => this.applyListingImageUrls(item)), page, limit, total };
  }

  async usedFeed(page: number, limit: number) {
    const where: any = {
      isUsed: true,
      status: ListingStatus.ACTIVE,
      AND: [{ OR: [{ moderation: { is: null } }, { moderation: { status: ModerationStatus.ACTIVE } }] }],
    };

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { product: { include: { images: true, category: true } }, store: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data: data.map((item) => this.applyListingImageUrls(item)), page, limit, total };
  }

  async usedSearch(params: {
    q?: string;
    categoryId?: string;
    intent?: ListingIntent;
    minCondition?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      isUsed: true,
      status: ListingStatus.ACTIVE,
      AND: [{ OR: [{ moderation: { is: null } }, { moderation: { status: ModerationStatus.ACTIVE } }] }],
    };

    if (params.q) {
      where.AND.push({
        OR: [
          { titleOverride: { contains: params.q, mode: 'insensitive' } },
          { descriptionOverride: { contains: params.q, mode: 'insensitive' } },
          { product: { title: { contains: params.q, mode: 'insensitive' } } },
          { product: { description: { contains: params.q, mode: 'insensitive' } } },
          { exchangeWanted: { contains: params.q, mode: 'insensitive' } },
        ],
      });
    }

    if (params.categoryId) {
      where.product = { ...(where.product || {}), categoryId: params.categoryId };
    }

    if (params.intent) {
      where.intent = params.intent;
    }

    if (params.minCondition != null) {
      where.conditionScore = { gte: params.minCondition };
    }

    if (params.maxPrice != null) {
      where.OR = [
        { priceOverride: { lte: params.maxPrice } },
        { priceOverride: null, product: { price: { lte: params.maxPrice } } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'price_asc') {
      orderBy = { priceOverride: 'asc' };
    } else if (params.sort === 'price_desc') {
      orderBy = { priceOverride: 'desc' };
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { product: { include: { images: true, category: true } }, store: true },
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data: data.map((item) => this.applyListingImageUrls(item)), page: params.page, limit: params.limit, total };
  }

  async search(params: {
    q?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      status: ListingStatus.ACTIVE,
      AND: [{ OR: [{ moderation: { is: null } }, { moderation: { status: ModerationStatus.ACTIVE } }] }],
    };

    if (params.q) {
      where.AND.push({
        OR: [
          { titleOverride: { contains: params.q, mode: 'insensitive' } },
          { descriptionOverride: { contains: params.q, mode: 'insensitive' } },
          { product: { title: { contains: params.q, mode: 'insensitive' } } },
          { product: { description: { contains: params.q, mode: 'insensitive' } } },
        ],
      });
    }

    if (params.categoryId) {
      where.product = { ...(where.product || {}), categoryId: params.categoryId };
    }

    if (params.minPrice || params.maxPrice) {
      where.product = {
        ...(where.product || {}),
        price: {
          ...(params.minPrice ? { gte: params.minPrice } : {}),
          ...(params.maxPrice ? { lte: params.maxPrice } : {}),
        },
      };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'price_asc') {
      orderBy = { product: { price: 'asc' } };
    } else if (params.sort === 'price_desc') {
      orderBy = { product: { price: 'desc' } };
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: { product: { include: { images: true, category: true } }, store: true },
        orderBy,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return { data: data.map((item) => this.applyListingImageUrls(item)), page: params.page, limit: params.limit, total };
  }
}
