import { DeliveryGateway } from './delivery.gateway';
import { DeliveryStatus } from '@prisma/client';

const createMockSocket = (userId: string) => {
  return {
    data: { user: { id: userId } },
    join: jest.fn(),
    emit: jest.fn(),
    handshake: { auth: {}, headers: {} },
  } as any;
};

describe('DeliveryGateway', () => {
  it('rejects join for unauthorized user', async () => {
    const prisma = {
      delivery: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'del-1',
          buyerId: 'buyer-1',
          courierId: 'courier-1',
          store: { ownerId: 'seller-1' },
        }),
      },
      user: { findUnique: jest.fn() },
    } as any;

    const gateway = new DeliveryGateway({} as any, { get: jest.fn() } as any, prisma);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as any;

    const client = createMockSocket('user-x');
    const result = await gateway.handleJoin(client, { deliveryId: 'del-1' });

    expect(result).toEqual({ success: false });
    expect(client.join).not.toHaveBeenCalled();
  });

  it('throttles location updates', async () => {
    const prisma = {
      delivery: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'del-1',
          courierId: 'courier-1',
          status: DeliveryStatus.ASSIGNED,
        }),
      },
      courierProfile: {
        update: jest.fn().mockResolvedValue({ userId: 'courier-1' }),
      },
      deliveryLocation: {
        create: jest.fn().mockResolvedValue({ id: 'loc-1' }),
      },
      user: { findUnique: jest.fn() },
    } as any;

    const gateway = new DeliveryGateway({} as any, { get: jest.fn() } as any, prisma);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as any;

    const client = createMockSocket('courier-1');
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    await gateway.handleLocation(client, { deliveryId: 'del-1', lat: 1, lng: 1 });
    await gateway.handleLocation(client, { deliveryId: 'del-1', lat: 1, lng: 1 });

    expect(prisma.courierProfile.update).toHaveBeenCalledTimes(1);
    (Date.now as jest.Mock).mockRestore();
  });
});
