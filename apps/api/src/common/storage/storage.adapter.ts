import { Readable } from 'stream';

export interface StoragePutResult {
  key: string;
  url: string;
}

export interface StorageGetResult {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  cacheControl?: string;
}

export interface StorageAdapter {
  putObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
    cacheControl?: string;
  }): Promise<void>;
  getObject(key: string): Promise<StorageGetResult>;
  deleteObject(key: string): Promise<void>;
}
