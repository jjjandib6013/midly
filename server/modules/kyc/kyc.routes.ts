import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { prisma } from '../../config/db';
import { z } from 'zod';
import { encrypt } from '../../../src/ai/cryptoUtils';
import { kycQueue } from '../../../src/ai/queue';
import { aiKycLimiter } from '../../shared/middlewares/rateLimiter';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

// ==========================================
// S3 CLIENT FOR KYC UPLOADS (#6)
// ==========================================
const s3Client = (process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID) ? new S3Client({
   region: process.env.AWS_REGION || 'auto',
   endpoint: process.env.AWS_ENDPOINT,
   credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
   },
   forcePathStyle: true,
}) : null;

async function uploadToS3(localPath: string, s3Key: string): Promise<void> {
   if (!s3Client) return;
   const fileBuffer = fs.readFileSync(localPath);
   await s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
   }));
   console.log(`[KYC] Uploaded to S3: ${s3Key}`);
}

// ==========================================
// SECURE KYC FILE ACCESS
// ==========================================
router.get('/files/:filename', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const filename = path.basename(req.params.filename as string);
   if (!filename || filename.includes('..')) return res.status(400).json({ error: 'Invalid filename' });

   const kycImage = await prisma.kycImage.findFirst({
      where: { file_path: { endsWith: filename }, kyc: { user_id: req.user.user_id } }
   });
   if (!kycImage && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

   const filePath = path.join(__dirname, '../../../uploads/kyc', filename);
   if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
   res.sendFile(filePath);
});

// ==========================================
// POST KYC — DEMO AUTO-VERIFY (#8 — GUARDED)
// ==========================================
router.post('/', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   // Issue #8: Block auto-verify in production
   if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Direct KYC bypass is disabled in production. Use the 3-phase verification flow.' });
   }

   try {
      const { id_type, id_number, birthdate } = req.body;
      const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      if (!user) return res.status(404).json({ error: 'Not found' });

      await prisma.kycVerification.upsert({
         where: { user_id: req.user.user_id },
         create: {
            user_id: req.user.user_id,
            id_type: id_type || 'ID',
            id_number: id_number || '00000',
            id_name: `${user.first_name} ${user.last_name}`,
            birthdate: new Date(birthdate || '1990-01-01'),
            status: 'verified' // Auto verified for demo/development ONLY
         },
         update: {
            id_type: id_type || 'ID',
            id_number: id_number || '00000',
            id_name: `${user.first_name} ${user.last_name}`,
            birthdate: new Date(birthdate || '1990-01-01'),
            status: 'verified'
         }
      });
      res.json({ status: 'OK' });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// ==========================================
// VALIDATION SCHEMAS
// ==========================================
const kycPhase1Schema = z.object({
   idType: z.string().min(2, "ID Type is required"),
   idNumber: z.string().min(4, "Invalid ID Number")
});

const kycPhase2Schema = z.object({
   imageUrl: z.string().min(1, "Image path is required")
});

const kycPhase3Schema = z.object({
   livenessFrames: z.array(z.string()).min(3, "At least 3 liveness frames are required").max(10, "Maximum 10 frames allowed"),
   challenge: z.string().optional()
});

// ==========================================
// DEV RESET KYC
// ==========================================
router.post('/reset', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      await prisma.kycImage.deleteMany({ where: { kyc: { user_id: req.user.user_id } } });
      await prisma.kycVerification.deleteMany({ where: { user_id: req.user.user_id } });
      res.json({ message: 'KYC Reset Successfully' });
   } catch (e: any) {
      res.status(500).json({ error: 'Server error', msg: e.message });
   }
});

// ==========================================
// PHASE 1: IDENTITY SYNC
// ==========================================
router.post('/phase1', authenticateJWT, aiKycLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const parsedParams = kycPhase1Schema.safeParse(req.body);
      if (!parsedParams.success) return res.status(400).json({ error: 'Validation failed' });
      const { idType, idNumber } = parsedParams.data;

      const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      if (!user) return res.status(404).json({ error: 'User missing' });
      const idName = `${user.first_name} ${user.last_name}`;
      const birthdate = user.birthdate || new Date();

      const idNumberEncrypted = encrypt(idNumber);
      const idNameEncrypted = encrypt(idName);

      // Upsert record
      const existingKyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (existingKyc) {
         await prisma.kycVerification.update({
            where: { user_id: req.user.user_id },
            data: { id_type: idType, id_number: idNumberEncrypted, id_name: idNameEncrypted, birthdate, status: 'phase1_complete', phase: 1 }
         });
      } else {
         await prisma.kycVerification.create({
            data: { user_id: req.user.user_id, id_type: idType, id_number: idNumberEncrypted, id_name: idNameEncrypted, birthdate, status: 'phase1_complete', phase: 1 }
         });
      }

      res.json({ message: 'Phase 1 Complete' });
   } catch (e: any) {
      console.error('Phase 1 Error:', e);
      res.status(500).json({ error: 'Server error: ' + e.message });
   }
});

