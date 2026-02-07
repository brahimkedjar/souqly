import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string, name: string, meta?: TokenMeta) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException({ message: 'Email already in use', code: 'EMAIL_EXISTS' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        roles: [Role.BUYER],
      },
    });

    return this.issueTokens(user.id, user.roles, meta);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    return user;
  }

  async login(email: string, password: string, meta?: TokenMeta) {
    const user = await this.validateUser(email, password);
    return this.issueTokens(user.id, user.roles, meta);
  }

  async refresh(refreshToken: string, meta?: TokenMeta) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const tokenId = payload.jti as string | undefined;
      if (!tokenId) {
        throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
      }

      const tokenRecord = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });
      if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.userId !== payload.sub) {
        throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
      }

      if (tokenRecord.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException({ message: 'Refresh token expired', code: 'REFRESH_EXPIRED' });
      }

      const valid = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);
      if (!valid) {
        throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
      }

      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: new Date() },
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
      }

      return this.issueTokens(user.id, user.roles, meta);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const tokenId = payload.jti as string | undefined;
      if (!tokenId) {
        return { success: true };
      }

      await this.prisma.refreshToken.update({
        where: { id: tokenId },
        data: { revokedAt: new Date() },
      });
    } catch (_) {
      // ignore invalid token
    }
    return { success: true };
  }

  private async issueTokens(userId: string, roles: Role[], meta?: TokenMeta) {
    const accessExpiresRaw = this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';
    const accessExpiresSec = Math.floor(
      this.parseDurationToMs(accessExpiresRaw, 15 * 60 * 1000) / 1000,
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, roles },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresSec,
      },
    );

    const refreshTokenId = randomUUID();
    const refreshExpiresRaw = this.configService.get<string>('JWT_REFRESH_EXPIRES') || '30d';
    const refreshExpiresMs = this.parseDurationToMs(
      refreshExpiresRaw,
      30 * 24 * 60 * 60 * 1000,
    );
    const refreshExpiresSec = Math.floor(refreshExpiresMs / 1000);

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, roles, jti: refreshTokenId },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresSec,
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + refreshExpiresMs);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId,
        tokenHash: refreshTokenHash,
        expiresAt,
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return { accessToken, refreshToken };
  }

  private parseDurationToMs(value: string, fallbackMs: number) {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) {
      return fallbackMs;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return amount * (multipliers[unit] || 1000);
  }
}

