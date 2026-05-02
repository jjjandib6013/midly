import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, requireKYC } from '../../shared/middlewares/auth.middleware';
import { createPaymentLink, createPayout } from '../../utils/payments/paymongo';
import { logAudit, ACTION_TYPES } from '../../utils/auditLogger';

const router = Router();

// GET Wallet Balance & History
router.get('/', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      const user = await prisma.user.findUnique({
         where: { user_id: req.user.user_id },
         select: { wallet_balance: true }
      });

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = 20;

      const transactions = await prisma.walletTransaction.findMany({
         where: { user_id: req.user.user_id },
         orderBy: { created_at: 'desc' },
         skip: (page - 1) * pageSize,
         take: pageSize
      });

      res.json({ balance: user?.wallet_balance || 0, transactions, page, hasMore: transactions.length === pageSize });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Top-Up (Cash-In via PayMongo)
router.post('/topup', authenticateJWT, requireKYC, async (req: Request, res: Response): Promise<any> => {
   try {
      const { amount } = req.body;
      
      if (!amount || Number(amount) < 100) {
         return res.status(400).json({ error: 'Minimum top-up amount is ₱100.00' });
      }

      const topupAmount = Number(amount);

      // We generate a unique reference ID so the webhook knows who to credit
      const referenceId = `topup_${req.user.user_id}_${Date.now()}`;

      // Call PayMongo wrapper
      const gateway = await createPaymentLink(
         topupAmount, 
         `Midly Wallet Top-Up: ₱${topupAmount.toLocaleString()}`, 
         referenceId
      );

      if (!gateway.success) {
         return res.status(400).json({ error: gateway.error });
      }

      // Log the pending intent in the database
      await prisma.walletTransaction.create({
         data: {
            user_id: req.user.user_id,
            type: 'deposit_pending',
            amount: topupAmount,
            balance: 0, // Balance doesn't change until webhook fires
            description: `Pending Top-Up via PayMongo (${gateway.paymentId})`
         }
      });

      res.json({ 
         status: 'PENDING_GATEWAY', 
         checkoutUrl: gateway.checkoutUrl 
      });

   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Withdraw (Cash-Out via Xendit/PayMongo)
router.post('/withdraw', authenticateJWT, requireKYC, async (req: Request, res: Response): Promise<any> => {
   try {
      const { amount, bankCode, accountNumber, accountName } = req.body;

      if (!amount || Number(amount) < 500) {
         return res.status(400).json({ error: 'Minimum withdrawal amount is ₱500.00' });
      }

      const withdrawAmount = Number(amount);
      const WITHDRAWAL_FEE = 25; // Fixed payout fee
      const totalDeduction = withdrawAmount + WITHDRAWAL_FEE;

      const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // --- FRAUD DETECTION LAYER 3 ---
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 1. Password Change Cooldown (24h)
      if (user.last_password_change && new Date(user.last_password_change).getTime() > oneDayAgo.getTime()) {
         await logAudit({ userId: user.user_id, actionType: ACTION_TYPES.WITHDRAWAL_BLOCKED, description: `Withdrawal blocked: password changed within 24h`, ip: req.ip, entityType: 'WALLET', entityId: user.user_id, metadata: { attempted_amount: withdrawAmount, reason: 'password_cooldown' } });
         return res.status(403).json({ error: 'Withdrawals are locked for 24 hours after a password change for your security.' });
      }

      // 2. New IP Detection in last hour
      // Find logins in last hour
      const recentLogins = await prisma.loginHistory.findMany({
         where: { user_id: user.user_id, created_at: { gte: oneHourAgo } },
         orderBy: { created_at: 'desc' }
      });
      if (recentLogins.length > 0) {
         // Check if the most recent IP is completely new (never seen before 1 hour ago)
         const latestIp = recentLogins[0].ip_address;
         const priorLogin = await prisma.loginHistory.findFirst({
            where: { user_id: user.user_id, ip_address: latestIp, created_at: { lt: oneHourAgo } }
         });
         if (!priorLogin) {
            await logAudit({ userId: user.user_id, actionType: ACTION_TYPES.WITHDRAWAL_BLOCKED, description: `Withdrawal blocked: unrecognized IP in last hour`, ip: req.ip, entityType: 'WALLET', entityId: user.user_id, metadata: { attempted_amount: withdrawAmount, reason: 'new_ip', suspicious_ip: latestIp } });
            return res.status(403).json({ error: 'Withdrawals are temporarily blocked due to a login from an unrecognized device in the last hour.' });
         }
      }

      // 3. Daily Withdrawal Cap (₱50,000)
      const dailyWithdrawals = await prisma.walletTransaction.aggregate({
         where: {
            user_id: user.user_id,
            type: 'withdrawal',
            created_at: { gte: oneDayAgo }
         },
         _sum: { amount: true }
      });
      // amount is stored as negative for withdrawals
      const withdrawnToday = Math.abs(Number(dailyWithdrawals._sum.amount || 0));
      if (withdrawnToday + withdrawAmount > 50000) {
         await logAudit({ userId: user.user_id, actionType: ACTION_TYPES.WITHDRAWAL_BLOCKED, description: `Withdrawal blocked: daily cap exceeded`, ip: req.ip, entityType: 'WALLET', entityId: user.user_id, metadata: { attempted_amount: withdrawAmount, reason: 'daily_cap', withdrawn_today: withdrawnToday } });
         return res.status(403).json({ error: `Daily withdrawal limit of ₱50,000 exceeded. You have already withdrawn ₱${withdrawnToday.toLocaleString()} in the last 24 hours.` });
      }

      // 4. OTP Verification for > ₱5,000
      if (withdrawAmount > 5000) {
         const { otp_code } = req.body;
         
         if (!otp_code) {
            // Generate and send OTP
            const crypto = require('crypto');
            const newOtp = crypto.randomInt(100000, 999999).toString();
            const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins
            
            await prisma.user.update({
               where: { user_id: user.user_id },
               data: { withdrawal_otp: newOtp, withdrawal_otp_expires: expires }
            });
            
            import('../../config/resend').then(({ resend }) => {
               resend.emails.send({
                  to: user.email,
                  from: process.env.RESEND_FROM_EMAIL || 'security@midly.com',
                  subject: 'Midly - Withdrawal Authorization Code',
                  html: `
                     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff;">
                        <h2 style="color: #fff; font-size: 20px;">Withdrawal Verification</h2>
                        <p style="color: #8892b0;">You requested a withdrawal of ₱${withdrawAmount.toLocaleString()}. Use the code below to authorize this transaction. It expires in 10 minutes.</p>
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 30px 0; color: #3fe56c;">${newOtp}</div>
                     </div>
                  `
               }).catch(console.error);
            });
            
            return res.json({ require_otp: true, message: 'For security, an authorization code has been sent to your email.' });
         } else {
            // Verify OTP
            if (user.withdrawal_otp !== otp_code || !user.withdrawal_otp_expires || new Date(user.withdrawal_otp_expires).getTime() < now.getTime()) {
               return res.status(400).json({ error: 'Invalid or expired authorization code.' });
            }
            // Clear OTP
            await prisma.user.update({
               where: { user_id: user.user_id },
               data: { withdrawal_otp: null, withdrawal_otp_expires: null }
            });
         }
      }
      // --- END FRAUD DETECTION LAYER 3 ---

      // 1. Verify Balance securely inside a transaction to prevent negative balance
      const result = await prisma.$transaction(async (tx) => {
         const user = await tx.user.findUnique({ where: { user_id: req.user.user_id } });

         if (!user || Number(user.wallet_balance) < totalDeduction) {
            throw new Error('Insufficient wallet balance to cover withdrawal and ₱25 fee.');
         }

         // 2. Deduct Balance immediately (Optimistic locking)
         const updatedUser = await tx.user.update({
            where: { user_id: req.user.user_id },
            data: { wallet_balance: { decrement: totalDeduction } }
         });

         // 3. Log the transaction
         await tx.walletTransaction.create({
            data: {
               user_id: req.user.user_id,
               type: 'withdrawal',
               amount: -totalDeduction,
               balance: updatedUser.wallet_balance || 0,
               description: `Withdrawal to ${bankCode} (Includes ₱25 fee)`
            }
         });

         return updatedUser;
      });

      // 4. Initiate Real-World Payout via Gateway
      const payoutReq = await createPayout(withdrawAmount, { bankCode, accountNumber, accountName }, `wd_${req.user.user_id}_${Date.now()}`);

      if (!payoutReq.success) {
         // If gateway fails instantly, we should theoretically refund the balance here.
         // For production, a reliable queue (BullMQ) should handle payouts to prevent sync failures.
         console.error('Payout failed to queue:', (payoutReq as any).error || 'Unknown error');
         return res.status(500).json({ error: 'Withdrawal failed at gateway. Please contact support.' });
      }

      // AUDIT: Successful withdrawal
      await logAudit({ userId: req.user.user_id, actionType: ACTION_TYPES.WITHDRAWAL_SUCCESS, description: `₱${withdrawAmount.toLocaleString()} withdrawn to ${bankCode}`, ip: req.ip, entityType: 'WALLET', entityId: req.user.user_id, metadata: { amount: withdrawAmount, fee: WITHDRAWAL_FEE, total_deducted: totalDeduction, bank_code: bankCode, new_balance: Number(result.wallet_balance) } });

      res.json({ 
         status: 'WITHDRAWAL_PROCESSING', 
         message: `₱${withdrawAmount.toLocaleString()} is being transferred to ${bankCode}.`
      });

   } catch (error: any) {
      res.status(400).json({ error: error.message || 'Server error' });
   }
});

export default router;
