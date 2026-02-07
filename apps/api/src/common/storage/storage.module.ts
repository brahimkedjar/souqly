import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_ADAPTER } from './storage.constants';
import { StorageService } from './storage.service';
import { LocalDiskAdapter } from './local-disk.adapter';
import { R2Adapter } from './r2.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    StorageService,
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigService) => {
        const driver = (config.get<string>('STORAGE_DRIVER') || 'local').toLowerCase();
        if (driver === 'r2') {
          const endpoint = config.get<string>('R2_ENDPOINT');
          const bucket = config.get<string>('R2_BUCKET');
          const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
          const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
          if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
            throw new Error('R2 storage is enabled but required env vars are missing.');
          }
          return new R2Adapter({
            endpoint,
            bucket,
            accessKeyId,
            secretAccessKey,
          });
        }
        return new LocalDiskAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
