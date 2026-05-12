import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RegisterSchema } from './src/lib/validations';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { Resend } from 'resend';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { prisma } from './server/config/db';
import { resend } from './server/config/resend';
import { pubClient, subClient } from './server/config/redis';
import { authLimiter, aiKycLimiter, globalLimiter } from './server/shared/middlewares/rateLimiter';
import { authenticateJWT, requireKYC } from './server/shared/middlewares/auth.middleware';
import uploadRoutes from './server/modules/uploads/upload.routes';
import kycRoutes from './server/modules/kyc/kyc.routes';
import authRoutes from './server/modules/auth/auth.routes';
import userRoutes from './server/modules/users/user.routes';
import adminRoutes from './server/modules/admin/admin.routes';
import transactionRoutes from './server/modules/transactions/transaction.routes';
import messageRoutes from './server/modules/messages/message.routes';
import walletRoutes from './server/modules/wallet/wallet.routes';
import webhookRoutes from './server/modules/webhooks/webhook.routes';

// Import AI worker to initialize BullMQ listener in production (processes KYC queue jobs)
import './src/ai/worker';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
export const io = new Server(httpServer, {
   cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
}

io.on("connection", (socket) => {
   socket.on("join_trade", (tradeId) => {
      socket.join(`trade_${tradeId}`);
      console.log(`User connected to trade room: ${tradeId}`);
   });
   socket.on("join_user", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User connected to notifications channel: ${userId}`);
   });
});

const PORT = process.env.PORT || 5000;

app.set('io', io);

// ────────────────────────────────────────────────────────────────
// CORS — manual first-line handler.
//
// Express 5 + cors@2 has known quirks behind reverse proxies:
// OPTIONS preflights occasionally fall through without headers
// when the `origin` function is async or when a later middleware
// short-circuits (rate limiter 429, body-parser 413, etc.).
//
// This manual handler runs BEFORE any other middleware. It:
//   1. Echoes CORS headers on every request whose Origin is allowed.
//   2. Terminates OPTIONS preflights with a clean 204 immediately,
//      so rate limiters / parsers / auth cannot 4xx/5xx the preflight.
//
// The subsequent cors() middleware stays as a defense-in-depth layer
// for any case this doesn't cover.
// ────────────────────────────────────────────────────────────────
const HARDCODED_ORIGINS = ['https://midlyph.com', 'https://www.midlyph.com', 'http://localhost:3000'];
const isAllowedOrigin = (origin?: string | null): boolean => {
   if (!origin) return true; // Same-origin / non-browser (curl, server-to-server)
   const envList = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
   const allowed = new Set([...HARDCODED_ORIGINS, ...envList]);
   return allowed.has(origin) || process.env.NODE_ENV === 'development';
};

app.use((req, res, next) => {
   const origin = req.headers.origin as string | undefined;
   if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
   }
   if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
   }
   next();
});

app.use(cors({
   origin: function (origin, callback) {
       if (isAllowedOrigin(origin)) {
           callback(null, true);
       } else {
           callback(new Error('CORS: Origin not allowed'));
       }
   },
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization']
}));
// Tightened 50MB limit: Only allow massive payloads on the specific Phase 3 liveness route
app.use('/api/kyc/phase3', express.json({ limit: '50mb' }));
app.use('/api/kyc/phase3', express.urlencoded({ extended: true, limit: '50mb' }));

// Global parser with default safe limits (100kb-1mb) to prevent DoS attacks on other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', (req, res, next) => {
   if (req.path.startsWith('/kyc/') || req.path.startsWith('/private/')) {
       return res.status(403).json({ error: 'Direct access to protected folders is strictly prohibited due to AML compliance.' });
   }
   next();
}, express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API ROUTES START HERE
// ==========================================

// Apply global rate limiting to all API routes
app.use('/api', globalLimiter);

// ==========================================
// API ROUTES START HERE
// ==========================================

app.use('/api/upload', uploadRoutes);
app.use('/api/kyc', kycRoutes);

// Extend Express Request
declare global {
   namespace Express {
      interface Request {
         user?: any;
      }
   }
}

// (Middlewares moved up for initialization)

// ==========================================
// AUDIT LOGGING UTILITY (backward-compatible wrapper)
// ==========================================
import { logAudit as _logAudit, ACTION_TYPES } from './server/utils/auditLogger';
export { ACTION_TYPES };

export const logAudit = async (tx: any, tradeId: number, userId: number, actionType: string, description: string, ip?: string) => {
   await _logAudit({
      tx,
      transactionId: tradeId,
      userId,
      actionType: actionType as any,
      description,
      ip,
   });
};

// ==========================================
// STATE VALIDATION GUARD
// ==========================================

const TERMINAL_STATES = ['completed', 'refunded', 'cancelled', 'disputed'];
const PRE_ACCEPTANCE_STATES = ['pending_invite'];

const isTradeLockedForActions = (status: string): boolean => {
   return TERMINAL_STATES.includes(status) || PRE_ACCEPTANCE_STATES.includes(status);
};

// ==========================================
// AUTH ROUTES
// ==========================================

app.use('/api/auth', authRoutes);

// ==========================================
// PROTECTED API ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
   res.json({ status: 'OK', message: 'Midly API is running' });
});

// Lightweight authenticated heartbeat. Runs through authenticateJWT, which
// checks is_banned on every request — so this is the endpoint the Navbar
// polls on an interval to catch suspensions that happen mid-session. A
// suspended user gets 403 { code: "ACCOUNT_SUSPENDED" } and the client signs
// them out immediately.
app.get('/api/auth/session-check', authenticateJWT, (req, res) => {
   res.json({ ok: true, user_id: (req.user as any)?.user_id });
});

// GET Wallet Stats, History, Deposit, Withdraw moved to User Routes
app.use('/api', userRoutes);


// Admin APIs moved to Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', transactionRoutes); // Fallback for /listings and /notifications which are defined inside transactionRoutes


// Transactions and Messages have been moved to their respective routes

// ──────────────────────────────────────────────────────────────────────────
// Global error handler.
//
// Without this, an uncaught error in any route (e.g. a Prisma timeout) falls
// through to Express's default handler, which returns a bare 500 with *no*
// CORS headers set. Browsers then surface "Failed to fetch / No
// Access-Control-Allow-Origin" even though the real problem is server-side.
//
// This handler:
//   1. Echoes the origin back as Access-Control-Allow-Origin when the request
//      came from an allowed origin, so the browser can at least read the body.
//   2. Logs the real error server-side for diagnosis.
//   3. Returns a clean JSON body.
// ──────────────────────────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
   const origin = req.headers.origin as string | undefined;

   if (origin && isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
   }

   const statusCode = err?.status || err?.statusCode || 500;
   const isCorsBlock = err?.message === 'CORS: Origin not allowed';

   console.error('[EXPRESS ERROR]', {
      path: req.path,
      method: req.method,
      origin,
      message: err?.message,
      stack: err?.stack,
   });

   if (!res.headersSent) {
      res.status(isCorsBlock ? 403 : statusCode).json({
         error: isCorsBlock ? 'Origin not allowed' : (err?.message || 'Internal server error'),
      });
   }
});

httpServer.listen(PORT as number, '0.0.0.0', () => {
   console.log(`Server is running beautifully on http://0.0.0.0:${PORT} with JWT & Socket.io WebSockets enabled.`);
   console.log(`Sumakses ka!`);
   console.log(`Hawak mo ang beat - `);
   console.log(`Hawak mo ang beat - `);
   console.log(`Hawak mo ang beat - `);
   console.log(`Hawak mo ang beat - `);
   console.log(`Hawak mo ang beat - `);
   console.log(`Dubai Chewy Cookie - Ano, tara? `);
   console.log(`Ilocos Empanada - Ano, tara? `);
});

// triggered restart
