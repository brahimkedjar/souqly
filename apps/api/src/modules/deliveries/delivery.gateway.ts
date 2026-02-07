import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryStatus } from '@prisma/client';

@WebSocketGateway({
  namespace: '/delivery',
  cors: { origin: '*' },
})
export class DeliveryGateway {
  @WebSocketServer()
  server: Server;

  private lastLocationAt = new Map<string, number>();
  private lastHistoryAt = new Map<string, number>();

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
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });
      if (user?.isBanned) {
        client.disconnect();
        return;
      }
      client.data.user = { id: payload.sub, roles: payload.roles };
      client.join(this.userRoom(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('delivery:join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { deliveryId: string }) {
    const userId = client.data.user?.id;
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: payload.deliveryId },
      include: { store: true },
    });
    if (!delivery || !userId) return { success: false };

    const allowed =
      delivery.buyerId === userId ||
      delivery.courierId === userId ||
      delivery.store.ownerId === userId;
    if (!allowed) return { success: false };

    client.join(this.deliveryRoom(payload.deliveryId));
    return { success: true };
  }

  @SubscribeMessage('courier:location')
  async handleLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      deliveryId: string;
      lat: number;
      lng: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      ts?: string;
    },
  ) {
    const userId = client.data.user?.id;
    if (!userId) return;

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: payload.deliveryId },
    });
    if (!delivery || delivery.courierId !== userId) return;
    const activeStatuses: DeliveryStatus[] = [
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
    ];
    if (!activeStatuses.includes(delivery.status)) {
      return;
    }

    const now = Date.now();
    const last = this.lastLocationAt.get(userId) || 0;
    if (now - last < 2000) {
      return;
    }
    this.lastLocationAt.set(userId, now);

    await this.prisma.courierProfile.update({
      where: { userId },
      data: { currentLat: payload.lat, currentLng: payload.lng, lastLocationAt: new Date() },
    });

    const historyLast = this.lastHistoryAt.get(payload.deliveryId) || 0;
    if (now - historyLast > 10000) {
      this.lastHistoryAt.set(payload.deliveryId, now);
      await this.prisma.deliveryLocation.create({
        data: {
          deliveryId: payload.deliveryId,
          courierId: userId,
          lat: payload.lat,
          lng: payload.lng,
          speed: payload.speed,
          heading: payload.heading,
          accuracy: payload.accuracy,
        },
      });
    }

    this.server.to(this.deliveryRoom(payload.deliveryId)).emit('courier:location', {
      deliveryId: payload.deliveryId,
      lat: payload.lat,
      lng: payload.lng,
      speed: payload.speed,
      heading: payload.heading,
      accuracy: payload.accuracy,
      ts: payload.ts ?? new Date().toISOString(),
    });
  }

  emitRequest(userId: string, payload: any) {
    this.server.to(this.userRoom(userId)).emit('delivery:request', payload);
  }

  emitAssigned(deliveryId: string, payload: any) {
    this.server.to(this.deliveryRoom(deliveryId)).emit('delivery:assigned', payload);
  }

  emitStatus(deliveryId: string, status: DeliveryStatus) {
    this.server.to(this.deliveryRoom(deliveryId)).emit('delivery:status', {
      deliveryId,
      status,
      at: new Date().toISOString(),
    });
  }

  private deliveryRoom(deliveryId: string) {
    return `delivery:${deliveryId}`;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
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
