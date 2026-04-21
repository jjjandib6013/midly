import { rateLimit } from 'express-rate-limit';

export const authLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   limit: 10,
   message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

export const aiKycLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   limit: 10,
   message: { error: 'LLM Analysis Limit exceeded. Please try again after 15 minutes.' }
});
