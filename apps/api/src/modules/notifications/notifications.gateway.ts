import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
      client.data.user = { id: payload.sub };

      await this.touchPresence(payload.sub, true);
      const count = await this.prisma.notification.count({ where: { userId: payload.sub, isRead: false } });
      client.emit('notif:unreadCount', { count });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      await this.touchPresence(userId, false);
    }
  }

  @SubscribeMessage('notif:subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() _payload: any) {
    const userId = client.data.user?.id;
    if (userId) {
      client.join(this.userRoom(userId));
      const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
      client.emit('notif:unreadCount', { count });
    }
    return { success: true };
  }

  emitNew(userId: string, notification: any) {
    this.server.to(this.userRoom(userId)).emit('notif:new', { notification });
  }

  emitUnreadCount(userId: string, count: number) {
    this.server.to(this.userRoom(userId)).emit('notif:unreadCount', { count });
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractToken(client: Socket) {
    const auth = client.handshake.auth?.token;
    if (auth) return auth;
    const header = client.handshake.headers?.authorization as string | undefined;
    if (!header) return null;
    const [, token] = header.split(' ');
    return token || null;
  }

  private async touchPresence(userId: string, online: boolean) {
    await this.prisma.userPresence.upsert({
      where: { userId },
      update: {
        lastSocketAt: online ? new Date() : undefined,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        lastSocketAt: online ? new Date() : undefined,
        lastSeenAt: new Date(),
      },
    });
  }
}
