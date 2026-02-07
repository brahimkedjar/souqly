import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatMessageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });
      if (user?.isBanned) {
        client.emit('chat:error', { code: 'USER_BANNED', message: 'User banned' });
        client.disconnect();
        return;
      }
      client.data.user = { id: payload.sub, roles: payload.roles };
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { threadId: string }) {
    const user = client.data.user;
    await this.chatService.ensureParticipant(payload.threadId, user.id);
    await client.join(`thread:${payload.threadId}`);
    return { success: true };
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string; text?: string; image?: string; tempId?: string },
  ) {
    const user = client.data.user;
    const type = payload.image ? ChatMessageType.IMAGE : ChatMessageType.TEXT;
    try {
      const message = await this.chatService.createMessage({
        threadId: payload.threadId,
        senderId: user.id,
        type,
        text: payload.text || null,
        imageUrl: payload.image || null,
      });

      client.emit('chat:ack', { tempId: payload.tempId, message });
      this.server.to(`thread:${payload.threadId}`).except(client.id).emit('chat:message', message);
      return message;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        client.emit('chat:error', { code: 'CHAT_RATE_LIMIT', message: 'Rate limit' });
        return;
      }
      if (error instanceof ForbiddenException) {
        client.emit('chat:error', { code: 'USER_BLOCKED', message: 'User blocked' });
        return;
      }
      throw error;
    }
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { threadId: string; messageId?: string; lastReadAt?: string },
  ) {
    const user = client.data.user;
    const updated = await this.chatService.markRead({
      threadId: payload.threadId,
      userId: user.id,
      messageId: payload.messageId,
      lastReadAt: payload.lastReadAt,
    });
    this.server.to(`thread:${payload.threadId}`).emit('chat:read', updated);
    return updated;
  }

  private extractToken(client: Socket) {
    const auth = client.handshake.auth?.token;
    if (auth) {
      return auth;
    }
    const header = client.handshake.headers?.authorization as string | undefined;
    if (!header) {
      return null;
    }
    const [, token] = header.split(' ');
    return token || null;
  }
}
