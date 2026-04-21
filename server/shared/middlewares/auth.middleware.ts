import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import dotenv from 'dotenv';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("[BOOT FATAL] JWT_SECRET environment variable is missing.");
    process.exit(1);
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
   const authHeader = req.headers.authorization;
   if (authHeader) {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, JWT_SECRET, (err, user) => {
         if (err) return res.status(403).json({ error: 'Token expired or invalid' });
         req.user = user;
         next();
      });
   } else {
      res.status(401).json({ error: 'Unauthorized, no token provided' });
   }
};

export const requireKYC = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
   try {
      const kyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (!kyc || kyc.status !== 'verified') {
         return res.status(403).json({ error: 'KYC Verification Required. Please complete Identity Verification.' });
      }
      next();
   } catch (e) {
      res.status(500).json({ error: 'Server error checking KYC' });
   }
};
