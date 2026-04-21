import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
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
import { authLimiter, aiKycLimiter } from './server/shared/middlewares/rateLimiter';
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

app.use(cors({
   origin: function (origin, callback) {
       const HARDCODED = [
           'https://midlyph.com',
           'https://www.midlyph.com',
           'http://localhost:3000',
       ];
       const ENV_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
       const ALLOWED = [...new Set([...HARDCODED, ...ENV_ORIGINS])];
       if (!origin || ALLOWED.includes(origin) || process.env.NODE_ENV === 'development') {
           callback(null, true);
       } else {
           callback(new Error('CORS: Origin not allowed'));
       }
   },
   credentials: true,
   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', (req, res, next) => {
   if (req.path.startsWith('/kyc/') || req.path.startsWith('/private/')) {
       return res.status(403).json({ error: 'Direct access to protected folders is strictly prohibited due to AML compliance.' });
   }
   next();
}, express.static(path.join(__dirname, 'uploads')));

// ==========================================
// API ROUTES START HERE
// ==========================================

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
// AUDIT LOGGING UTILITY
// ==========================================

export const logAudit = async (tx: any, tradeId: number, userId: number, actionType: string, description: string, ip?: string) => {
   await tx.auditLog.create({
      data: {
         transaction_id: tradeId,
         user_id: userId,
         action_type: actionType,
         action_description: description,
         ip_address: ip || 'system',
         risk_score: 0
      }
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

// GET Wallet Stats, History, Deposit, Withdraw moved to User Routes
app.use('/api', userRoutes);


// Admin APIs moved to Admin Routes
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', transactionRoutes); // Fallback for /listings and /notifications which are defined inside transactionRoutes
app.use('/api/messages', messageRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhooks', webhookRoutes);


// Transactions and Messages have been moved to their respective routes

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
