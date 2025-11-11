import { v2 as cloudinary } from 'cloudinary';

export function initializeCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[CLOUDINARY] ⚠️  Cloudinary credentials not configured');
    console.warn('[CLOUDINARY] Video uploads will use local storage (not recommended for production)');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  console.log(`[CLOUDINARY] ✅ Configured successfully with cloud: ${cloudName}`);
  return true;
}

export const cloudinaryUploadStream = (buffer: Buffer, options: any = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'freemind-videos',
        use_filename: true,
        unique_filename: true,
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('[CLOUDINARY] Upload error:', error);
          reject(error);
        } else {
          console.log(`[CLOUDINARY] ✅ Upload successful: ${result?.public_id}`);
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export { cloudinary };
