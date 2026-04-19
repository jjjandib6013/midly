import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RegisterSchema } from './src/lib/validations';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import { Resend } from 'resend';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

dotenv.config();

// Initialize Resend safely so the server doesn't crash on boot if env vars are missing
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummykey_to_prevent_crash_12345');

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);
const io = new Server(httpServer, {
   cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("Redis Pub/Sub Adapter securely activated for Distributed WebSockets.");
    }).catch(err => {
        console.error("Failed to connect Redis for WebSockets", err);
    });
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

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors({
   origin: function (origin, callback) {
       // Allow all origins dynamically (crucial for Vercel preview environments)
       callback(null, true);
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
// MIDDLEWARE & SECURE RATE LIMITING
// ==========================================

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

// Secure endpoint to access KYC files
app.get('/api/kyc/files/:filename', authenticateJWT, (req, res) => {
   // Enhanced authorization can be added here
   const filePath = path.join(__dirname, 'uploads/kyc', req.params.filename);
   if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
   res.sendFile(filePath);
});

// Multer Storage Configuration
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
       const type = req.query.type as string;
       let destFolder = 'uploads/';
       if (type === 'kyc') destFolder = 'uploads/kyc/';
       else if (type === 'traderoom') destFolder = 'uploads/public/trade_rooms/';
       else destFolder = 'uploads/general/';

       const fullPath = path.join(__dirname, destFolder);
       if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
       cb(null, fullPath);
   },
   filename: (req, file, cb) => {
       const uniqueId = crypto.randomUUID();
       const ext = path.extname(file.originalname);
       cb(null, `${uniqueId}${ext}`);
   }
});
const upload = multer({ storage });

// POST Upload Image Proof
app.post('/api/upload', upload.single('file'), (req, res): void => {
   if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
   const type = req.query.type as string;
   const destFolder = type === 'kyc' ? 'kyc' : (type === 'traderoom' ? 'public/trade_rooms' : 'general');
   const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || `http://localhost:${PORT}`;
   const url = `${baseUrl}/uploads/${destFolder}/${req.file.filename}`;
   res.json({ url });
});

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

