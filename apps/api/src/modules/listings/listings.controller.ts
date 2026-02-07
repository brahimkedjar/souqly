import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateUsedListingDto } from './dto/create-used-listing.dto';
import { UpdateUsedListingDto } from './dto/update-used-listing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BannedGuard } from '../../common/guards/banned.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../users/user.decorator';
import { parsePagination } from '../../common/utils/pagination';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';

@Controller()
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Post('stores/:storeId/listings')
  async create(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(storeId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Post('stores/:storeId/used-listings')
  async createUsed(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreateUsedListingDto,
  ) {
    return this.listingsService.createUsedListing(storeId, user.id, dto);
  }

  @Get('listings/:id')
  async getById(@Param('id') id: string) {
    return this.listingsService.getById(id);
  }

  @Get('used-listings/:id')
  async getUsedById(@Param('id') id: string) {
    return this.listingsService.getUsedById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Put('listings/:id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Put('used-listings/:id')
  async updateUsed(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUsedListingDto) {
    return this.listingsService.updateUsedListing(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Delete('listings/:id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.listingsService.delete(id, user.id);
  }

  @Get('stores/:storeId/listings')
  async listByStore(@Param('storeId') storeId: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.listingsService.listByStore(storeId, page, limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, BannedGuard)
  @Roles(Role.SELLER)
  @Get('stores/:storeId/used-listings')
  async listUsedByStore(@Param('storeId') storeId: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.listingsService.listUsedByStore(storeId, page, limit);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('used-feed')
  async usedFeed(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.listingsService.usedFeed(page, limit);
  }

  @Get('used-search')
  async usedSearch(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.listingsService.usedSearch({
      q: query.q,
      categoryId: query.categoryId,
      intent: query.intent,
      minCondition: query.minCondition ? Number(query.minCondition) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      sort: query.sort,
      page,
      limit,
    });
  }

  @Get('search')
  async search(@Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.listingsService.search({
      q: query.q,
      categoryId: query.categoryId,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      sort: query.sort,
      page,
      limit,
    });
  }
}

