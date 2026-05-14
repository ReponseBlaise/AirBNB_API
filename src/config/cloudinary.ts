import { v2 as cloudinary } from 'cloudinary';

const CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'] ?? '';
const API_KEY = process.env['CLOUDINARY_API_KEY'] ?? '';
const API_SECRET = process.env['CLOUDINARY_API_SECRET'] ?? '';

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  // Throw early so the developer sees a clear message during startup
  throw new Error(
    'Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in your environment.'
  );
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

export function uploadToCloudinary(buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> {
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

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getOptimizedUrl(url: string, width: number, height: number): string {
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill,f_auto,q_auto/`);
}
