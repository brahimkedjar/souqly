import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FeedService } from '../feed/feed.service';
import { FeedAction, ListingStatus, NotificationType, OrderStatus, Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedService: FeedService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException({ message: 'No items', code: 'ORDER_EMPTY' });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, address: true },
    });
    const address = dto.address?.trim() || user?.address?.trim();
    const phone = dto.phone?.trim() || user?.phone?.trim();
    if (!address) {
      throw new BadRequestException({ message: 'Address required', code: 'ADDRESS_REQUIRED' });
    }
    if (!phone) {
      throw new BadRequestException({ message: 'Phone required', code: 'PHONE_REQUIRED' });
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      throw new NotFoundException({ message: 'Product not found', code: 'PRODUCT_NOT_FOUND' });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product || product.stockQty < item.qty) {
        throw new BadRequestException({ message: 'Insufficient stock', code: 'OUT_OF_STOCK' });
      }
    }

    const totalAmount = dto.items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return sum;
      }
      return sum + Number(product.price) * item.qty;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          totalAmount,
          currency: products[0].currency,
          address,
          phone,
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              unitPrice: productMap.get(item.productId)!.price,
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.qty } },
        });
      }

      return created;
    });

    const listings = await this.prisma.listing.findMany({
      where: { productId: { in: productIds }, status: ListingStatus.ACTIVE },
    });

    for (const listing of listings) {
      await this.feedService.recordEvent(userId, listing.id, FeedAction.BUY);
    }

    return order;
  }

  async list(userId: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: { items: { include: { product: { include: { images: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { data, page, limit, total };
  }

  async listForStore(storeId: string, ownerId: string, page: number, limit: number) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    }
    if (store.ownerId !== ownerId) {
      throw new BadRequestException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const where = {
      items: {
        some: {
          product: { storeId },
        },
      },
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { product: { include: { images: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, page, limit, total };
  }

  async getById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: { include: { images: true } } } } },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException({ message: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }
    return order;
  }

  async updateStatus(params: { orderId: string; status: OrderStatus; userId: string; roles: Role[] }) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: { items: { include: { product: { include: { store: true } } } } },
    });
    if (!order) {
      throw new NotFoundException({ message: 'Order not found', code: 'ORDER_NOT_FOUND' });
    }

    const isAdmin = params.roles.includes(Role.ADMIN);
    if (!isAdmin) {
      const owns = order.items.some((item) => item.product.store.ownerId === params.userId);
      if (!owns) {
        throw new BadRequestException({ message: 'Not allowed', code: 'ORDER_FORBIDDEN' });
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: params.orderId },
      data: { status: params.status },
    });

    await this.notificationsService.create(
      order.userId,
      NotificationType.ORDER_STATUS,
      'Order update',
      `Your order is now ${params.status}`,
      { orderId: order.id, status: params.status },
    );

    return updated;
  }
}