import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { StorageAdapter, StorageGetResult } from './storage.adapter';

export class R2Adapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(opts: { endpoint: string; accessKeyId: string; secretAccessKey: string; bucket: string }) {
    this.bucket = opts.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: opts.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    });
  }

  async putObject(params: { key: string; body: Buffer; contentType: string; cacheControl?: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
        CacheControl: params.cacheControl,
      }),
    );
  }

  async getObject(key: string): Promise<StorageGetResult> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const body = response.Body;
    if (!body || !(body instanceof Readable)) {
      const err: any = new Error('Object not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    return {
      stream: body,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      cacheControl: response.CacheControl,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
