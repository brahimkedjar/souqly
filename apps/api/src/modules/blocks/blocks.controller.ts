import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateBlockDto) {
    return this.blocksService.create(user.id, dto.blockedUserId);
  }

  @Delete(':blockedUserId')
  async remove(@CurrentUser() user: any, @Param('blockedUserId') blockedUserId: string) {
    return this.blocksService.remove(user.id, blockedUserId);
  }
}
