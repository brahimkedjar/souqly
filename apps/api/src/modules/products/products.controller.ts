import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDraftDto } from './dto/create-product-draft.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { CurrentUser } from '../users/user.decorator';
import { parsePagination } from '../../common/utils/pagination';
import { imageFileFilter, MAX_IMAGE_SIZE } from '../../common/utils/upload';
import { getBaseUrl } from '../../common/utils/url';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Post('products/draft')
  async createDraft(@CurrentUser() user: any, @Body() dto: CreateProductDraftDto) {
    return this.productsService.createDraft(dto.storeId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Post('stores/:storeId/products')
  async create(
    @CurrentUser() user: any,
    @Param('storeId') storeId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(storeId, user.id, dto);
  }

  @Get('stores/:storeId/products')
  async listByStore(@Param('storeId') storeId: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.productsService.listByStore(storeId, page, limit);
  }

  @Get('products/:id')
  async getById(@Param('id') id: string) {
    return this.productsService.getById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Put('products/:id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Delete('products/:id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.delete(id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Post('products/:id/images')
  @UseInterceptors(
    FilesInterceptor('images', 3, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE, files: 3 },
    }),
  )
  async uploadImages(
    @Req() req: any,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const baseUrl = getBaseUrl(req);
    return this.productsService.addImages(id, user.id, files || [], baseUrl);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Put('products/:id/images/reorder')
  async reorderImages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('imageIds') imageIds: string[],
  ) {
    return this.productsService.reorderImages(id, user.id, imageIds || []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @Delete('product-images/:id')
  async deleteImage(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.deleteImage(id, user.id);
  }
}
