import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, requireKYC } from '../../shared/middlewares/auth.middleware';
import { heavyEndpointLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();

// GET Wallet Stats
router.get('/user/wallet', heavyEndpointLimiter, authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
router.get('/wallet/history', heavyEndpointLimiter, authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
router.post('/wallet/deposit', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
               balance: user.wallet_balance || 0,
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
router.post('/wallet/withdraw', authenticateJWT, requireKYC, async (req: Request, res: Response): Promise<any> => {
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
               balance: updatedUser.wallet_balance || 0,
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

// GET Profile Information
router.get('/user/profile', heavyEndpointLimiter, authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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

// GET Payment Methods
router.get('/user/payment-methods', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
router.post('/user/payment-methods', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
router.delete('/user/payment-methods/:id', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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
router.get('/user/sessions', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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

// POST Rate Seller Reputation
router.post('/user/rate/:id', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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

// GET User Security Activity (Audit Logs)
router.get('/user/audit-logs', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      const logs = await prisma.auditLog.findMany({
         where: { user_id: req.user.user_id },
         orderBy: { timestamp: 'desc' },
         take: 50 // Recent 50 events for the user
      });
      res.json({ logs });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

export default router;