// ==========================================
// PHASE 2: DOCUMENT PROCESSING (#6, #10)
// ==========================================
router.post('/phase2', authenticateJWT, aiKycLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const parsedParams = kycPhase2Schema.safeParse(req.body);
      if (!parsedParams.success) return res.status(400).json({ error: 'Validation failed' });
      const { imageUrl } = parsedParams.data;

      const kyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (!kyc || kyc.phase < 1) return res.status(400).json({ error: 'Complete Phase 1 first.' });

      const filename = path.basename(imageUrl);
      const rawPath = path.join(__dirname, '../../../uploads', filename);
      const kycDomainPath = path.join(__dirname, '../../../uploads/kyc', filename);

      const dir = path.dirname(kycDomainPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(rawPath)) fs.renameSync(rawPath, kycDomainPath);
      else if (!fs.existsSync(kycDomainPath)) return res.status(400).json({ error: 'Image not found.' });

      // Validate minimum dimensions (#10)
      try {
         const metadata = await sharp(kycDomainPath).metadata();
         if (!metadata.width || !metadata.height || metadata.width < 800 || metadata.height < 500) {
            return res.status(400).json({ error: 'Image resolution is too low. Minimum 800×500 pixels required.' });
         }
      } catch (imgErr) {
         return res.status(400).json({ error: 'Could not read image metadata. Ensure the file is a valid image.' });
      }

      // Compute SHA-256 hash for integrity (#10)
      const fileBuffer = fs.readFileSync(kycDomainPath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Upload to S3 if configured (#6)
      let workerFilePath = kycDomainPath;
      const s3Key = `kyc/${req.user.user_id}/${filename}`;
      if (s3Client) {
         await uploadToS3(kycDomainPath, s3Key);
         workerFilePath = s3Key; // Worker will download from S3
      }

      await prisma.kycImage.create({
         data: {
            kyc_id: kyc.kyc_id,
            image_type: 'Front',
            file_path: s3Client ? s3Key : `/uploads/kyc/${filename}`,
            file_hash: fileHash
         }
      });

      await prisma.kycVerification.update({
         where: { kyc_id: kyc.kyc_id },
         data: { status: 'verifying_phase2', phase: 2 }
      });

      await kycQueue.add('verify-kyc-phase2', {
         kycId: kyc.kyc_id,
         filePath: workerFilePath,
         idType: kyc.id_type,
         idNumberEncrypted: kyc.id_number,
         idNameEncrypted: kyc.id_name,
         birthdate: kyc.birthdate
      });

      res.json({ message: 'Verifying Phase 2 Document AI' });
   } catch (e: any) {
      console.error('Phase 2 API Error:', e);
      res.status(500).json({ error: 'Server error: ' + e.message });
   }
});

// ==========================================
// PHASE 3: MULTI-FRAME LIVENESS (#4, #6)
// ==========================================
router.post('/phase3', authenticateJWT, aiKycLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const parsedParams = kycPhase3Schema.safeParse(req.body);
      if (!parsedParams.success) return res.status(400).json({ error: 'Validation failed. At least 3 liveness frames are required.' });
      const { livenessFrames, challenge } = parsedParams.data;

      const kyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (!kyc || kyc.phase < 2 || kyc.status !== 'phase2_verified') {
         return res.status(400).json({ error: 'Phase 2 not verified. AI must check ID first.' });
      }

      // Save the first frame as the primary selfie record
      const base64Data = livenessFrames[0].replace(/^data:image\/\w+;base64,/, '');
      const livenessFilename = `liveness-${req.user.user_id}-${Date.now()}.jpg`;
      const livenessDomainPath = path.join(__dirname, '../../../uploads/kyc', livenessFilename);
      fs.writeFileSync(livenessDomainPath, base64Data, 'base64');

      // Upload primary frame to S3 (#6)
      const s3Key = `kyc/${req.user.user_id}/${livenessFilename}`;
      if (s3Client) {
         await uploadToS3(livenessDomainPath, s3Key);
      }

      await prisma.kycImage.create({
         data: {
            kyc_id: kyc.kyc_id,
            image_type: 'Selfie',
            file_path: s3Client ? s3Key : `/uploads/kyc/${livenessFilename}`
         }
      });

      await prisma.kycVerification.update({
         where: { kyc_id: kyc.kyc_id },
         data: { status: 'verifying_phase3', phase: 3 }
      });

      // Pass ALL frames to worker for multi-frame liveness analysis (#4)
      await kycQueue.add('verify-kyc-phase3', {
         kycId: kyc.kyc_id,
         livenessFrames: livenessFrames,
         challenge: challenge || 'blink_and_turn'
      });

      res.json({ message: 'Verifying Phase 3 Liveness Matrix' });
   } catch (e: any) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
