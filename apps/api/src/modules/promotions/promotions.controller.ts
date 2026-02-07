import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../users/user.decorator';

@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Post('stores/:storeId/promotions')
  async create(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreatePromotionDto,
  ) {
    return this.promotionsService.create(storeId, user.id, dto);
  }

  @Get('stores/:storeId/promotions')
  async list(@Param('storeId') storeId: string) {
    return this.promotionsService.listByStore(storeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Delete('promotions/:id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.promotionsService.remove(id, user.id);
  }
}

