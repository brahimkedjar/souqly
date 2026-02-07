import { AuthService } from './auth.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const futureDate = () => new Date(Date.now() + 1000 * 60 * 60 * 24);

describe('AuthService', () => {
  it('registers a user and returns tokens', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-1', roles: [Role.BUYER] }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      },
    } as any;

    const jwtService = {
      signAsync: jest.fn().mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token'),
    } as any;

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES') return '30d';
        return undefined;
      }),
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    const result = await service.register('test@example.com', 'password123', 'Test User');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('refresh rotates token and old token fails', async () => {
    const oldRefresh = 'old-refresh-token';
    const tokenHash = await bcrypt.hash(oldRefresh, 10);
    let revokedAt: Date | null = null;

    const prisma = {
      refreshToken: {
        findUnique: jest.fn().mockImplementation(() => ({
          id: 'rt-1',
          userId: 'user-1',
          tokenHash,
          expiresAt: futureDate(),
          revokedAt,
        })),
        update: jest.fn().mockImplementation(() => {
          revokedAt = new Date();
          return { id: 'rt-1', revokedAt };
        }),
        create: jest.fn().mockResolvedValue({ id: 'rt-2' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', roles: [Role.BUYER] }),
      },
    } as any;

    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', jti: 'rt-1' }),
      signAsync: jest.fn().mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh'),
    } as any;

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        if (key === 'JWT_ACCESS_EXPIRES') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES') return '30d';
        return undefined;
      }),
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    const result = await service.refresh(oldRefresh);

    expect(result.accessToken).toBe('new-access');
    expect(prisma.refreshToken.update).toHaveBeenCalled();
    expect(prisma.refreshToken.create).toHaveBeenCalled();

    await expect(service.refresh(oldRefresh)).rejects.toThrow('Invalid refresh token');
  });

  it('logout revokes refresh token', async () => {
    const prisma = {
      refreshToken: {
        update: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      },
    } as any;

    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', jti: 'rt-1' }),
    } as any;

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
        return undefined;
      }),
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    await service.logout('refresh-token');

    expect(prisma.refreshToken.update).toHaveBeenCalled();
  });
});
