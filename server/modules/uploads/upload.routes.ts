import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/s3';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();

// Magic byte signatures for common image formats
const IMAGE_MAGIC_BYTES: { [key: string]: number[] } = {
   'jpeg': [0xFF, 0xD8, 0xFF],
   'png': [0x89, 0x50, 0x4E, 0x47],
   'webp_riff': [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP)
};

function isValidImage(filePath: string): boolean {
   try {
      const fd = fs.openSync(filePath, 'r');
      const headerBuffer = Buffer.alloc(8);
      fs.readSync(fd, headerBuffer, 0, 8, 0);
      fs.closeSync(fd);

      for (const [, magicBytes] of Object.entries(IMAGE_MAGIC_BYTES)) {
         let match = true;
         for (let i = 0; i < magicBytes.length; i++) {
            if (headerBuffer[i] !== magicBytes[i]) { match = false; break; }
         }
         if (match) return true;
      }
      return false;
   } catch {
      return false;
   }
}

function computeFileHash(filePath: string): string {
   const fileBuffer = fs.readFileSync(filePath);
   return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// POST Upload File (secured)
router.post('/', authenticateJWT, upload.single('file'), (req: Request, res: Response): void => {
   if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
   const type = req.query.type as string;
   const destFolder = type === 'kyc' ? 'kyc' : (type === 'traderoom' ? 'public/trade_rooms' : 'general');

   // If uploaded to S3, req.file.location exists. Otherwise, it's local.
   const isS3 = !!(req.file as any).location;
   const fileUrl = isS3
      ? (req.file as any).location
      : `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/${destFolder}/${req.file.filename}`;

   // multer-s3 records the authoritative object key on req.file.key. Round-trip
   // this to the client so downstream routes (e.g. /api/kyc/phase2) can download
   // the file without parsing the URL string — URL parsing is fragile across
   // S3-compatible providers (different path-style vs virtual-host rendering,
   // bucket name prefixing, etc) and that inconsistency is what caused the
   // "The specified key does not exist" 404s we were seeing on Phase 2.
   const s3Key = isS3 ? (req.file as any).key : null;

   // Magic byte validation for local uploads (#10)
   if (!isS3 && req.file.path) {
      if (!isValidImage(req.file.path)) {
         // Delete the invalid file
         try { fs.unlinkSync(req.file.path); } catch {}
         res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and WebP images are accepted.' });
         return;
      }

      // Compute SHA-256 hash (#10)
      const fileHash = computeFileHash(req.file.path);
      res.json({ message: 'Upload successful', url: fileUrl, hash: fileHash });
      return;
   }

   // For S3 uploads, we can't easily validate magic bytes post-upload.
   // The S3 upload config already sets content type automatically.
   console.log('[Upload] S3 upload complete', {
      key: s3Key,
      location: fileUrl,
      userAgent: req.headers['user-agent'],
   });
   res.json({ message: 'Upload successful', url: fileUrl, s3Key });
});

export default router;
