import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { parsePagination } from '../../common/utils/pagination';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { BannedGuard } from '../../common/guards/banned.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, BannedGuard)
  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.ordersService.list(user.id, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getById(user.id, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus({
      orderId: id,
      status: dto.status,
      userId: user.id,
      roles: user.roles,
    });
  }
}
