import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { prisma } from '../../config/db';

const router = Router();

// Secure endpoint to access KYC files
router.get('/files/:filename', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const filename = path.basename(req.params.filename as string); // strip path traversal
   if (!filename || filename.includes('..')) return res.status(400).json({ error: 'Invalid filename' });

   // Verify ownership — only the user who submitted this KYC or an admin can access it
   const kycImage = await prisma.kycImage.findFirst({
      where: { file_path: { endsWith: filename }, kyc: { user_id: req.user.user_id } }
   });
   if (!kycImage && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

   const filePath = path.join(__dirname, '../../../uploads/kyc', filename);
   if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
   res.sendFile(filePath);
});

// POST KYC Submission
router.post('/', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
            status: 'verified' // Auto verified for demo capstone
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

import { z } from 'zod';
import { encrypt } from '../../../src/ai/cryptoUtils';
import { kycQueue } from '../../../src/ai/queue';
import { aiKycLimiter } from '../../shared/middlewares/rateLimiter';
import path from 'path';
import fs from 'fs';

const kycPhase1Schema = z.object({
   idType: z.string().min(2, "ID Type is required"),
   idNumber: z.string().min(4, "Invalid ID Number")
});

const kycPhase2Schema = z.object({
   imageUrl: z.string().min(1, "Image path is required")
});

const kycPhase3Schema = z.object({
   livenessImage: z.string().min(1, "Liveness snapshot is required")
});

// Dev Reset KYC
router.post('/reset', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      await prisma.kycImage.deleteMany({ where: { kyc: { user_id: req.user.user_id } } });
      await prisma.kycVerification.deleteMany({ where: { user_id: req.user.user_id } });
      res.json({ message: 'KYC Reset Successfully' });
   } catch (e: any) {
      res.status(500).json({ error: 'Server error', msg: e.message });
   }
});

// Phase 1: Identity Sync
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

// Phase 2: Document Processing Upload
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

      await prisma.kycImage.create({ data: { kyc_id: kyc.kyc_id, image_type: 'Front', file_path: `/uploads/kyc/${filename}` } });

      await prisma.kycVerification.update({
         where: { kyc_id: kyc.kyc_id },
         data: { status: 'verifying_phase2', phase: 2 }
      });

      await kycQueue.add('verify-kyc-phase2', {
         kycId: kyc.kyc_id,
         filePath: kycDomainPath,
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

// Phase 3: Liveness Verification Upload
router.post('/phase3', authenticateJWT, aiKycLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const parsedParams = kycPhase3Schema.safeParse(req.body);
      if (!parsedParams.success) return res.status(400).json({ error: 'Validation failed' });
      const { livenessImage } = parsedParams.data;

      const kyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (!kyc || kyc.phase < 2 || kyc.status !== 'phase2_verified') {
         return res.status(400).json({ error: 'Phase 2 not verified. AI must check ID first.' });
      }

      const base64Data = livenessImage.replace(/^data:image\/jpeg;base64,/, "");
      const livenessFilename = `liveness-${req.user.user_id}-${Date.now()}.jpg`;
      const livenessDomainPath = path.join(__dirname, '../../../uploads/kyc', livenessFilename);
      fs.writeFileSync(livenessDomainPath, base64Data, 'base64');

      await prisma.kycImage.create({ data: { kyc_id: kyc.kyc_id, image_type: 'Selfie', file_path: `/uploads/kyc/${livenessFilename}` } });

      await prisma.kycVerification.update({
         where: { kyc_id: kyc.kyc_id },
         data: { status: 'verifying_phase3', phase: 3 }
      });

      await kycQueue.add('verify-kyc-phase3', {
         kycId: kyc.kyc_id,
         livenessFilePath: livenessDomainPath
      });

      res.json({ message: 'Verifying Phase 3 Liveness Matrix' });
   } catch (e: any) { res.status(500).json({ error: 'Server error' }); }
});

export default router;
