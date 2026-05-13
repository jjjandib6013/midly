import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Config } from '../config/s3';

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

/**
 * Presigns an S3 URL so it can be accessed directly by the browser.
 * If the URL is not an S3 URL or S3 is not configured, returns the original URL.
 * Works on any domain (localhost, production, etc.)
 */
export async function presignS3Url(url: string): Promise<string> {
   if (!s3Config || !BUCKET_NAME || !url.includes(BUCKET_NAME)) {
      return url;
   }

   try {
      const bucketIndex = url.indexOf(BUCKET_NAME);
      const keyStart = bucketIndex + BUCKET_NAME.length + 1; // +1 for the slash
      const key = url.substring(keyStart).split('?')[0]; // Strip existing query params

      const command = new GetObjectCommand({
         Bucket: BUCKET_NAME,
         Key: key
      });
      return await getSignedUrl(s3Config, command, { expiresIn: 3600 }); // 1 hour
   } catch (e) {
      console.error('[presignS3Url] Failed to presign:', e);
      return url; // Fallback to original
   }
}

/**
 * Presigns any S3 URLs found in message text.
 * Handles the format: "https://s3-url.../file.png optional caption text"
 */
export async function presignMessageText(text: string): Promise<string> {
   if (!text || !text.includes('/uploads/')) return text;
   
   // The URL is always the first "word" in the message text
   const parts = text.split(' ');
   const firstPart = parts[0];
   
   if (firstPart.startsWith('http') && firstPart.includes(BUCKET_NAME)) {
      const presigned = await presignS3Url(firstPart);
      parts[0] = presigned;
      return parts.join(' ');
   }
   
   return text;
}
