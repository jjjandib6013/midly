import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const isDev = process.env.NODE_ENV !== 'production';

// In dev mode, bypass rate limiting entirely so developers can test freely
const devPassthrough = (req: Request, res: Response, next: NextFunction) => next();

// ──────────────────────────────────────────────────────────────────────────
// Dev-mode bypass for demos and presentation testing.
//
// Honored when BOTH:
//   1. Request carries header `X-Dev-Mode: 1`
//   2. The JWT in the Authorization header cryptographically verifies
//
// Any authenticated user can toggle this from the client. This is
// deliberately permissive because Midly isn't in production yet and we
// need frictionless demo runs. Tighten to `role === 'admin'` before any
// real launch.
// ──────────────────────────────────────────────────────────────────────────
const isDevBypass = (req: Request): boolean => {
   if (req.headers['x-dev-mode'] !== '1') return false;
   const auth = req.headers.authorization;
   if (!auth) return false;
   const token = auth.split(' ')[1];
   if (!token || !process.env.JWT_SECRET) return false;
   try {
      jwt.verify(token, process.env.JWT_SECRET);
      return true;
   } catch {
      return false;
   }
};

export const authLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   limit: 10,
   skip: isDevBypass,
   message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

export const aiKycLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 15 * 60 * 1000,
   limit: 5,
   skip: isDevBypass,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'KYC submission limit exceeded. Please try again after 15 minutes.' }
});

export const disputeLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 24 * 60 * 60 * 1000, // 24 hours
   limit: 3,
   skip: isDevBypass,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'You have reached the maximum number of disputes allowed per 24 hours (3).' }
});

export const listingLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 60 * 60 * 1000, // 1 hour
   limit: 10,
   skip: isDevBypass,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'Listing creation limit exceeded. Maximum 10 listings per hour.' }
});

export const globalLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   limit: 200,
   skip: isDevBypass,
   message: { error: 'Too many requests from this IP, please try again later.' }
});

export const heavyEndpointLimiter = isDev ? devPassthrough : rateLimit({
   windowMs: 60 * 1000, // 1 minute
   limit: 30,
   skip: isDevBypass,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'You are fetching data too quickly. Please slow down.' }
});
