import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CourierStatus, Role, VehicleType } from '@prisma/client';

@Injectable()
export class CouriersService {
  constructor(private readonly prisma: PrismaService) {}

  private postgisChecked = false;
  private postgisAvailable = false;

  async createProfile(userId: string, dto: { vehicleType: VehicleType; phone: string; displayName: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const roles = new Set(user.roles);
    roles.add(Role.COURIER);
    roles.add(Role.BUYER);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: Array.from(roles),
        phone: dto.phone || user.phone,
      },
    });

    return this.prisma.courierProfile.upsert({
      where: { userId },
      update: {
        vehicleType: dto.vehicleType,
        phone: dto.phone,
        displayName: dto.displayName,
      },
      create: {
        userId,
        vehicleType: dto.vehicleType,
        phone: dto.phone,
        displayName: dto.displayName,
      },
    });
  }

  async updateProfile(userId: string, dto: { vehicleType?: VehicleType; phone?: string; displayName?: string; status?: CourierStatus }) {
    const profile = await this.prisma.courierProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ message: 'Courier profile not found', code: 'COURIER_NOT_FOUND' });
    }
    if (dto.phone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone: dto.phone },
      });
    }
    return this.prisma.courierProfile.update({
      where: { userId },
      data: {
        vehicleType: dto.vehicleType ?? profile.vehicleType,
        phone: dto.phone ?? profile.phone,
        displayName: dto.displayName ?? profile.displayName,
        status: dto.status ?? profile.status,
      },
    });
  }

  async updateStatus(userId: string, status: CourierStatus) {
    const profile = await this.prisma.courierProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({ message: 'Courier profile not found', code: 'COURIER_NOT_FOUND' });
    }
    return this.prisma.courierProfile.update({
      where: { userId },
      data: { status },
    });
  }

  async setLocation(userId: string, lat: number, lng: number) {
    await this.prisma.courierProfile.update({
      where: { userId },
      data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
    });
  }

  async nearby(params: {
    lat?: number;
    lng?: number;
    radiusKm: number;
    vehicleType?: VehicleType;
    status?: CourierStatus;
    limit?: number;
  }) {
    const radius = params.radiusKm || 10;
    const status = params.status;
    const limit = Math.min(params.limit || 30, 100);
    const hasCoords = typeof params.lat === 'number' && typeof params.lng === 'number';

    if (!hasCoords) {
      const profiles = await this.prisma.courierProfile.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(params.vehicleType ? { vehicleType: params.vehicleType } : {}),
          user: { isBanned: false },
        },
        orderBy: [{ lastLocationAt: 'desc' }, { ratingAvg: 'desc' }],
        take: limit,
      });
      return profiles.map((profile) => ({
        courierId: profile.userId,
        displayName: profile.displayName,
        vehicleType: profile.vehicleType,
        status: profile.status,
        ratingAvg: profile.ratingAvg,
        lastLocationAt: profile.lastLocationAt,
        distanceKm: null,
      }));
    }

    await this.ensurePostgis();

    if (this.postgisAvailable) {
      const conditions: string[] = [
        'cp."currentLat" IS NOT NULL',
        'cp."currentLng" IS NOT NULL',
        'u."isBanned" = false',
      ];
      const paramsList: any[] = [];
      let idx = 1;
      if (status) {
        paramsList.push(status);
        conditions.push(`cp."status" = $${idx++}`);
      }
      const latIdx = idx;
      paramsList.push(params.lat);
      idx++;
      const lngIdx = idx;
      paramsList.push(params.lng);
      idx++;
      if (params.vehicleType) {
        paramsList.push(params.vehicleType);
        conditions.push(`cp."vehicleType" = $${idx++}`);
      }
      const radiusIdx = idx;
      paramsList.push(radius * 1000);
      idx++;
      const limitIdx = idx;
      paramsList.push(limit);

      const distanceExpr = `ST_DistanceSphere(ST_MakePoint(cp."currentLng", cp."currentLat"), ST_MakePoint($${lngIdx}, $${latIdx}))`;

      const rows: any[] = await this.prisma.$queryRawUnsafe(
        `
        SELECT
          cp."userId" as "courierId",
          cp."displayName",
          cp."vehicleType",
          cp."status",
          cp."ratingAvg",
          cp."lastLocationAt",
          (${distanceExpr} / 1000.0) as "distanceKm"
        FROM "CourierProfile" cp
        JOIN "User" u ON u."id" = cp."userId"
        WHERE ${conditions.join(' AND ')}
          AND ${distanceExpr} <= $${radiusIdx}
        ORDER BY "distanceKm" ASC
        LIMIT $${limitIdx}
        `,
        ...paramsList,
      );
      return rows;
    }

    const profiles = await this.prisma.courierProfile.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(params.vehicleType ? { vehicleType: params.vehicleType } : {}),
        currentLat: { not: null },
        currentLng: { not: null },
        user: { isBanned: false },
      },
      include: { user: { select: { id: true, isBanned: true } } },
    });

    const baseLat = params.lat!;
    const baseLng = params.lng!;
    const withDistance = profiles
      .map((profile) => {
        const distanceKm = this.haversineKm(baseLat, baseLng, profile.currentLat!, profile.currentLng!);
        return {
          courierId: profile.userId,
          displayName: profile.displayName,
          vehicleType: profile.vehicleType,
          status: profile.status,
          ratingAvg: profile.ratingAvg,
          lastLocationAt: profile.lastLocationAt,
          distanceKm,
        };
      })
      .filter((row) => row.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return withDistance;
  }

  private async ensurePostgis() {
    if (this.postgisChecked) return;
    this.postgisChecked = true;
    try {
      const result: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT 1 FROM pg_extension WHERE extname = 'postgis' LIMIT 1`,
      );
      this.postgisAvailable = result.length > 0;
    } catch {
      this.postgisAvailable = false;
    }
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }
}
