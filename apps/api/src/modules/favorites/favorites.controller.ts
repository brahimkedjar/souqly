import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async add(@CurrentUser() user: any, @Body() dto: CreateFavoriteDto) {
    return this.favoritesService.add(user.id, dto.listingId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':listingId')
  async remove(@CurrentUser() user: any, @Param('listingId') listingId: string) {
    return this.favoritesService.remove(user.id, listingId);
  }
}

