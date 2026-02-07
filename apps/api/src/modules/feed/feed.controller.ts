import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedEventDto } from './dto/feed-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../users/user.decorator';
import { parsePagination } from '../../common/utils/pagination';

@Controller()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('feed')
  async feed(@CurrentUser() user: any, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.feedService.getFeed(user?.id || null, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Post('feed/events')
  async track(@CurrentUser() user: any, @Body() dto: FeedEventDto) {
    return this.feedService.recordEvent(user.id, dto.listingId, dto.action);
  }
}

