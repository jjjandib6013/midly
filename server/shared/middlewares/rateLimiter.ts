import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

export const authLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   limit: 10,
   message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

export const aiKycLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   limit: 5,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'KYC submission limit exceeded. Please try again after 15 minutes.' }
});

export const disputeLimiter = rateLimit({
   windowMs: 24 * 60 * 60 * 1000, // 24 hours
   limit: 3,
   keyGenerator: (req, res) => {
      if ((req as any).user?.user_id) return String((req as any).user.user_id);
      return ipKeyGenerator(req.ip || 'unknown');
   },
   message: { error: 'You have reached the maximum number of disputes allowed per 24 hours (3).' }
});
