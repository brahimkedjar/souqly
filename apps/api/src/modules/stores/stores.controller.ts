import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StoreOwnerGuard } from '../../common/guards/store-owner.guard';
import { CurrentUser } from '../users/user.decorator';
import { OrdersService } from '../orders/orders.service';
import { parsePagination } from '../../common/utils/pagination';
import { BannedGuard } from '../../common/guards/banned.guard';

@Controller()
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly ordersService: OrdersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Post('stores')
  async create(@CurrentUser() user: any, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.id, dto);
  }

  @Get('stores/:id')
  async getById(@Param('id') id: string) {
    return this.storesService.getById(id);
  }

  @UseGuards(JwtAuthGuard, StoreOwnerGuard)
  @Put('stores/:id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, user.id, dto, user.roles?.includes(Role.ADMIN));
  }

  @UseGuards(JwtAuthGuard, StoreOwnerGuard)
  @Delete('stores/:id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.storesService.delete(id, user.id, user.roles?.includes(Role.ADMIN));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/stores')
  async myStores(@CurrentUser() user: any) {
    return this.storesService.listByOwner(user.id);
  }

  @UseGuards(JwtAuthGuard, StoreOwnerGuard)
  @Get('stores/:id/analytics')
  async analytics(@Param('id') id: string) {
    return this.storesService.analytics(id);
  }

  @UseGuards(JwtAuthGuard, StoreOwnerGuard, BannedGuard)
  @Get('stores/:id/orders')
  async listOrders(@CurrentUser() user: any, @Param('id') id: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.ordersService.listForStore(id, user.id, page, limit);
  }
}
