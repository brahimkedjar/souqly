import { Controller, Get, InternalServerErrorException, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { StorageService } from '../../common/storage/storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get('*key')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    let result;
    try {
      result = await this.storage.getObject(key);
    } catch (err) {
      const anyErr: any = err;
      const status = anyErr?.$metadata?.httpStatusCode;
      if (anyErr?.code === 'NOT_FOUND' || status === 404) {
        throw new NotFoundException({ message: 'File not found', code: 'FILE_NOT_FOUND' });
      }
      // log unexpected storage errors for debugging
      // eslint-disable-next-line no-console
      console.error('Storage get error', anyErr);
      throw new InternalServerErrorException({ message: 'Storage error', code: 'STORAGE_ERROR' });
    }
    const contentType = result.contentType || this.guessContentType(key);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    if (result.cacheControl) {
      res.setHeader('Cache-Control', result.cacheControl);
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    if (result.contentLength) {
      res.setHeader('Content-Length', result.contentLength.toString());
    }
    result.stream.pipe(res);
  }

  private guessContentType(key: string) {
    const lower = key.toLowerCase();
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    return undefined;
  }
}
