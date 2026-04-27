import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';

export interface ImageProcessResult {
  url: string;
  method: 'storage' | 'base64' | 'none';
  error?: string;
}

/**
 * Compresses an image file and returns a Base64 string.
 * Target size is roughly 100-200KB for Firestore safety.
 */
export async function compressToToDataURL(file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      // Set onload BEFORE src to avoid race conditions
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (e) => {
        console.error('Image loading error:', e);
        reject(new Error('Failed to load image for compression'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = (e) => {
      console.error('FileReader error:', e);
      reject(new Error('Failed to read file'));
    };
  });
}

/**
 * Attempts to upload to Firebase Storage, with a timeout and Base64 fallback.
 */
export async function processAndUploadImage(
  file: File,
  storage: FirebaseStorage | null,
  path: string,
  timeoutMs = 10000
): Promise<ImageProcessResult> {
  if (!file) return { url: '', method: 'none' };

  // Try Storage first if available
  if (storage) {
    try {
      console.info(`[ImageProcessor] Attempting Storage upload to: ${path}`);
      const storageRef = ref(storage, path);
      
      const uploadTask = async () => {
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      };

      const url = await Promise.race([
        uploadTask(),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('Storage Timeout')), timeoutMs)
        )
      ]);

      console.info('[ImageProcessor] Storage upload successful');
      return { url, method: 'storage' };
    } catch (error: any) {
      console.warn(`[ImageProcessor] Storage failed (Reason: ${error.message}), falling back to Base64`);
    }
  } else {
    console.warn('[ImageProcessor] Storage not initialized, using Base64');
  }

  // Fallback to Base64
  try {
    const base64 = await compressToToDataURL(file);
    console.info('[ImageProcessor] Base64 compression successful');
    
    // Check size - Firestore document limit is 1MB total
    if (base64.length > 800000) {
      console.warn('[ImageProcessor] Base64 string is quite large (>800KB), trying more aggressive compression');
      const smallerBase64 = await compressToToDataURL(file, 600, 600, 0.4);
      return { url: smallerBase64, method: 'base64' };
    }
    
    return { url: base64, method: 'base64' };
  } catch (error: any) {
    console.error('[ImageProcessor] Base64 fallback failed:', error);
    return { url: '', method: 'none', error: error.message };
  }
}
