import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { parsePagination } from '../../common/utils/pagination';

@Controller('products')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/reviews')
  async add(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.add(user.id, id, dto);
  }

  @Get(':id/reviews')
  async list(@Param('id') id: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.reviewsService.list(id, page, limit);
  }
}

