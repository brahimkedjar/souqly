import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';

@Controller('stores')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.followsService.follow(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  async unfollow(@CurrentUser() user: any, @Param('id') id: string) {
    return this.followsService.unfollow(user.id, id);
  }
}

