import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { DeliveryGateway } from './delivery.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule.register({}), ConfigModule, NotificationsModule, ChatModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveryGateway],
  exports: [DeliveriesService, DeliveryGateway],
})
export class DeliveriesModule {}
