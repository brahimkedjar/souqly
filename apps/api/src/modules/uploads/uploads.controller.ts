import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { imageFileFilter, MAX_IMAGE_SIZE } from '../../common/utils/upload';
import { StorageService } from '../../common/storage/storage.service';
import { getBaseUrl } from '../../common/utils/url';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
      limits: { fileSize: MAX_IMAGE_SIZE },
    }),
  )
  async upload(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
    const key = `uploads/${randomUUID()}${ext}`;
    const baseUrl = getBaseUrl(req);
    const result = await this.storage.putObject({
      key,
      body: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
      baseUrl,
    });
    return { url: result.url, key: result.key };
  }
}
