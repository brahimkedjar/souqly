import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { ListingsModule } from './modules/listings/listings.module';
import { FeedModule } from './modules/feed/feed.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FollowsModule } from './modules/follows/follows.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChatModule } from './modules/chat/chat.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { FilesModule } from './modules/files/files.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BlocksModule } from './modules/blocks/blocks.module';
import { CouriersModule } from './modules/couriers/couriers.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { uploadDir } from './common/utils/upload';
import { RolesGuard } from './common/guards/roles.guard';
import { StoreOwnerGuard } from './common/guards/store-owner.guard';
import { AdminGuard } from './common/guards/admin.guard';
import { BannedGuard } from './common/guards/banned.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/api/.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), uploadDir()),
      serveRoot: `/${uploadDir()}`,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    ListingsModule,
    FeedModule,
    FavoritesModule,
    FollowsModule,
    ReviewsModule,
    OrdersModule,
    ChatModule,
    UploadsModule,
    FilesModule,
    PromotionsModule,
    AdminModule,
    NotificationsModule,
    ReportsModule,
    BlocksModule,
    CouriersModule,
    DeliveriesModule,
  ],
  providers: [
    RolesGuard,
    StoreOwnerGuard,
    AdminGuard,
    BannedGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}

