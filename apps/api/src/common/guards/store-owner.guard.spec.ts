import { StoreOwnerGuard } from './store-owner.guard';
import { Role } from '@prisma/client';

describe('StoreOwnerGuard', () => {
  it('allows owner', async () => {
    const prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 'user-1' }),
      },
    } as any;

    const guard = new StoreOwnerGuard(prisma);
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', roles: [Role.SELLER] },
          params: { storeId: 'store-1' },
        }),
      }),
    };

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('blocks non-owner', async () => {
    const prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue({ ownerId: 'user-2' }),
      },
    } as any;

    const guard = new StoreOwnerGuard(prisma);
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', roles: [Role.SELLER] },
          params: { storeId: 'store-1' },
        }),
      }),
    };

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});

