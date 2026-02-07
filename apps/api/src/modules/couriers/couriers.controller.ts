import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CouriersService } from './couriers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { CreateCourierProfileDto } from './dto/create-courier-profile.dto';
import { UpdateCourierProfileDto } from './dto/update-courier-profile.dto';
import { UpdateCourierStatusDto } from './dto/update-courier-status.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CourierStatus, Role, VehicleType } from '@prisma/client';
import { BannedGuard } from '../../common/guards/banned.guard';

@Controller()
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @UseGuards(JwtAuthGuard, BannedGuard)
  @Post('me/become-courier')
  async becomeCourier(@CurrentUser() user: any, @Body() dto: CreateCourierProfileDto) {
    return this.couriersService.createProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, BannedGuard, RolesGuard)
  @Roles(Role.COURIER)
  @Put('me/courier')
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateCourierProfileDto) {
    return this.couriersService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, BannedGuard, RolesGuard)
  @Roles(Role.COURIER)
  @Post('couriers/status')
  async updateStatus(@CurrentUser() user: any, @Body() dto: UpdateCourierStatusDto) {
    return this.couriersService.updateStatus(user.id, dto.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Get('couriers/nearby')
  async nearby(@Query() query: any) {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    const radiusKm = query.radiusKm ? Number(query.radiusKm) : 10;
    const vehicleType = query.vehicleType as VehicleType | undefined;
    const rawStatus = query.status as string | undefined;
    const status = rawStatus && rawStatus !== 'ALL' ? (rawStatus as CourierStatus) : undefined;
    const limit = query.limit ? Number(query.limit) : 30;
    const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
    const data = await this.couriersService.nearby({
      lat: hasCoords ? lat : undefined,
      lng: hasCoords ? lng : undefined,
      radiusKm,
      vehicleType,
      status,
      limit,
    });
    return data;
  }
}
