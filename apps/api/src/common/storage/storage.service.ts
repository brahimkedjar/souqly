import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_ADAPTER } from './storage.constants';
import { StorageAdapter, StorageGetResult, StoragePutResult } from './storage.adapter';
import { LocalDiskAdapter } from './local-disk.adapter';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_ADAPTER) private readonly adapter: StorageAdapter,
    private readonly config: ConfigService,
  ) {}

  async putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
    baseUrl?: string;
  }): Promise<StoragePutResult> {
    const safeKey = this.normalizeKey(params.key);
    await this.adapter.putObject({
      key: safeKey,
      body: params.body,
      contentType: params.contentType,
      cacheControl: params.cacheControl,
    });
    return { key: safeKey, url: this.getPublicUrl(safeKey, params.baseUrl) };
  }

  async getObject(key: string): Promise<StorageGetResult> {
    const safeKey = this.normalizeKey(key);
    try {
      return await this.adapter.getObject(safeKey);
    } catch (err: any) {
      const driver = (this.config.get<string>('STORAGE_DRIVER') || 'local').toLowerCase();
      if (driver === 'r2') {
        try {
          const local = new LocalDiskAdapter();
          return await local.getObject(safeKey);
        } catch (_) {
          // fallthrough to throw original error
        }
      }
      throw err;
    }
  }

  async deleteObject(key?: string | null): Promise<void> {
    if (!key) return;
    const safeKey = this.normalizeKey(key);
    await this.adapter.deleteObject(safeKey);
  }

  getPublicUrl(key: string, baseUrl?: string): string {
    const cdn = this.config.get<string>('PUBLIC_CDN_BASE_URL');
    if (cdn) {
      return this.joinUrl(cdn, key);
    }
    const appUrl = this.config.get<string>('APP_URL') || baseUrl;
    if (appUrl) {
      return this.joinUrl(appUrl, `files/${key}`);
    }
    return `/files/${key}`;
  }

  private joinUrl(base: string, path: string) {
    const trimmedBase = base.replace(/\/+$/, '');
    const trimmedPath = path.replace(/^\/+/, '');
    return `${trimmedBase}/${trimmedPath}`;
  }

  private normalizeKey(key: string) {
    return key
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^(\.\.\/)+/, '')
      .replace(/^\.\/+/, '');
  }
}
