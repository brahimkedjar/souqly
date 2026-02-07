import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, DeliveryRequestStatus } from '@prisma/client';
import { CurrentUser } from '../users/user.decorator';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateDeliveryRequestDto } from './dto/create-delivery-request.dto';
import { BannedGuard } from '../../common/guards/banned.guard';

@Controller()
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Post('stores/:storeId/orders/:orderId/delivery')
  async createDelivery(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveriesService.createDelivery({
      storeId,
      orderId,
      sellerId: user.id,
      pickupAddress: dto.pickupAddress,
      dropoffAddress: dto.dropoffAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      dropoffLat: dto.dropoffLat,
      dropoffLng: dto.dropoffLng,
      notes: dto.notes,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Post('deliveries/:deliveryId/requests')
  async createRequest(
    @CurrentUser() user: any,
    @Param('deliveryId') deliveryId: string,
    @Body() dto: CreateDeliveryRequestDto,
  ) {
    return this.deliveriesService.createRequest({
      deliveryId,
      sellerId: user.id,
      courierId: dto.courierId,
      message: dto.message,
      expiresInMinutes: dto.expiresInMinutes,
    });
  }

  @UseGuards(JwtAuthGuard, BannedGuard)
  @Get('deliveries/:deliveryId')
  async getDelivery(@CurrentUser() user: any, @Param('deliveryId') deliveryId: string) {
    return this.deliveriesService.getDelivery(deliveryId, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.COURIER)
  @Get('me/delivery-requests')
  async myRequests(@CurrentUser() user: any, @Query() query: any) {
    const status = query.status as DeliveryRequestStatus | undefined;
    return this.deliveriesService.getRequestsForCourier(user.id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.COURIER)
  @Post('delivery-requests/:id/accept')
  async accept(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.acceptRequest(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.COURIER)
  @Post('delivery-requests/:id/decline')
  async decline(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.declineRequest(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.COURIER)
  @Post('deliveries/:id/pickup')
  async pickup(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.pickup(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.COURIER)
  @Post('deliveries/:id/complete')
  async complete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.complete(id, user.id);
  }

  @UseGuards(JwtAuthGuard, BannedGuard)
  @Post('deliveries/:id/cancel')
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.deliveriesService.cancel(id, user.id);
  }

  @UseGuards(JwtAuthGuard, BannedGuard)
  @Get('orders/:orderId/tracking')
  async tracking(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.deliveriesService.trackingByOrder(orderId, user.id);
  }
}
