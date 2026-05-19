import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'
import path from 'path'

const CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'] ?? '';
const API_KEY = process.env['CLOUDINARY_API_KEY'] ?? '';
const API_SECRET = process.env['CLOUDINARY_API_SECRET'] ?? '';

const hasCloudinary = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

export function isLocalUpload(): boolean {
  return !hasCloudinary;
}

export function uploadToCloudinary(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
  if (hasCloudinary) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  }

  // Local fallback: save file to public/uploads and return a local URL
  return (async () => {
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    // Use the same PORT the app listens on (default 3000) so returned URLs are reachable
    const port = process.env['PORT'] || '3000';
    const base = process.env['LOCAL_BASE_URL'] || `http://localhost:${port}`;
    return { url: `${base}/uploads/${filename}`, publicId: filename };
  })()
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (hasCloudinary) {
    await cloudinary.uploader.destroy(publicId);
    return;
  }

  try {
    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const filepath = path.join(uploadsDir, publicId);
    await fs.promises.unlink(filepath).catch(() => undefined);
  } catch (err) {
    // ignore
  }
}

export function getOptimizedUrl(url: string, width: number, height: number): string {
  if (hasCloudinary) {
    return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`);
  }
  return url;
}
