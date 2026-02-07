import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDraftDto } from './dto/create-product-draft.dto';
import { ProductStatus, ListingStatus } from '@prisma/client';
import { StorageService } from '../../common/storage/storage.service';
import { randomUUID } from 'crypto';
import sharp = require('sharp');

const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private applyImageUrls(images: any[]) {
    return images.map((img) => {
      const urlMain = img.keyMain ? this.storage.getPublicUrl(img.keyMain) : img.urlMain || img.url || null;
      const urlThumb = img.keyThumb ? this.storage.getPublicUrl(img.keyThumb) : img.urlThumb || img.url || null;
      return {
        ...img,
        urlMain,
        urlThumb,
        url: urlMain,
      };
    });
  }

  private applyProductImageUrls(product: any) {
    if (!product?.images) return product;
    return {
      ...product,
      images: this.applyImageUrls(product.images),
    };
  }

  async createDraft(storeId: string, ownerId: string, dto: CreateProductDraftDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    return this.prisma.product.create({
      data: {
        storeId,
        categoryId: dto.categoryId,
        status: ProductStatus.DRAFT,
        title: dto.title?.trim() || 'Draft product',
        description: dto.description,
        price: 0,
        currency: 'DZD',
        stockQty: 0,
      },
    });
  }

  async create(storeId: string, ownerId: string, dto: CreateProductDto) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    if (!dto.categoryId) {
      throw new BadRequestException({ message: 'Category is required', code: 'CATEGORY_REQUIRED' });
    }
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new BadRequestException({ message: 'Category not found', code: 'CATEGORY_NOT_FOUND' });
    }

    return this.prisma.product.create({
      data: {
        storeId,
        categoryId: dto.categoryId,
        status: ProductStatus.DRAFT,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency || 'DZD',
        stockQty: dto.stockQty,
        sku: dto.sku,
        attributes: dto.attributes,
      },
    });
  }

  async listByStore(storeId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { storeId },
        include: { images: true, category: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where: { storeId } }),
    ]);
    return { data: data.map((item) => this.applyProductImageUrls(item)), page, limit, total };
  }

  async getById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, store: true, category: true },
    });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    return this.applyProductImageUrls(product);
  }

  async update(id: string, ownerId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true, images: true },
    });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new BadRequestException({ message: 'Category not found', code: 'CATEGORY_NOT_FOUND' });
      }
    }

    const nextStatus = dto.status ?? product.status;
    const nextCategoryId = dto.categoryId ?? product.categoryId;
    const nextTitle = dto.title ?? product.title;
    const nextPrice = dto.price ?? product.price;
    const nextStockQty = dto.stockQty ?? product.stockQty;

    if (nextStatus === ProductStatus.ACTIVE) {
      if (!nextCategoryId) {
        throw new BadRequestException({ message: 'Category is required', code: 'CATEGORY_REQUIRED' });
      }
      if (!nextTitle || nextTitle.trim().length < 2) {
        throw new BadRequestException({ message: 'Title is required', code: 'TITLE_REQUIRED' });
      }
      if (nextPrice == null || Number.isNaN(Number(nextPrice))) {
        throw new BadRequestException({ message: 'Price is required', code: 'PRICE_REQUIRED' });
      }
      if (nextStockQty == null) {
        throw new BadRequestException({ message: 'Stock is required', code: 'STOCK_REQUIRED' });
      }
      if (product.images.length < 1) {
        throw new BadRequestException({ message: 'At least one image required', code: 'IMAGES_REQUIRED' });
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        status: dto.status,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency,
        stockQty: dto.stockQty,
        sku: dto.sku,
        attributes: dto.attributes,
      },
    });

    if (nextStatus === ProductStatus.ACTIVE) {
      const existingListing = await this.prisma.listing.findFirst({ where: { productId: id } });
      if (!existingListing) {
        await this.prisma.listing.create({
          data: {
            storeId: product.storeId,
            productId: id,
            status: ListingStatus.ACTIVE,
            tags: [],
          },
        });
      }
    }

    return updated;
  }

  async delete(id: string, ownerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true, images: true },
    });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    await this.prisma.listing.deleteMany({ where: { productId: id } });
    for (const image of product.images) {
      await this.storage.deleteObject(image.keyMain);
      await this.storage.deleteObject(image.keyThumb);
    }
    await this.prisma.productImage.deleteMany({ where: { productId: id } });
    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async addImages(productId: string, ownerId: string, files: Express.Multer.File[], baseUrl?: string) {
    if (!files.length) {
      throw new BadRequestException({ message: 'No images uploaded', code: 'IMAGES_REQUIRED' });
    }
    if (files.length > 3) {
      throw new BadRequestException({ message: 'Max 3 images', code: 'MAX_IMAGES_EXCEEDED' });
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true, images: true },
    });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const currentCount = product.images.length;
    if (currentCount + files.length > 3) {
      throw new BadRequestException({ message: 'Max 3 images', code: 'MAX_IMAGES_EXCEEDED' });
    }

    const created: Array<{
      productId: string;
      keyMain: string;
      keyThumb: string;
      urlMain: string;
      urlThumb: string;
      url: string;
      sortOrder: number;
    }> = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const baseId = randomUUID();
      const keyMain = `products/${productId}/${baseId}_main.webp`;
      const keyThumb = `products/${productId}/${baseId}_thumb.webp`;

      const mainBuffer = await sharp(file.buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const thumbBuffer = await sharp(file.buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();

      const main = await this.storage.putObject({
        key: keyMain,
        body: mainBuffer,
        contentType: 'image/webp',
        cacheControl: IMAGE_CACHE_CONTROL,
        baseUrl,
      });
      const thumb = await this.storage.putObject({
        key: keyThumb,
        body: thumbBuffer,
        contentType: 'image/webp',
        cacheControl: IMAGE_CACHE_CONTROL,
        baseUrl,
      });

      created.push({
        productId,
        keyMain: keyMain,
        keyThumb: keyThumb,
        urlMain: main.url,
        urlThumb: thumb.url,
        url: main.url,
        sortOrder: currentCount + index,
      });
    }

    await this.prisma.productImage.createMany({ data: created });
    return this.prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
  }

  async reorderImages(productId: string, ownerId: string, imageIds: string[]) {
    if (!imageIds.length) {
      throw new BadRequestException({ message: 'imageIds required', code: 'IMAGE_IDS_REQUIRED' });
    }
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }
    if (product.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const images = await this.prisma.productImage.findMany({
      where: { productId, id: { in: imageIds } },
    });
    if (images.length !== imageIds.length) {
      throw new BadRequestException({ message: 'Invalid image list', code: 'IMAGE_IDS_INVALID' });
    }

    const updates = imageIds.map((id, index) =>
      this.prisma.productImage.update({ where: { id }, data: { sortOrder: index } }),
    );
    await this.prisma.$transaction(updates);
    return this.prisma.productImage.findMany({ where: { productId }, orderBy: { sortOrder: 'asc' } });
  }

  async deleteImage(imageId: string, ownerId: string) {
    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
      include: { product: { include: { store: true } } },
    });
    if (!image) {
      throw new NotFoundException({ message: 'Image not found', code: 'IMAGE_NOT_FOUND' });
    }
    if (image.product.store.ownerId !== ownerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }
    await this.storage.deleteObject(image.keyMain);
    await this.storage.deleteObject(image.keyThumb);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { success: true };
  }
}
