import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CourierStatus,
  DeliveryRequestStatus,
  DeliveryStatus,
  NotificationType,
  OrderStatus,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { DeliveryGateway } from './delivery.gateway';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatService: ChatService,
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  async createDelivery(params: {
    storeId: string;
    orderId: string;
    sellerId: string;
    pickupAddress?: any;
    dropoffAddress?: any;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
    notes?: string;
  }) {
    const store = await this.prisma.store.findUnique({ where: { id: params.storeId } });
    if (!store) throw new NotFoundException({ message: 'Store not found', code: 'STORE_NOT_FOUND' });
    if (store.ownerId !== params.sellerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException({ message: 'Order not found', code: 'ORDER_NOT_FOUND' });

    const allFromStore = order.items.every((item) => item.product.storeId === params.storeId);
    if (!allFromStore) {
      throw new BadRequestException({ message: 'Order not for this store', code: 'ORDER_STORE_MISMATCH' });
    }

    const existing = await this.prisma.delivery.findUnique({ where: { orderId: order.id } });
    if (existing) {
      throw new BadRequestException({ message: 'Delivery already exists', code: 'DELIVERY_EXISTS' });
    }

    const delivery = await this.prisma.delivery.create({
      data: {
        orderId: order.id,
        storeId: params.storeId,
        buyerId: order.userId,
        pickupAddress: params.pickupAddress,
        dropoffAddress: params.dropoffAddress,
        pickupLat: params.pickupLat,
        pickupLng: params.pickupLng,
        dropoffLat: params.dropoffLat,
        dropoffLng: params.dropoffLng,
        notes: params.notes,
      },
    });

    return delivery;
  }

  async createRequest(params: {
    deliveryId: string;
    sellerId: string;
    courierId: string;
    message?: string;
    expiresInMinutes?: number;
  }) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: params.deliveryId },
      include: { store: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });
    if (delivery.store.ownerId !== params.sellerId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'STORE_FORBIDDEN' });
    }

    if (delivery.courierId) {
      throw new BadRequestException({ message: 'Courier already assigned', code: 'COURIER_ALREADY_ASSIGNED' });
    }

    if (delivery.status === DeliveryStatus.DELIVERED || delivery.status === DeliveryStatus.CANCELLED) {
      throw new BadRequestException({ message: 'Delivery closed', code: 'DELIVERY_CLOSED' });
    }

    const courierProfile = await this.prisma.courierProfile.findUnique({
      where: { userId: params.courierId },
    });
    if (!courierProfile) {
      throw new NotFoundException({ message: 'Courier not found', code: 'COURIER_NOT_FOUND' });
    }
    if (courierProfile.status !== CourierStatus.AVAILABLE) {
      throw new BadRequestException({ message: 'Courier not available', code: 'COURIER_NOT_AVAILABLE' });
    }

    const pending = await this.prisma.deliveryRequest.findFirst({
      where: { deliveryId: params.deliveryId, courierId: params.courierId, status: DeliveryRequestStatus.PENDING },
    });
    if (pending) {
      throw new BadRequestException({ message: 'Request already sent', code: 'REQUEST_EXISTS' });
    }

    const expiresAt = new Date(Date.now() + (params.expiresInMinutes ?? 15) * 60 * 1000);

    const request = await this.prisma.deliveryRequest.create({
      data: {
        deliveryId: params.deliveryId,
        storeId: delivery.storeId,
        courierId: params.courierId,
        message: params.message,
        expiresAt,
      },
    });

    await this.chatService.createThreadDirect(params.sellerId, params.courierId, delivery.storeId);

    await this.notificationsService.create(
      params.courierId,
      NotificationType.SYSTEM,
      'Nouvelle demande',
      'Vous avez une nouvelle demande de livraison',
      { deliveryId: params.deliveryId, requestId: request.id, storeId: delivery.storeId, orderId: delivery.orderId },
    );

    this.deliveryGateway.emitRequest(params.courierId, {
      deliveryId: params.deliveryId,
      requestId: request.id,
      storeId: delivery.storeId,
      message: params.message,
      expiresAt,
    });

    return request;
  }

  async getDelivery(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { store: true, courier: true, order: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });

    const allowed =
      delivery.buyerId === userId ||
      delivery.courierId === userId ||
      delivery.store.ownerId === userId;
    if (!allowed) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'DELIVERY_FORBIDDEN' });
    }
    return delivery;
  }

  async getRequestsForCourier(userId: string, status?: DeliveryRequestStatus) {
    return this.prisma.deliveryRequest.findMany({
      where: {
        courierId: userId,
        ...(status ? { status } : {}),
      },
      include: {
        delivery: { include: { store: true, order: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRequest(requestId: string, courierId: string) {
    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: requestId },
      include: { delivery: { include: { store: true, order: true } } },
    });
    if (!request) throw new NotFoundException({ message: 'Request not found', code: 'REQUEST_NOT_FOUND' });
    if (request.courierId !== courierId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'REQUEST_FORBIDDEN' });
    }
    if (request.status !== DeliveryRequestStatus.PENDING) {
      throw new BadRequestException({ message: 'Request not pending', code: 'REQUEST_NOT_PENDING' });
    }
    if (request.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({ message: 'Request expired', code: 'REQUEST_EXPIRED' });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const accepted = await tx.deliveryRequest.update({
        where: { id: requestId },
        data: { status: DeliveryRequestStatus.ACCEPTED, respondedAt: new Date() },
      });

      await tx.deliveryRequest.updateMany({
        where: {
          deliveryId: request.deliveryId,
          status: DeliveryRequestStatus.PENDING,
          id: { not: requestId },
        },
        data: { status: DeliveryRequestStatus.CANCELLED, respondedAt: new Date() },
      });

      const delivery = await tx.delivery.update({
        where: { id: request.deliveryId },
        data: {
          courierId,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: request.delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.ASSIGNED },
      });

      await tx.courierProfile.update({
        where: { userId: courierId },
        data: { status: CourierStatus.BUSY },
      });

      return { accepted, delivery };
    });

    await this.chatService.createThreadDirect(request.delivery.buyerId, courierId, request.delivery.storeId);

    await this.notificationsService.create(
      request.delivery.buyerId,
      NotificationType.SYSTEM,
      'Livreur assigne',
      'Votre livraison a un livreur',
      { deliveryId: request.deliveryId, courierId, orderId: request.delivery.orderId },
    );
    await this.notificationsService.create(
      request.delivery.store.ownerId,
      NotificationType.SYSTEM,
      'Livreur accepte',
      'Un livreur a accepte la livraison',
      { deliveryId: request.deliveryId, courierId, orderId: request.delivery.orderId },
    );

    this.deliveryGateway.emitAssigned(request.deliveryId, {
      courierId,
      deliveryId: request.deliveryId,
    });

    return result;
  }

  async declineRequest(requestId: string, courierId: string) {
    const request = await this.prisma.deliveryRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException({ message: 'Request not found', code: 'REQUEST_NOT_FOUND' });
    if (request.courierId !== courierId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'REQUEST_FORBIDDEN' });
    }

    return this.prisma.deliveryRequest.update({
      where: { id: requestId },
      data: { status: DeliveryRequestStatus.DECLINED, respondedAt: new Date() },
    });
  }

  async pickup(deliveryId: string, courierId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });
    if (delivery.courierId !== courierId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'DELIVERY_FORBIDDEN' });
    }

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() },
    });
    await this.prisma.order.update({
      where: { id: delivery.orderId },
      data: { deliveryStatus: DeliveryStatus.PICKED_UP, status: OrderStatus.SHIPPED },
    });

    this.deliveryGateway.emitStatus(deliveryId, DeliveryStatus.PICKED_UP);
    return updated;
  }

  async complete(deliveryId: string, courierId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { store: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });
    if (delivery.courierId !== courierId) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'DELIVERY_FORBIDDEN' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
      });
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.DELIVERED, deliveryStatus: DeliveryStatus.DELIVERED },
      });
      await tx.courierProfile.update({
        where: { userId: courierId },
        data: { status: CourierStatus.AVAILABLE },
      });
      return d;
    });

    await this.notificationsService.create(
      delivery.buyerId,
      NotificationType.SYSTEM,
      'Livraison terminee',
      'Votre commande est livree',
      { deliveryId, orderId: delivery.orderId },
    );
    await this.notificationsService.create(
      delivery.store.ownerId,
      NotificationType.SYSTEM,
      'Livraison terminee',
      'Commande livree',
      { deliveryId, orderId: delivery.orderId },
    );

    this.deliveryGateway.emitStatus(deliveryId, DeliveryStatus.DELIVERED);
    return updated;
  }

  async cancel(deliveryId: string, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { store: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });

    const allowed = delivery.courierId === userId || delivery.store.ownerId === userId;
    if (!allowed) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'DELIVERY_FORBIDDEN' });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.CANCELLED },
      });
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { deliveryStatus: DeliveryStatus.CANCELLED },
      });
      if (delivery.courierId) {
        await tx.courierProfile.update({
          where: { userId: delivery.courierId },
          data: { status: CourierStatus.AVAILABLE },
        });
      }
      return d;
    });

    this.deliveryGateway.emitStatus(deliveryId, DeliveryStatus.CANCELLED);
    return updated;
  }

  async trackingByOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { include: { store: true } } } },
      },
    });
    if (!order) throw new NotFoundException({ message: 'Order not found', code: 'ORDER_NOT_FOUND' });

    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: { courier: { include: { courierProfile: true } }, store: true },
    });
    if (!delivery) throw new NotFoundException({ message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' });

    const storeOwnerId = delivery.store.ownerId;
    const allowed = delivery.buyerId === userId || delivery.courierId === userId || storeOwnerId === userId;
    if (!allowed) {
      throw new ForbiddenException({ message: 'Not allowed', code: 'DELIVERY_FORBIDDEN' });
    }

    let threadId: string | null = null;
    if (delivery.courierId) {
      const thread = await this.prisma.chatThread.findUnique({
        where: {
          buyerId_sellerId_storeId: {
            buyerId: delivery.buyerId,
            sellerId: delivery.courierId,
            storeId: delivery.storeId,
          },
        },
      });
      threadId = thread?.id ?? null;
    }

    return {
      delivery,
      threadId,
      courier: delivery.courier
        ? {
            id: delivery.courier.id,
            displayName: delivery.courier.courierProfile?.displayName,
            vehicleType: delivery.courier.courierProfile?.vehicleType,
            ratingAvg: delivery.courier.courierProfile?.ratingAvg,
            phone: delivery.courier.courierProfile?.phone,
            currentLat: delivery.courier.courierProfile?.currentLat,
            currentLng: delivery.courier.courierProfile?.currentLng,
            lastLocationAt: delivery.courier.courierProfile?.lastLocationAt,
          }
        : null,
    };
  }
}
