import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { upload } from '../../config/s3';

const router = Router();

// POST Upload File (secured)
router.post('/', authenticateJWT, upload.single('file'), (req: Request, res: Response): void => {
   if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
   const type = req.query.type as string;
   const destFolder = type === 'kyc' ? 'kyc' : (type === 'traderoom' ? 'public/trade_rooms' : 'general');
   
   // If uploaded to S3, req.file.location exists. Otherwise, it's local.
   const fileUrl = (req.file as any).location || `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/${destFolder}/${req.file.filename}`;
   
   res.json({ message: 'Upload successful', url: fileUrl });
});

export default router;
