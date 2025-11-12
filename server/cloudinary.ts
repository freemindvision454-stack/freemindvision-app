import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Initialize Cloudinary with environment variables
 * Requires: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
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

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload video via stream (recommended for large files)
 */
export const cloudinaryUploadStream = (buffer: Buffer, options: any = {}): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'freemind-videos',
        use_filename: true,
        unique_filename: true,
        chunk_size: 6000000, // 6 MB chunks for large files
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('[CLOUDINARY] Upload error:', error);
          reject(error);
        } else {
          console.log(`[CLOUDINARY] ✅ Upload successful: ${result?.public_id}`);
          resolve(result as UploadApiResponse);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Upload image via stream
 */
export const cloudinaryUploadImageStream = (buffer: Buffer, options: any = {}): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'freemind-images',
        use_filename: true,
        unique_filename: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error('[CLOUDINARY] Image upload error:', error);
          reject(error);
        } else {
          console.log(`[CLOUDINARY] ✅ Image upload successful: ${result?.public_id}`);
          resolve(result as UploadApiResponse);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Upload profile image with face detection and cropping
 */
export const uploadProfileImage = (buffer: Buffer, userId: number): Promise<UploadApiResponse> => {
  return cloudinaryUploadImageStream(buffer, {
    folder: 'freemind-profiles',
    public_id: `user_${userId}_profile`,
    transformation: [
      { 
        width: 400, 
        height: 400, 
        crop: 'fill', 
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ],
    tags: ['profile', 'user'],
  });
};

/**
 * Upload video thumbnail
 */
export const uploadThumbnail = (buffer: Buffer, videoId: number): Promise<UploadApiResponse> => {
  return cloudinaryUploadImageStream(buffer, {
    folder: 'freemind-thumbnails',
    public_id: `video_${videoId}_thumbnail`,
    transformation: [
      { 
        width: 1280, 
        height: 720, 
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto'
      }
    ],
    tags: ['thumbnail', 'video'],
  });
};

/**
 * Delete a resource from Cloudinary
 */
export async function deleteResource(
  publicId: string,
  resourceType: 'video' | 'image' | 'raw' = 'video'
) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    console.log(`[CLOUDINARY] Resource deleted: ${publicId} - ${result.result}`);
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('[CLOUDINARY] Delete error:', error);
    throw error;
  }
}

/**
 * Generate a transformation URL for a video
 */
export function getVideoUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  }
) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    ...transformations,
  });
}

/**
 * Generate a transformation URL for an image
 */
export function getImageUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
    gravity?: string;
  }
) {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    secure: true,
    ...transformations,
  });
}

export { cloudinary };
