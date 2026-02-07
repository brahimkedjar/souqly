import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../users/user.decorator';
import { CreateThreadDto } from './dto/create-thread.dto';
import { parsePagination } from '../../common/utils/pagination';
import { BannedGuard } from '../../common/guards/banned.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessageType } from '@prisma/client';

@Controller('chats')
@UseGuards(JwtAuthGuard, BannedGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async threads(@CurrentUser() user: any) {
    return this.chatService.getThreads(user.id);
  }

  @Post()
  async createThread(@CurrentUser() user: any, @Body() dto: CreateThreadDto) {
    return this.chatService.createThread(user.id, dto.storeId, dto.sellerId);
  }

  @Get(':threadId/messages')
  async messages(@CurrentUser() user: any, @Param('threadId') threadId: string, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.chatService.getMessages(threadId, user.id, page, limit, query.after);
  }

  @Post(':threadId/messages')
  async sendMessage(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Body() dto: SendMessageDto,
  ) {
    if (!dto.text && !dto.imageUrl) {
      throw new BadRequestException({ message: 'Message required', code: 'MESSAGE_REQUIRED' });
    }
    const type = dto.imageUrl ? ChatMessageType.IMAGE : ChatMessageType.TEXT;
    return this.chatService.createMessage({
      threadId,
      senderId: user.id,
      type,
      text: dto.text ?? null,
      imageUrl: dto.imageUrl ?? null,
    });
  }
}
