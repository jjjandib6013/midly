import dotenv from 'dotenv';
dotenv.config();

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("[BOOT FATAL] JWT_SECRET environment variable is missing.");
    process.exit(1);
}

// ─── Ban-state cache ────────────────────────────────────────────────────────
// authenticateJWT must check `is_banned` on every request to cut off suspended
// sessions before their 7-day JWT expires. A naive implementation would issue
// one Postgres query per request, so we cache the flag for 30s keyed by user_id.
//
// When an admin flips the ban state, admin.routes invalidates the entry
// immediately via `invalidateBanCache(userId)`, so the next request sees the
// fresh value. 30s is a safe upper bound on how long a banned user could still
// slip through if the cache miss race against the admin action.
type BanCacheEntry = { banned: boolean; expiresAt: number };
const banCache = new Map<number, BanCacheEntry>();
const BAN_CACHE_TTL_MS = 30_000;

export const invalidateBanCache = (userId: number) => {
   banCache.delete(userId);
};

const isUserBanned = async (userId: number): Promise<boolean> => {
   const now = Date.now();
   const hit = banCache.get(userId);
   if (hit && hit.expiresAt > now) return hit.banned;
   const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { is_banned: true },
   });
   // If the user was deleted, treat as "banned" so the session gets kicked.
   const banned = user ? Boolean(user.is_banned) : true;
   banCache.set(userId, { banned, expiresAt: now + BAN_CACHE_TTL_MS });
   return banned;
};

// ─── Middleware ─────────────────────────────────────────────────────────────

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
   const authHeader = req.headers.authorization;
   if (!authHeader) {
      res.status(401).json({ error: 'Unauthorized, no token provided' });
      return;
   }
   const token = authHeader.split(' ')[1];
   jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err || !decoded) return res.status(403).json({ error: 'Token expired or invalid' });
      const user = decoded as any;
      try {
         if (await isUserBanned(user.user_id)) {
            // Special error code so the client can detect and sign the user out.
            return res.status(403).json({ error: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
         }
      } catch (e) {
         // Fail-OPEN with a loud warning. A 500 here would take down every
         // authenticated endpoint on a brief Postgres hiccup (common with
         // Railway cold-starts) and surface to the browser as a CORS-less
         // error. The 30-second cache-miss exposure to a freshly-banned user
         // is the better trade-off vs a total site outage. Admin-initiated
         // bans also emit `account_suspended` on the socket + busting the
         // cache, so the enforcement path doesn't solely rely on this check.
         console.warn('[AUTH] Ban check errored — failing open for this request:', e);
      }
      req.user = user;
      next();
   });
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