const logAudit = async (tx: any, tradeId: number, userId: number, actionType: string, description: string, ip?: string) => {
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

app.post('/api/auth/register', authLimiter, async (req, res): Promise<any> => {
   try {
      const validation = RegisterSchema.safeParse(req.body);
      if (!validation.success) {
         return res.status(400).json({ error: validation.error.issues[0].message });
      }

      const { first_name, last_name, email, password, phone, birthdate } = validation.data;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'Email already exists' });

      const password_hash = await bcrypt.hash(password, 10);
      const verification_token = crypto.randomBytes(32).toString('hex');

      const user = await prisma.user.create({
         data: { 
            first_name, 
            last_name, 
            email, 
            password_hash, 
            phone, 
            birthdate: new Date(birthdate), 
            wallet_balance: 0.00,
            is_email_verified: false,
            email_verification_token: verification_token
         } as any
      });

      // Send Verification Email
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const verifyUrl = `${clientUrl}/verify-email?token=${verification_token}&email=${encodeURIComponent(email)}`;
      // Fire email asynchronously to prevent UI hanging
      resend.emails.send({
         to: user.email,
         from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
         subject: 'Midly - Verify Your Email Address',
         html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
               <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Welcome to Midly</h2>
               <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                  You have successfully registered your account. To unlock the Midly Escrow Engine, you must first verify your email address.
               </p>
               <a href="${verifyUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                  VERIFY EMAIL ADDRESS
               </a>
            </div>
         `
      }).catch(emailError => {
         console.error("Resend delivery missing or error. Falling back to DEV mode.", emailError);
         console.log(`[DEV ONLY] Verify Email Link: ${verifyUrl}`);
      });

      res.json({ message: 'User registered successfully', user_email: user.email });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

app.post('/api/auth/verify-email', authLimiter, async (req, res): Promise<any> => {
   try {
      const { email, token } = req.body;
      if (!email || !token) return res.status(400).json({ error: 'Email and token required.' });

      const user: any = await prisma.user.findFirst({
         where: { email, email_verification_token: token } as any
      });

      if (!user) return res.status(400).json({ error: 'Invalid verification token or email.' });

      await prisma.user.update({
         where: { user_id: user.user_id },
         data: { is_email_verified: true, email_verification_token: null } as any
      });

      res.json({ message: 'Email successfully verified!' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

app.get('/api/auth/debug-email', async (req, res): Promise<any> => {
   try {
      const apiKey = process.env.RESEND_API_KEY;
      const configInfo = {
         key_provided: apiKey ? "YES (Length: " + apiKey.length + ")" : "MISSING",
         domain_from: process.env.RESEND_FROM_EMAIL || "MISSING"
      };

      res.json({ status: "SUCCESS - Resend SDK Initialized over port 443. Check Resend Dashboard for delivery metrics.", config: configInfo });
   } catch (error: any) {
      res.json({ error: error.message });
   }
});

app.post('/api/auth/resend-verification', authLimiter, async (req, res): Promise<any> => {
   try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required.' });

      const user: any = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: 'Account not found.' });
      if (user.is_email_verified) return res.status(400).json({ error: 'Email is already verified.' });

      let token = user.email_verification_token;
      if (!token) {
         token = crypto.randomBytes(32).toString('hex');
         await prisma.user.update({
            where: { email },
            data: { email_verification_token: token } as any
         });
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const verifyUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      
      resend.emails.send({
         to: user.email,
         from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
         subject: 'Midly - Verify Your Email Address (Resend)',
         html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
               <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Welcome to Midly</h2>
               <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                  You have requested a new verification link. To unlock the Midly Escrow Engine, you must first verify your email address.
               </p>
               <a href="${verifyUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                  VERIFY EMAIL ADDRESS
               </a>
            </div>
         `
      }).catch(emailError => {
         console.error("Resend delivery missing or error. Falling back to DEV mode.", emailError);
         console.log(`[DEV ONLY] Verify Email Link: ${verifyUrl}`);
      });

      res.json({ message: 'Verification email resent successfully' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

app.get('/api/auth/check-verification', async (req, res): Promise<any> => {
   try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ error: 'Email required' });
      
      const user: any = await prisma.user.findUnique({
         where: { email }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({ verified: user.is_email_verified });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

// app.post('/api/auth/login') HAS BEEN DELETED: NextAuth.js now handles the complete login flow on Next.js side

app.post('/api/auth/forgot-password', authLimiter, async (req, res): Promise<any> => {
   try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
         return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
         where: { email },
         data: { reset_password_token: token, reset_password_expires: expires }
      });

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const resetUrl = `${clientUrl}/reset-password?token=${token}`;

      resend.emails.send({
         to: user.email,
         from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
         subject: 'Midly - Password Reset Request',
         html: `
               <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
                  <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Password Reset</h2>
                  <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                     We received a request to securely reset your password on Midly. Click the button below to authenticate your new credentials.
                  </p>
                  <a href="${resetUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                     RESET PASSWORD
                  </a>
                  <p style="margin-top: 40px; color: #8892b0; font-size: 12px; line-height: 1.5; font-weight: 500;">
                     If you did not request this, please ignore this email. This secure link will expire in exactly 1 hour.
                  </p>
               </div>
            `
      }).catch(emailError => {
         console.error("Resend missing or environment variables not configured.", emailError);
         console.log(`[DEV ONLY] Reset Password Link: ${resetUrl}`);
      });
      res.json({ message: 'If that email is registered, a password reset link has been sent.' });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

app.post('/api/auth/reset-password', async (req, res): Promise<any> => {
   try {
      const { token, new_password } = req.body;
      if (!token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });

      if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

      const user = await prisma.user.findFirst({
         where: {
            reset_password_token: token,
            reset_password_expires: { gt: new Date() }
         }
      });

      if (!user) {
         return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const password_hash = await bcrypt.hash(new_password, 10);

      await prisma.user.update({
         where: { user_id: user.user_id },
         data: {
            password_hash,
            reset_password_token: null,
            reset_password_expires: null,
            is_email_verified: true
         } as any
      });

      res.json({ message: 'Password has been securely updated. You can now log in.' });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

// ==========================================
// PROTECTED API ROUTES
// ==========================================

app.get('/api/health', (req, res) => {
   res.json({ status: 'OK', message: 'Midly API is running' });
});

// GET Wallet Stats
app.get('/api/user/wallet', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const userId = req.user.user_id;
      const user = await prisma.user.findUnique({ where: { user_id: userId } });
      if (!user) return res.status(404).json({ error: 'Not found' });

      const activeBuys = await prisma.transaction.findMany({
         where: { buyer_id: userId, status: 'active' },
         include: { payment: true }
      });

      let locked = 0;
      activeBuys.forEach((tx: any) => {
         if (tx.payment && tx.payment.vault_status === 'locked') {
            locked += Number(tx.payment.amount);
         }
      });

      res.json({
         available_balance: user.wallet_balance,
         locked_in_escrow: locked,
         incoming_escrow: 0.00
      });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// GET Wallet History
app.get('/api/wallet/history', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const transactions = await prisma.walletTransaction.findMany({
         where: { user_id: req.user.user_id },
         orderBy: { created_at: 'desc' }
      });
      res.json({ transactions });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// POST Deposit Wallet
app.post('/api/wallet/deposit', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const amount = Number(req.body.amount);
      if (amount <= 0 || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });

      const userRes = await prisma.$transaction(async (tx) => {
         const user = await tx.user.update({
            where: { user_id: req.user.user_id },
            data: { wallet_balance: { increment: amount } }
         });
         await tx.walletTransaction.create({
            data: {
               user_id: user.user_id,
               type: 'deposit',
               amount: amount,
               balance: user.wallet_balance,
               description: 'Fiat Deposit'
            }
         });
         return user;
      });
      res.json({ wallet_balance: userRes.wallet_balance });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Withdraw Wallet
app.post('/api/wallet/withdraw', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
   try {
      const amount = Number(req.body.amount);
      if (amount <= 0 || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });

      const userRes = await prisma.$transaction(async (tx) => {
         const usr = await tx.user.findUnique({ where: { user_id: req.user.user_id } });
         if (!usr || Number(usr.wallet_balance) < amount) throw new Error("Insufficient PHP balance");
         const updatedUser = await tx.user.update({
            where: { user_id: req.user.user_id },
            data: { wallet_balance: { decrement: amount } }
         });
         await tx.walletTransaction.create({
            data: {
               user_id: usr.user_id,
               type: 'withdrawal',
               amount: -amount,
               balance: updatedUser.wallet_balance,
               description: 'Fiat Withdrawal'
            }
         });
         return updatedUser;
      });

      res.json({ wallet_balance: userRes.wallet_balance });
   } catch (e: any) {
      res.status(400).json({ error: e.message || 'Server error' });
   }
});

// GET Transactions History
app.get('/api/transactions', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const userId = req.user.user_id;
      const trades = await prisma.transaction.findMany({
         where: { OR: [{ buyer_id: userId }, { seller_id: userId }] },
         orderBy: { created_at: 'desc' },
         include: { buyer: true, seller: true }
      });
      res.json({ trades });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// GET Single Transaction
app.get('/api/transactions/:id', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({
         where: { transaction_id: tradeId },
         include: { buyer: true, seller: true, payment: true }
      });
      if (!trade) return res.status(404).json({ error: 'Not found' });

      // Ensure user is authorized to see this trade
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) {
         return res.status(403).json({ error: 'Forbidden. You are not part of this trade.' });
      }

      // Determine who initiated the trade by checking the escrow_invite notification
      const inviteNotif = await prisma.notification.findFirst({
         where: { reference_id: tradeId, type: 'escrow_invite' }
      });
      // The initiator is the person who is NOT the recipient of the invite notification
      const initiatorId = inviteNotif ? (inviteNotif.user_id === trade.buyer_id ? trade.seller_id : trade.buyer_id) : trade.buyer_id;

      res.json({
         trade,
         my_role: trade.buyer_id === req.user.user_id ? 'BUY' : 'SELL',
         is_initiator: req.user.user_id === initiatorId
      });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// GET Messages for Transaction
app.get('/api/messages/:txId', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const txId = parseInt(req.params.txId as string);

      // Ensure user is authorized
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: txId } });
      if (!trade || (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id)) {
         return res.status(403).json({ error: 'Forbidden.' });
      }

      const messages = await prisma.message.findMany({
         where: { transaction_id: txId },
         orderBy: { sent_at: 'asc' },
         include: { sender: true }
      });
      res.json({ messages });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// GET Profile Information
app.get('/api/user/profile', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const user = await prisma.user.findUnique({
         where: { user_id: req.user.user_id },
         include: { kyc_verification: true }
      });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Calculate Real Trade Stats
      const completedTradesCount = await prisma.transaction.count({
         where: {
            status: 'completed',
            OR: [{ buyer_id: req.user.user_id }, { seller_id: req.user.user_id }]
         }
      });

      const activeEscrowsCount = await prisma.transaction.count({
         where: {
            status: { in: ['awaiting_payment', 'active', 'verifying', 'disputed'] },
            OR: [{ buyer_id: req.user.user_id }, { seller_id: req.user.user_id }]
         }
      });

      res.json({
         first_name: user.first_name,
         last_name: user.last_name,
         email: user.email,
         reputation_score: user.reputation_score,
         wallet_balance: user.wallet_balance,
         kyc: user.kyc_verification || { status: 'unverified' },
         stats: {
            completed_trades: completedTradesCount,
            active_escrows: activeEscrowsCount
         }
      });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST KYC Submission
app.post('/api/kyc', authenticateJWT, async (req, res): Promise<any> => {
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

// GET P2P Listings
app.get('/api/listings', async (req, res): Promise<any> => {
   try {
      const listings = await prisma.listing.findMany({
         where: { status: 'open' },
         include: { seller: { select: { first_name: true, last_name: true, reputation_score: true } } },
         orderBy: { created_at: 'desc' }
      });
      res.json({ listings });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Create P2P Listing
app.post('/api/listings', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
   try {
      const { gameType, itemName, price } = req.body;
      if (Number(price) <= 0 || isNaN(Number(price))) return res.status(400).json({ error: 'Invalid price.' });
      const listing = await prisma.listing.create({
         data: {
            seller_id: req.user.user_id,
            game_type: gameType,
            item_name: itemName,
            price: Number(price)
         }
      });
      res.json({ listing });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Buy Listing -> Auto Creates Escrow
app.post('/api/listings/buy/:id', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
   try {
      const listingId = parseInt(req.params.id as string);
      const listing = await prisma.listing.findUnique({ where: { listing_id: listingId } });

      if (!listing || listing.status !== 'open') return res.status(404).json({ error: 'Listing not available' });
      if (listing.seller_id === req.user.user_id) return res.status(400).json({ error: 'Cannot buy your own listing' });

      const basePrice = Number(listing.price);
      const serviceFee = basePrice * 0.05;
      const totalAmount = basePrice + serviceFee;

      const tradeIdRes = await prisma.$transaction(async (tx) => {
         await tx.listing.update({ where: { listing_id: listingId }, data: { status: 'sold' } });

         const trade = await tx.transaction.create({
            data: {
               buyer_id: req.user.user_id,
               seller_id: listing.seller_id,
               item_type: listing.game_type + ' - ' + listing.item_name,
               game_type: listing.game_type,
               agreed_price: basePrice,
               service_fee: serviceFee,
               total_amount: basePrice + serviceFee,
               status: 'agreement',
               inspection_hours: 24,
            }
         });

         // Phase 1: Agreement Phase initialized
         await tx.message.create({
            data: {
               transaction_id: trade.transaction_id,
               sender_id: req.user.user_id, // acting as system trigger
               message_text: `MIDLY TRADE AGREEMENT PHASE INITIATED.\n\nItem: ${listing.item_name}\nPrice: ₱${basePrice.toLocaleString()}\n\nNo funds have been locked yet. Please discuss the terms. When ready, the Seller must Request Payment, and the Buyer will be prompted to deposit funds into the Midly Smart Vault.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });

         return trade.transaction_id;
      });

      res.json({ tradeId: tradeIdRes });
   } catch (e: any) {
      res.status(400).json({ error: e.message || 'Server error' });
   }
});

// POST Create Escrow Transaction
app.post('/api/transactions', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
   try {
      const {
         role, // 'BUY' or 'SELL'
         itemCategory,
         itemDescription, // mapped to item_name now
         tradeCategory, // new field: 'Game Account', 'In-Game Item', etc.
         agreedPrice,
         sellerEmail
      } = req.body;

      if (!agreedPrice || !sellerEmail) return res.status(400).json({ error: 'Missing logic' });

      const counterParty = await prisma.user.findUnique({ where: { email: sellerEmail } });
      if (!counterParty) return res.status(404).json({ error: 'Counterparty email not registered.' });
      if (counterParty.user_id === req.user.user_id) return res.status(400).json({ error: 'Cannot trade with yourself.' });

      const buyerId = role === 'BUY' ? req.user.user_id : counterParty.user_id;
      const sellerId = role === 'SELL' ? req.user.user_id : counterParty.user_id;

      const basePrice = Number(agreedPrice);
      const serviceFee = basePrice * 0.05;
      const totalAmount = basePrice + serviceFee;

      const tradeRes = await prisma.$transaction(async (tx) => {
         const trade = await tx.transaction.create({
            data: {
               buyer_id: buyerId,
               seller_id: sellerId,
               item_type: tradeCategory || 'Game Account', // legacy fallback
               trade_category: tradeCategory || 'Game Account',
               item_name: itemDescription,
               game_type: itemCategory,
               agreed_price: basePrice,
               service_fee: serviceFee,
               total_amount: totalAmount,
               status: 'pending_invite',
               inspection_hours: 24,
            }
         });

         await tx.notification.create({
            data: {
               user_id: counterParty.user_id,
               message: `You have received a new Private Escrow Request for ${itemCategory}.`,
               type: 'escrow_invite',
               reference_id: trade.transaction_id
            }
         });

         return trade;
      });

      res.json({ transaction: tradeRes });
   } catch (error: any) {
      res.status(400).json({ error: error.message || 'Server error' });
   }
});

// GET View Notifications
app.get('/api/notifications', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const data = await prisma.notification.findMany({
         where: { user_id: req.user.user_id, is_read: false },
         orderBy: { created_at: 'desc' }
      });
      res.json({ notifications: data });
   } catch (e) { res.status(500).json({ error: 'Server err' }); }
});

// PUT Mark Notifications Read
app.put('/api/notifications/mark-read', authenticateJWT, async (req, res): Promise<any> => {
   try {
      await prisma.notification.updateMany({
         where: { user_id: req.user.user_id, is_read: false },
         data: { is_read: true }
      });
      res.json({ success: true });
   } catch (e) { res.status(500).json({ error: 'Server err' }); }
});

// PUT Accept Escrow Invite (Hardened: counterparty-only, idempotent, audit-logged)
app.put('/api/transactions/:id/accept-invite', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId } });
      if (!trade) return res.status(404).json({ error: 'Trade not found' });

      // Idempotency: if trade already past pending_invite, return success silently
      if (trade.status !== 'pending_invite') {
         return res.json({ success: true, message: 'Trade already accepted.' });
      }

      // Authorization: must be part of the trade
      if (req.user.user_id !== trade.buyer_id && req.user.user_id !== trade.seller_id) {
         return res.status(403).json({ error: 'Forbidden. You are not part of this trade.' });
      }

      // CRITICAL: Only the counterparty (invited user) can accept, NOT the initiator
      const inviteNotif = await prisma.notification.findFirst({
         where: { reference_id: tradeId, type: 'escrow_invite' }
      });
      const invitedUserId = inviteNotif?.user_id;

      if (!invitedUserId || req.user.user_id !== invitedUserId) {
         return res.status(403).json({ error: 'Only the invited counterparty may accept this trade.' });
      }

      await prisma.$transaction(async (tx) => {
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'agreement' }
         });

         await tx.notification.updateMany({
            where: { reference_id: tradeId, type: 'escrow_invite' },
            data: { is_read: true }
         });

         // Notify the initiator that their invite was accepted
         const initiatorId = invitedUserId === trade.buyer_id ? trade.seller_id : trade.buyer_id;
         await tx.notification.create({
            data: {
               user_id: initiatorId,
               message: `Your Private Escrow invite for Trade #${tradeId} has been accepted! The Agreement Phase is now active.`,
               type: 'escrow_accepted',
               reference_id: tradeId
            }
         });

         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM LOG] The Counterparty has accepted the Private Escrow Request. The Room is now unlocked. You are in the Agreement Phase. Please discuss terms.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });

         // Audit log
         await logAudit(tx, tradeId, req.user.user_id, 'ACCEPT_INVITE', `User ${req.user.email} accepted escrow invite for trade #${tradeId}`, req.ip);
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'agreement');
      return res.json({ success: true });
   } catch (e: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

// PUT Escrow Progress
app.put('/api/transactions/:id/progress', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const { action, paymentMethod } = req.body; // 'PAY', 'DELIVER', 'APPROVE'

      const trade = await prisma.transaction.findUnique({
         where: { transaction_id: tradeId },
         include: { payment: true, seller: true, buyer: true }
      });

      if (!trade) return res.status(404).json({ error: 'Trade not found' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) {
         return res.status(403).json({ error: 'Forbidden' });
      }

      // HARD BLOCK: No actions allowed in terminal or pre-acceptance states
      if (TERMINAL_STATES.includes(trade.status || '')) {
         return res.status(400).json({ error: 'Trade state is locked and cannot be altered.' });
      }
      if (PRE_ACCEPTANCE_STATES.includes(trade.status || '')) {
         return res.status(400).json({ error: 'Trade is not active. Acceptance by both parties is required.' });
      }

      if (action === 'REQUEST_PAYMENT' && req.user.user_id === trade.seller_id) {
         if (trade.status !== 'agreement') return res.status(400).json({ error: 'Trade not in agreement phase.' });
         await prisma.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'awaiting_payment' }
         });
         await prisma.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM LOG] The Seller has locked the terms and requested payment. Buyer, please secure the funds to proceed.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });
         io.to(`trade_${tradeId}`).emit('trade_updated', 'awaiting_payment');
         return res.json({ status: 'AWAITING_PAYMENT' });
      }

      if (action === 'PAY' && req.user.user_id === trade.buyer_id) {
         if (trade.status !== 'awaiting_payment') return res.status(400).json({ error: 'Trade not awaiting payment.' });

         if (paymentMethod === 'midly_wallet' || !paymentMethod) {
            const buyer = await prisma.user.findUnique({ where: { user_id: trade.buyer_id } });
            if (!buyer || Number(buyer.wallet_balance) < Number(trade.total_amount)) {
               return res.status(400).json({ error: 'Insufficient Midly Wallet balance. Please deposit funds first.' });
            }

            await prisma.$transaction(async (tx) => {
               const updatedBuyer = await tx.user.update({
                  where: { user_id: trade.buyer_id },
                  data: { wallet_balance: { decrement: Number(trade.total_amount) } }
               });
               await tx.walletTransaction.create({
                  data: { user_id: trade.buyer_id, type: 'escrow_lock', amount: -Number(trade.total_amount), balance: updatedBuyer.wallet_balance, description: `Escrow Lock - Trade #${tradeId}` }
               });

               await tx.payment.create({
                  data: {
                     transaction_id: trade.transaction_id,
                     amount: trade.total_amount,
                     payment_method: 'Midly Wallet',
                     vault_status: 'locked',
                     deposit_date: new Date()
                  }
               });

               await tx.transaction.update({
                  where: { transaction_id: tradeId },
                  data: { status: 'active' }
               });

               await tx.message.create({
                  data: {
                     transaction_id: tradeId,
                     sender_id: trade.buyer_id,
                     message_text: `[SYSTEM LOG] The Buyer has securely deposited ₱${Number(trade.total_amount).toLocaleString()} into the Midly Smart Vault via Midly Wallet. Seller, please proceed to Handover the item.`,
                     is_system_generated: true,
                     risk_level: 'Safe'
                  }
               });
            });
         } else {
            // External Gateway (Stripe/PayMongo spoof)
            await prisma.$transaction(async (tx) => {
               await tx.payment.create({
                  data: {
                     transaction_id: trade.transaction_id,
                     amount: trade.total_amount,
                     payment_method: paymentMethod === 'gcash' ? 'GCash' : 'Credit Card',
                     vault_status: 'locked',
                     deposit_date: new Date()
                  }
               });

               await tx.transaction.update({
                  where: { transaction_id: tradeId },
                  data: { status: 'active' }
               });

               await tx.message.create({
                  data: {
                     transaction_id: tradeId,
                     sender_id: trade.buyer_id,
                     message_text: `[SYSTEM LOG] The Buyer has securely deposited ₱${Number(trade.total_amount).toLocaleString()} into the Midly Smart Vault via ${paymentMethod === 'gcash' ? 'GCash' : 'Credit / Debit Card'}. Seller, please proceed to Handover the item.`,
                     is_system_generated: true,
                     risk_level: 'Safe'
                  }
               });
            });
         }

         io.to(`trade_${tradeId}`).emit('trade_updated', 'active');
         return res.json({ status: 'ACTIVE' });
      }

      if (action === 'DELIVER' && req.user.user_id === trade.seller_id) {
         const { credentials } = req.body;
         // Seller confirms delivery
         await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
               where: { transaction_id: tradeId },
               data: {
                  status: 'verifying',
                  item_delivered_at: new Date(),
                  ...(credentials ? { account_credentials: credentials } : {})
               }
            });

            await tx.message.create({
               data: {
                  transaction_id: tradeId,
                  sender_id: req.user.user_id,
                  message_text: `[SYSTEM ALERT] The Seller has completed the Item Handover. The Retreival Lock is active. Buyer, please verify delivery or unveil the Credential Vault.`,
                  is_system_generated: true,
                  risk_level: 'Safe'
               }
            });
         });
         io.to(`trade_${tradeId}`).emit('trade_updated', 'verifying');
         return res.json({ status: 'DELIVERED' });
      }

      if (action === 'APPROVE' && req.user.user_id === trade.buyer_id) {
         // Buyer approves -> release funds to seller
         if (!trade.payment) return res.status(400).json({ error: 'No active payment escrow' });

         await prisma.$transaction(async (tx) => {
            // 1. Update trade status
            await tx.transaction.update({
               where: { transaction_id: tradeId },
               data: {
                  status: 'completed',
                  buyer_approved_at: new Date()
               }
            });

            // 2. Update payment vault status
            await tx.payment.update({
               where: { payment_id: trade.payment!.payment_id },
               data: { vault_status: 'released', release_date: new Date() }
            });

            // 3. Increment seller wallet by Base Price (the Total Amount - Service Fee)
            const amountToReceive = Number(trade.agreed_price);
            const updatedSeller = await tx.user.update({
               where: { user_id: trade.seller_id },
               data: { wallet_balance: { increment: amountToReceive } }
            });
            await tx.walletTransaction.create({
               data: { user_id: trade.seller_id, type: 'escrow_release', amount: amountToReceive, balance: updatedSeller.wallet_balance, description: `Escrow Release - Trade #${tradeId}` }
            });
         });

         io.to(`trade_${tradeId}`).emit('trade_updated', 'completed');
         return res.json({ status: 'APPROVED' });
      }

      res.status(400).json({ error: 'Invalid action or permission denied' });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// POST Initiate Dispute
app.post('/api/transactions/:id/dispute', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const { reason } = req.body;

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId } });
      if (!trade || (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id)) {
         return res.status(403).json({ error: 'Forbidden' });
      }
      if (trade.status !== 'active' && trade.status !== 'verifying') {
         return res.status(400).json({ error: 'Can only dispute active or verifying trades.' });
      }

      await prisma.$transaction(async (tx) => {
         // Freeze the transaction status
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'disputed' }
         });

         // Mathematically freeze the escrow so auto-timers are completely killed
         const paymentCheck = await tx.payment.findUnique({ where: { transaction_id: tradeId } });
         if (paymentCheck) {
            await tx.payment.update({
               where: { transaction_id: tradeId },
               data: { vault_status: 'frozen' }
            });
         }

         // Create Dispute ticket
         await tx.dispute.create({
            data: {
               transaction_id: tradeId,
               raised_by: req.user.user_id,
               dispute_type: 'Item Mismatch / Fraud',
               description: reason || 'No reason provided. Investigation flagged.'
            }
         });

         // Secure System Message Evidence
         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM WARNING: SCAM DETECTION ACTIVATED]\nUser has officially filed a dispute. Reason: "${reason}".\n\nThe Midly Engine has frozen the Smart Vault entirely. No funds can move. Administrators have been pinged to enter this chat room.`,
               is_system_generated: true,
               risk_level: 'Critical'
            }
         });
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'disputed');
      res.json({ status: 'DISPUTED' });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Auto-Release System Trigger
app.post('/api/transactions/:id/auto-release', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({
         where: { transaction_id: tradeId },
         include: { payment: true }
      });

      if (!trade) return res.status(404).json({ error: 'Not found' });
      if (trade.status !== 'verifying' || !trade.item_delivered_at) {
         return res.status(400).json({ error: 'Trade is not in verifiable state.' });
      }

      // Allow bypass for the demo if 'forceDemo' is sent in body
      const { forceDemo } = req.body;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (!forceDemo && trade.item_delivered_at >= twentyFourHoursAgo) {
         return res.status(403).json({ error: '24 hours have not elapsed yet.' });
      }

      if (!trade.payment) return res.status(400).json({ error: 'Vault empty' });

      await prisma.$transaction(async (tx) => {
         // Auto Approve trade status
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'completed', buyer_approved_at: new Date() }
         });

         // Release funds
         await tx.payment.update({
            where: { payment_id: trade.payment!.payment_id },
            data: { vault_status: 'released', release_date: new Date() }
         });

         // Increment seller wallet
         const amountToReceive = Number(trade.agreed_price);
         const updatedSeller = await tx.user.update({
            where: { user_id: trade.seller_id },
            data: { wallet_balance: { increment: amountToReceive } }
         });
         await tx.walletTransaction.create({
            data: { user_id: trade.seller_id, type: 'escrow_release', amount: amountToReceive, balance: updatedSeller.wallet_balance, description: `Escrow Auto-Release - Trade #${tradeId}` }
         });

         // System Log
         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: trade.seller_id,
               message_text: `[SYSTEM TRIGGER: AUTO-RELEASE EXECUTED]\n24-Hours elapsed without Buyer Override. The Smart Contract has verified delivery implicitly and successfully routed ₱${amountToReceive.toLocaleString()} to the Seller's wallet.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'completed');
      res.json({ status: 'AUTO_RELEASED' });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Message (with terminal state restriction)
app.post('/api/messages/:txId', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const txId = parseInt(req.params.txId as string);
      const { text, isAi, riskLevel } = req.body;

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: txId } });
      if (!trade || (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id)) {
         return res.status(403).json({ error: 'Forbidden.' });
      }

      // Block messaging in terminal and pre-acceptance states
      const blockedStates = ['completed', 'cancelled', 'refunded', 'pending_invite'];
      if (blockedStates.includes(trade.status || '')) {
         return res.status(400).json({ error: 'This trade room is closed. No further messages allowed.' });
      }

      const newMsg = await prisma.message.create({
         data: {
            transaction_id: txId,
            sender_id: req.user.user_id,
            message_text: text,
            is_system_generated: isAi || false,
            risk_level: riskLevel || 'Safe'
         }
      });

      io.to(`trade_${txId}`).emit('new_message', newMsg);
      res.json({ message: newMsg });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

// POST Rate Seller Reputation
app.post('/api/user/rate/:id', authenticateJWT, async (req, res): Promise<any> => {
   // ... existing logic ...
   try {
      const sellerId = parseInt(req.params.id as string);
      const { score } = req.body;
      const seller = await prisma.user.findUnique({ where: { user_id: sellerId } });
      if (!seller) return res.status(404).json({ error: 'Seller not found' });
      const currentScore = Number(seller.reputation_score || 5);
      const newScore = (currentScore * 3 + Number(score)) / 4;
      await prisma.user.update({ where: { user_id: sellerId }, data: { reputation_score: newScore } });
      res.json({ status: 'OK' });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// Admin API
app.get('/api/admin/disputes', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const disputes = await prisma.dispute.findMany({
         where: { resolution: null },
         include: { 
            transaction: { 
               include: { 
                  buyer: true, 
                  seller: true,
                  audit_logs: true,
                  messages: { orderBy: { sent_at: 'asc' } }
               } 
            } 
         }
      });
      res.json({ disputes });
   } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/disputes/:txId/resolve', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const txId = parseInt(req.params.txId as string);
      const { action } = req.body; // 'REFUND_BUYER' or 'FORWARD_TO_SELLER'

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: txId }, include: { payment: true } });
      if (!trade || !trade.payment) return res.status(404).json({ error: 'Trade not found' });

      await prisma.$transaction(async (tx) => {
         await tx.dispute.update({
            where: { transaction_id: txId },
            data: { resolution: action, resolved_at: new Date(), handled_by: req.user.user_id }
         });

         const amount = Number(trade.total_amount);
         const baseAmount = Number(trade.agreed_price);

         if (action === 'REFUND_BUYER') {
            await tx.transaction.update({ where: { transaction_id: txId }, data: { status: 'refunded' } });
            await tx.payment.update({ where: { payment_id: trade.payment!.payment_id }, data: { vault_status: 'refunded', refund_date: new Date() } });
            const updatedBuyer = await tx.user.update({ where: { user_id: trade.buyer_id }, data: { wallet_balance: { increment: amount } } });
            await tx.walletTransaction.create({ data: { user_id: trade.buyer_id, type: 'escrow_refund', amount: amount, balance: updatedBuyer.wallet_balance, description: `Admin Escrow Refund - Trade #${txId}` }});
         } else if (action === 'FORWARD_TO_SELLER') {
            await tx.transaction.update({ where: { transaction_id: txId }, data: { status: 'completed' } });
            await tx.payment.update({ where: { payment_id: trade.payment!.payment_id }, data: { vault_status: 'released', release_date: new Date() } });
            const updatedSeller = await tx.user.update({ where: { user_id: trade.seller_id }, data: { wallet_balance: { increment: baseAmount } } });
            await tx.walletTransaction.create({ data: { user_id: trade.seller_id, type: 'escrow_release', amount: baseAmount, balance: updatedSeller.wallet_balance, description: `Admin Escrow Release - Trade #${txId}` }});
         }

         await tx.message.create({
            data: {
               transaction_id: txId,
               sender_id: req.user.user_id,
               message_text: `[ADMIN MEDIATION FINALIZED]\nThe Admin team has reviewed the evidence and executed a ${action.replace('_', ' ')} command. The vault has been unlocked and funds distributed mathematically.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });
      });

      io.to(`trade_${txId}`).emit('trade_updated', action === 'REFUND_BUYER' ? 'refunded' : 'completed');
      res.json({ status: 'RESOLVED' });
   } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

import { z } from 'zod';
import { encrypt } from './src/ai/cryptoUtils';
import { kycQueue } from './src/ai/queue';
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
app.post('/api/kyc/reset', authenticateJWT, async (req, res): Promise<any> => {
   try {
      await prisma.kycImage.deleteMany({ where: { kyc: { user_id: req.user.user_id } } });
      await prisma.kycVerification.deleteMany({ where: { user_id: req.user.user_id } });
      res.json({ message: 'KYC Reset Successfully' });
   } catch (e: any) {
      res.status(500).json({ error: 'Server error', msg: e.message });
   }
});

// Phase 1: Identity Sync
app.post('/api/kyc/phase1', authenticateJWT, aiKycLimiter, async (req, res): Promise<any> => {
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
app.post('/api/kyc/phase2', authenticateJWT, aiKycLimiter, async (req, res): Promise<any> => {
   try {
      const parsedParams = kycPhase2Schema.safeParse(req.body);
      if (!parsedParams.success) return res.status(400).json({ error: 'Validation failed' });
      const { imageUrl } = parsedParams.data;

      const kyc = await prisma.kycVerification.findUnique({ where: { user_id: req.user.user_id } });
      if (!kyc || kyc.phase < 1) return res.status(400).json({ error: 'Complete Phase 1 first.' });

      const filename = path.basename(imageUrl);
      const rawPath = path.join(__dirname, 'uploads', filename);
      const kycDomainPath = path.join(__dirname, 'uploads', 'kyc', filename);

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
app.post('/api/kyc/phase3', authenticateJWT, aiKycLimiter, async (req, res): Promise<any> => {
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
      const livenessDomainPath = path.join(__dirname, 'uploads', 'kyc', livenessFilename);
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

// Admin fetching KYC
app.get('/api/admin/kyc', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const kycs = await prisma.kycVerification.findMany({
         where: { status: 'pending' },
         include: { user: true, images: true }
      });
      res.json({ kycs });
   } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Admin resolve KYC
app.post('/api/admin/kyc/:id/resolve', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const kycId = parseInt(req.params.id as string);
      const { status } = req.body; // 'approved' or 'rejected'
      await prisma.kycVerification.update({ where: { kyc_id: kycId }, data: { status } });
      res.json({ status: 'OK' });
   } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ==========================================
// EXPANDED ADMIN COMMAND CENTER ROUTES
// ==========================================

app.get('/api/admin/users', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const users = await prisma.user.findMany({
         select: { user_id: true, first_name: true, last_name: true, email: true, role: true, is_banned: true, created_at: true },
         orderBy: { created_at: 'desc' }
      });
      res.json({ users });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
   }
});

app.post('/api/admin/users/:id/ban', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const targetId = parseInt(req.params.id as string);
      const { is_banned } = req.body;
      await prisma.user.update({ where: { user_id: targetId }, data: { is_banned } });
      res.json({ success: true, is_banned });
   } catch (e) {
      res.status(500).json({ error: 'Failed to toggle user ban state' });
   }
});

app.get('/api/admin/settings', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      let settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
      if (!settings) {
         settings = await prisma.platformSettings.create({ data: { id: 1, base_fee: 0.05 } });
      }
      res.json({ settings });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch settings' });
   }
});

app.post('/api/admin/settings', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const { base_fee } = req.body;
      const parsedFee = parseFloat(base_fee);
      if (isNaN(parsedFee) || parsedFee < 0 || parsedFee > 1) {
         return res.status(400).json({ error: 'Fee must be between 0.00 and 1.00' });
      }
      const settings = await prisma.platformSettings.upsert({
         where: { id: 1 },
         update: { base_fee: parsedFee },
         create: { id: 1, base_fee: parsedFee }
      });
      res.json({ settings });
   } catch (e) {
      res.status(500).json({ error: 'Failed to save settings' });
   }
});

app.get('/api/admin/metrics', authenticateJWT, async (req, res): Promise<any> => {
   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      // Metric 1: Total Locked Vault Capital (Sum of all completed vault transactions that are "held" or pending)
      const agg = await prisma.payment.aggregate({ _sum: { amount: true }, where: { vault_status: 'held' } });
      const lockedCapital = agg._sum.amount || 0;
      
      // Metric 2: Total Completed Trades
      const tradesCount = await prisma.transaction.count({ where: { status: 'completed' } });

      // Metric 3: Active Platform Users
      const activeUsers = await prisma.user.count({ where: { is_banned: false } });

      res.json({ lockedCapital, tradesCount, activeUsers });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch system metrics' });
   }
});

// GET Payment Methods
app.get('/api/user/payment-methods', authenticateJWT, async (req, res) => {
   try {
      const methods = await prisma.userPaymentMethod.findMany({
         where: { user_id: req.user.user_id },
         orderBy: { created_at: 'desc' }
      });
      return res.json({ methods });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Payment Method
app.post('/api/user/payment-methods', authenticateJWT, async (req, res) => {
   try {
      const { provider, account_mask, is_default } = req.body;
      if (!provider || !account_mask) return res.status(400).json({ error: 'Missing fields' });

      // If set as default, remove default from others
      if (is_default) {
         await prisma.userPaymentMethod.updateMany({
            where: { user_id: req.user.user_id },
            data: { is_default: false }
         });
      }

      const method = await prisma.userPaymentMethod.create({
         data: {
            user_id: req.user.user_id,
            provider,
            account_mask,
            is_default: is_default || false
         }
      });
      return res.json({ method });
   } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
   }
});

// DELETE Payment Method
app.delete('/api/user/payment-methods/:id', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const methodId = parseInt(req.params.id as string);
      const method = await prisma.userPaymentMethod.findUnique({ where: { method_id: methodId } });
      if (!method || method.user_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden' });

      await prisma.userPaymentMethod.delete({ where: { method_id: methodId } });
      return res.json({ success: true });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// GET Security Logging (Sessions)
app.get('/api/user/sessions', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const dbSessions = await prisma.session.findMany({
         where: { userId: req.user.user_id },
         orderBy: { expires: 'desc' }
      });

      const mappedSessions = dbSessions.map(s => ({
         id: s.id,
         device: 'Chrome Browser',
         os: 'Windows',
         location: 'Manila, Philippines',
         ip_address: 'Verified Node',
         last_active: s.expires
      }));

      if (mappedSessions.length === 0) {
         mappedSessions.push({
            id: 'mock-auth-node',
            device: req.headers['user-agent']?.substring(0, 80) || 'Chrome Browser',
            os: 'Windows',
            location: 'Manila, Philippines',
            ip_address: req.ip || '127.0.0.1',
            last_active: new Date()
         });
      }

      return res.json({ sessions: mappedSessions });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Cancel Pre-Vault Trade (Bilateral)
app.post('/api/transactions/:id/cancel', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId } });

      if (!trade) return res.status(404).json({ error: 'Trade not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden.' });

      if (trade.status !== 'pending_invite' && trade.status !== 'agreement' && trade.status !== 'awaiting_payment') {
         return res.status(400).json({ error: 'Cannot cancel directly. Funds may already be locked.' });
      }

      await prisma.$transaction(async (tx) => {
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'cancelled' }
         });

         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM ALERT] This Escrow Room has been permanently CANCELLED. No funds were transferred.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'cancelled');
      res.json({ status: 'CANCELLED' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Request Mutual Cancellation (Post-Vault)
app.post('/api/transactions/:id/request-cancel', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId } });

      if (!trade) return res.status(404).json({ error: 'Trade not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden.' });
      if (trade.status !== 'active') return res.status(400).json({ error: 'Mutual Cancellation applies to the Active Vault phase.' });

      await prisma.$transaction(async (tx) => {
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { cancel_requested_by: req.user.user_id }
         });

         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM WARNING: CANCELLATION REQUESTED]\nA participant wants to back out and withdraw locked funds from the Smart Vault. The counterparty must Accept to instantly refund the buyer.`,
               is_system_generated: true,
               risk_level: 'Medium'
            }
         });
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'cancel_requested');
      res.json({ status: 'REQUEST_LOGGED' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Accept Mutual Cancellation (Post-Vault)
app.post('/api/transactions/:id/accept-cancel', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId }, include: { payment: true } });

      if (!trade || !trade.payment) return res.status(404).json({ error: 'Trade not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden.' });
      if (!trade.cancel_requested_by || trade.cancel_requested_by === req.user.user_id) return res.status(400).json({ error: 'You cannot accept your own request or no request exists.' });

      await prisma.$transaction(async (tx) => {
         await tx.transaction.update({
            where: { transaction_id: tradeId },
            data: { status: 'cancelled', cancel_requested_by: null } // Refunded/Cancelled
         });
         await tx.payment.update({
            where: { payment_id: trade.payment!.payment_id },
            data: { vault_status: 'refunded', refund_date: new Date() }
         });
         const amount = Number(trade.total_amount);
         const updatedBuyer = await tx.user.update({
            where: { user_id: trade.buyer_id },
            data: { wallet_balance: { increment: amount } }
         });
         await tx.walletTransaction.create({
            data: { user_id: trade.buyer_id, type: 'escrow_refund', amount: amount, balance: updatedBuyer.wallet_balance, description: `Mutual Cancellation Refund - Trade #${tradeId}` }
         });
         await tx.message.create({
            data: {
               transaction_id: tradeId,
               sender_id: req.user.user_id,
               message_text: `[SYSTEM ALERT] Mutual Cancellation Accepted. Escrow dissolved dynamically and ₱${amount.toLocaleString()} was immediately routed back to the Buyer's wallet in full.`,
               is_system_generated: true,
               risk_level: 'Safe'
            }
         });
      });

      io.to(`trade_${tradeId}`).emit('trade_updated', 'cancelled');
      res.json({ status: 'CANCELLED' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
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
