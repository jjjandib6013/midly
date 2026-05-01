import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'auto',
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

const setCors = async () => {
    try {
        const command = new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: [],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });
        
        const response = await s3Client.send(command);
        console.log("CORS Configuration successfully set:", response);
    } catch (error) {
        console.error("Error setting CORS:", error);
    }
};

setCors();
