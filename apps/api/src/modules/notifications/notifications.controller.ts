import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    return this.notificationsService.list(user.id, limit, query.cursor);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.unreadCount(user.id);
    return { count };
  }

  @Get('since')
  async since(@CurrentUser() user: any, @Query() query: any) {
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    if (!query.after) {
      throw new BadRequestException({ message: 'after is required', code: 'AFTER_REQUIRED' });
    }
    const parsed = new Date(query.after);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({ message: 'after is invalid', code: 'AFTER_INVALID' });
    }
    return this.notificationsService.since(user.id, query.after, limit);
  }

  @Post(':id/read')
  async markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post('read-all')
  async markAll(@CurrentUser() user: any) {
    return this.notificationsService.markAllRead(user.id);
  }
}
