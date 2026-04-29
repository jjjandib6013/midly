import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { io } from '../../../server'; // Note: io export needs to be accessed if we need to emit, or we decouple. Wait, I will just import io from server.ts. Let's assume we decouple or import correctly later.

const router = Router();

router.get('/disputes', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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

router.post('/disputes/:txId/resolve', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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
            await tx.walletTransaction.create({ data: { user_id: trade.buyer_id, type: 'escrow_refund', amount: amount, balance: updatedBuyer.wallet_balance || 0, description: `Admin Escrow Refund - Trade #${txId}` }});
         } else if (action === 'FORWARD_TO_SELLER') {
            await tx.transaction.update({ where: { transaction_id: txId }, data: { status: 'completed' } });
            await tx.payment.update({ where: { payment_id: trade.payment!.payment_id }, data: { vault_status: 'released', release_date: new Date() } });
            const updatedSeller = await tx.user.update({ where: { user_id: trade.seller_id }, data: { wallet_balance: { increment: baseAmount } } });
            await tx.walletTransaction.create({ data: { user_id: trade.seller_id, type: 'escrow_release', amount: baseAmount, balance: updatedSeller.wallet_balance || 0, description: `Admin Escrow Release - Trade #${txId}` }});
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

      // io is handled in server, if we can't import io easily, we can skip it or import it.
      // io.to(`trade_${txId}`).emit('trade_updated', action === 'REFUND_BUYER' ? 'refunded' : 'completed');
      res.json({ status: 'RESOLVED', action_taken: action === 'REFUND_BUYER' ? 'refunded' : 'completed' });
   } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/users', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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

router.post('/users/:id/ban', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const targetId = parseInt(req.params.id as string);
      const { is_banned } = req.body;
      await prisma.user.update({ where: { user_id: targetId }, data: { is_banned } });
      res.json({ success: true, is_banned });
   } catch (e) {
      res.status(500).json({ error: 'Failed to toggle user ban state' });
   }
});

router.get('/settings', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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

// Extended settings: now includes KYC thresholds (#5)
router.post('/settings', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const { base_fee, kyc_biometric_threshold, kyc_review_threshold } = req.body;
      const updateData: any = {};

      if (base_fee !== undefined) {
         const parsedFee = parseFloat(base_fee);
         if (isNaN(parsedFee) || parsedFee < 0 || parsedFee > 1) {
            return res.status(400).json({ error: 'Fee must be between 0.00 and 1.00' });
         }
         updateData.base_fee = parsedFee;
      }

      if (kyc_biometric_threshold !== undefined) {
         const parsed = parseFloat(kyc_biometric_threshold);
         if (isNaN(parsed) || parsed < 0.1 || parsed > 1.0) {
            return res.status(400).json({ error: 'Biometric threshold must be between 0.1 and 1.0' });
         }
         updateData.kyc_biometric_threshold = parsed;
      }

      if (kyc_review_threshold !== undefined) {
         const parsed = parseFloat(kyc_review_threshold);
         if (isNaN(parsed) || parsed < 0.1 || parsed > 1.0) {
            return res.status(400).json({ error: 'Review threshold must be between 0.1 and 1.0' });
         }
         updateData.kyc_review_threshold = parsed;
      }

      if (Object.keys(updateData).length === 0) {
         return res.status(400).json({ error: 'No valid settings provided' });
      }

      const settings = await prisma.platformSettings.upsert({
         where: { id: 1 },
         update: updateData,
         create: { id: 1, ...updateData }
      });
      res.json({ settings });
   } catch (e) {
      res.status(500).json({ error: 'Failed to save settings' });
   }
});

router.get('/metrics', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
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

// ==========================================
// REPORTING & DATA VISUALIZATION QUEUE (#5)
// ==========================================

router.get('/reports/charts', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   
   try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch raw data
      const users = await prisma.user.findMany({
         where: { created_at: { gte: thirtyDaysAgo } },
         select: { created_at: true }
      });
      const txs = await prisma.transaction.findMany({
         where: { created_at: { gte: thirtyDaysAgo } },
         select: { created_at: true, status: true, total_amount: true }
      });

      // Group dynamically by day string "MMM DD"
      const chartMap = new Map<string, { date: string; users: number; transactions: number; volume: number }>();
      
      // Initialize last 30 days to ensure continuous graph
      for(let i = 29; i >= 0; i--) {
         const d = new Date();
         d.setDate(d.getDate() - i);
         const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
         chartMap.set(dateString, { date: dateString, users: 0, transactions: 0, volume: 0 });
      }

      users.forEach(u => {
         const dateString = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
         if(chartMap.has(dateString)) chartMap.get(dateString)!.users += 1;
      });

      txs.forEach(t => {
         const dateString = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
         if(chartMap.has(dateString)) {
            const entry = chartMap.get(dateString)!;
            entry.transactions += 1;
            entry.volume += Number(t.total_amount || 0);
         }
      });

      res.json({ timelineData: Array.from(chartMap.values()) });
   } catch (e) {
      res.status(500).json({ error: 'Failed to generate chart aggregations' });
   }
});

router.get('/reports/transactions', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

   try {
      const { status, startDate, endDate } = req.query;
      const where: any = {};
      
      if (status && status !== 'all') where.status = status;
      if (startDate && endDate) {
         where.created_at = { 
            gte: new Date(startDate as string), 
            lte: new Date(endDate as string) 
         };
      }

      const transactions = await prisma.transaction.findMany({
         where,
         include: {
            buyer: { select: { email: true, first_name: true } },
            seller: { select: { email: true, first_name: true } },
            payment: { select: { amount: true, payment_method: true } }
         },
         orderBy: { created_at: 'desc' }
      });

      res.json({ transactions });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch transaction reports' });
   }
});

router.get('/reports/audit-logs', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

   try {
      const logs = await prisma.auditLog.findMany({
         include: { user: { select: { email: true } } },
         orderBy: { timestamp: 'desc' },
         take: 1000 // Cap to prevent massive payloads
      });
      res.json({ logs });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
   }
});

// ==========================================
// KYC ADMIN REVIEW QUEUE (#7)
// ==========================================

// GET all KYC records pending review
router.get('/kyc', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const kycs = await prisma.kycVerification.findMany({
         where: {
            status: { in: ['pending_review', 'verifying_phase2', 'verifying_phase3', 'rejected'] }
         },
         include: {
            user: { select: { user_id: true, first_name: true, last_name: true, email: true } },
            images: true
         },
         orderBy: { kyc_id: 'desc' }
      });
      res.json({ kycs });
   } catch (e) {
      res.status(500).json({ error: 'Failed to fetch KYC queue' });
   }
});

// POST resolve a KYC application (approve or reject)
router.post('/kyc/:id/resolve', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
   if (!dbUser || dbUser.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
   try {
      const kycId = parseInt(req.params.id as string);
      const { status, reason } = req.body; // status: 'verified' or 'rejected'

      if (!['verified', 'rejected'].includes(status)) {
         return res.status(400).json({ error: 'Status must be verified or rejected' });
      }

      await prisma.kycVerification.update({
         where: { kyc_id: kycId },
         data: {
            status: status,
            rejection_reason: status === 'rejected' ? (reason || 'Rejected by admin review.') : null
         }
      });

      res.json({ success: true, status });
   } catch (e) {
      res.status(500).json({ error: 'Failed to resolve KYC application' });
   }
});

export default router;
