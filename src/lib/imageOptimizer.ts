/**
 * Client-side image optimization utility:
 * - Resizes images to a maximum width (default: 1600px), maintaining aspect ratio.
 * - Converts images to WebP format with quality 0.85 to minimize bandwidth and load times.
 * - Falls back cleanly to original file if browser canvas or WebP encoding fails.
 */

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export async function optimizeImageForUpload(
  file: File,
  options: OptimizeImageOptions = {},
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    mimeType = 'image/webp',
  } = options;

  // If not a standard raster image (e.g. SVG or unknown), return as is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let imageSource: ImageBitmap | HTMLImageElement;

    // Use modern createImageBitmap when available for GPU-accelerated decoding
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
      imageSource = bitmap;
    } else {
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      URL.revokeObjectURL(url);
      sourceWidth = img.naturalWidth;
      sourceHeight = img.naturalHeight;
      imageSource = img;
    }

    // If source dimensions cannot be determined, return original
    if (!sourceWidth || !sourceHeight) {
      if ('close' in imageSource && typeof imageSource.close === 'function') {
        imageSource.close();
      }
      return file;
    }

    // Calculate proportional dimensions
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    const widthRatio = maxWidth / sourceWidth;
    const heightRatio = maxHeight / sourceHeight;
    const scaleRatio = Math.min(widthRatio, heightRatio, 1); // Never upscale

    targetWidth = Math.round(sourceWidth * scaleRatio);
    targetHeight = Math.round(sourceHeight * scaleRatio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      if ('close' in imageSource && typeof imageSource.close === 'function') {
        imageSource.close();
      }
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

    if ('close' in imageSource && typeof imageSource.close === 'function') {
      imageSource.close();
    }

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
      return file;
    }

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';

    return new File([blob], `${baseName}.${extension}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('[imageOptimizer] Fallback to original image:', error);
    return file;
  }
}
