import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, requireKYC } from '../../shared/middlewares/auth.middleware';
import { createPaymentLink, createPayout } from '../../utils/payments/paymongo';

const router = Router();

// GET Wallet Balance & History
router.get('/', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      const user = await prisma.user.findUnique({
         where: { user_id: req.user.user_id },
         select: { wallet_balance: true }
      });

      const transactions = await prisma.walletTransaction.findMany({
         where: { user_id: req.user.user_id },
         orderBy: { created_at: 'desc' },
         take: 50 // Limit history for performance
      });

      res.json({ balance: user?.wallet_balance || 0, transactions });
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

      res.json({ 
         status: 'WITHDRAWAL_PROCESSING', 
         message: `₱${withdrawAmount.toLocaleString()} is being transferred to ${bankCode}.`
      });

   } catch (error: any) {
      res.status(400).json({ error: error.message || 'Server error' });
   }
});

export default router;
