import { BadRequestException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CourierStatus, DeliveryRequestStatus, DeliveryStatus, NotificationType } from '@prisma/client';

const createService = (overrides: any = {}) => {
  const prisma = {
    delivery: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    deliveryRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    courierProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
    },
    chatThread: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const notifications = { create: jest.fn() } as any;
  const chatService = { createThreadDirect: jest.fn() } as any;
  const gateway = { emitAssigned: jest.fn(), emitStatus: jest.fn(), emitRequest: jest.fn() } as any;

  Object.assign(prisma, overrides);

  return { service: new DeliveriesService(prisma, notifications, chatService, gateway), prisma, notifications, chatService, gateway };
};

describe('DeliveriesService', () => {
  it('accepts request and assigns courier', async () => {
    const { service, prisma, notifications, chatService, gateway } = createService();

    prisma.deliveryRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      courierId: 'courier-1',
      status: DeliveryRequestStatus.PENDING,
      expiresAt: new Date(Date.now() + 60000),
      deliveryId: 'del-1',
      delivery: {
        id: 'del-1',
        storeId: 'store-1',
        buyerId: 'buyer-1',
        orderId: 'order-1',
        store: { ownerId: 'seller-1' },
        order: { id: 'order-1' },
      },
    });

    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        deliveryRequest: {
          update: jest.fn().mockResolvedValue({ id: 'req-1' }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        delivery: {
          update: jest.fn().mockResolvedValue({ id: 'del-1', courierId: 'courier-1', status: DeliveryStatus.ASSIGNED }),
        },
        order: {
          update: jest.fn().mockResolvedValue({ id: 'order-1' }),
        },
        courierProfile: {
          update: jest.fn().mockResolvedValue({ userId: 'courier-1', status: CourierStatus.BUSY }),
        },
      };
      return fn(tx);
    });

    const result = await service.acceptRequest('req-1', 'courier-1');

    expect(result).toBeTruthy();
    expect(chatService.createThreadDirect).toHaveBeenCalledWith('buyer-1', 'courier-1', 'store-1');
    expect(notifications.create).toHaveBeenCalledWith(
      'buyer-1',
      NotificationType.SYSTEM,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ deliveryId: 'del-1', orderId: 'order-1' }),
    );
    expect(gateway.emitAssigned).toHaveBeenCalledWith('del-1', expect.objectContaining({ courierId: 'courier-1' }));
  });

  it('rejects createRequest if courier already assigned', async () => {
    const { service, prisma } = createService();
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'del-1',
      storeId: 'store-1',
      orderId: 'order-1',
      store: { ownerId: 'seller-1' },
      courierId: 'courier-2',
      status: DeliveryStatus.ASSIGNED,
    });

    await expect(
      service.createRequest({ deliveryId: 'del-1', sellerId: 'seller-1', courierId: 'courier-3' }),
    ).rejects.toThrow(BadRequestException);
  });
});
