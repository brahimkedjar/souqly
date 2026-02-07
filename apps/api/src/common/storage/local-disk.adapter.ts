import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join, normalize } from 'path';
import { StorageAdapter, StorageGetResult } from './storage.adapter';
import { uploadDir } from '../utils/upload';

export class LocalDiskAdapter implements StorageAdapter {
  private baseDir: string;

  constructor() {
    this.baseDir = join(process.cwd(), uploadDir());
  }

  private resolvePath(key: string) {
    const safeKey = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '').replace(/\\/g, '/');
    return join(this.baseDir, safeKey);
  }

  async putObject(params: { key: string; body: Buffer; contentType: string; cacheControl?: string }): Promise<void> {
    const filePath = this.resolvePath(params.key);
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, params.body);
  }

  async getObject(key: string): Promise<StorageGetResult> {
    const filePath = this.resolvePath(key);
    if (!existsSync(filePath)) {
      const err: any = new Error('File not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return { stream: createReadStream(filePath) };
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
