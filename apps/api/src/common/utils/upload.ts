import { extname } from 'path';

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const uploadDir = () => process.env.UPLOAD_DIR || 'uploads';

export const imageFileFilter = (_req: any, file: any, cb: any) => {
  const isImage = file.mimetype?.startsWith('image/');
  const ext = extname(file.originalname || '').toLowerCase();
  if (!isImage || (ext && !allowedExt.has(ext))) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

export const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
