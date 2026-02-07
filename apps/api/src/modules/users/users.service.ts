import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        address: true,
        name: true,
        roles: true,
        avatarUrl: true,
        createdAt: true,
        courierProfile: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      avatarUrl?: string;
    },
  ) {
    const nameFromParts =
      data.firstName || data.lastName ? [data.firstName, data.lastName].filter(Boolean).join(' ') : undefined;
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? nameFromParts,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        address: true,
        name: true,
        roles: true,
        avatarUrl: true,
        courierProfile: true,
      },
    });
  }

  async becomeSeller(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const roles = new Set(user.roles);
    roles.add(Role.SELLER);
    roles.add(Role.BUYER);

    return this.prisma.user.update({
      where: { id: userId },
      data: { roles: Array.from(roles) },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        firstName: true,
        lastName: true,
        address: true,
        roles: true,
        avatarUrl: true,
        courierProfile: true,
      },
    });
  }
}
