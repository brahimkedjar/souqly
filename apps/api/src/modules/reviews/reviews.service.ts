import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    return this.prisma.review.upsert({
      where: { userId_productId: { userId, productId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: { userId, productId, rating: dto.rating, comment: dto.comment },
    });
  }

  async list(productId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return { data, page, limit, total };
  }
}

