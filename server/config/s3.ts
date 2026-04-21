import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export const s3Config = process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID ? new S3Client({
   region: process.env.AWS_REGION || 'auto',
   endpoint: process.env.AWS_ENDPOINT,
   credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
   },
   forcePathStyle: true, // Often required for third-party S3-compatible APIs
}) : null;

export const storage = s3Config ? multerS3({
   s3: s3Config,
   bucket: process.env.AWS_BUCKET_NAME as string,
   contentType: multerS3.AUTO_CONTENT_TYPE,
   key: (req: any, file: any, cb: any) => {
      const type = req.query.type as string;
      let destFolder = 'uploads/';
      if (type === 'kyc') destFolder = 'uploads/kyc/';
      else if (type === 'traderoom') destFolder = 'uploads/public/trade_rooms/';
      else destFolder = 'uploads/general/';

      const uniqueId = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, `${destFolder}${uniqueId}${ext}`);
   }
}) : multer.diskStorage({
   destination: (req, file, cb) => {
       const type = req.query.type as string;
       let destFolder = 'uploads/';
       if (type === 'kyc') destFolder = 'uploads/kyc/';
       else if (type === 'traderoom') destFolder = 'uploads/public/trade_rooms/';
       else destFolder = 'uploads/general/';

       const fullPath = path.join(__dirname, '../../', destFolder); // Adjusted for moving out of root
       if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
       cb(null, fullPath);
   },
   filename: (req, file, cb) => {
       const uniqueId = crypto.randomUUID();
       const ext = path.extname(file.originalname);
       cb(null, `${uniqueId}${ext}`);
   }
});

export const upload = multer({ storage });
