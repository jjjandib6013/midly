import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    // Tigris, R2, and most S3-compatible providers require path-style addressing
    // (https://endpoint/bucket/key). Without this flag the SDK produces
    // virtual-host URLs (https://bucket.endpoint/key) which 404 on these backends.
    // The multer-based config in server/config/s3.ts already sets this — the
    // presign client must match, otherwise uploads succeed but downloads break.
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

export const generateUploadUrl = async (key: string, contentType: string): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    // 5-minute expiry for upload
    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
};

export const generateDownloadUrl = async (key: string, contentType?: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        // Force the response Content-Type so browsers render images/PDFs inline
        // instead of treating them as octet-streams (the default fallback when
        // the provider doesn't persist the upload's Content-Type metadata).
        ResponseContentType: contentType,
    });
    // 15-minute expiry for viewing
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};
