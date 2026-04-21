import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { io } from '../../../server';

const router = Router();

// GET Messages for Transaction
router.get('/:txId', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
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

// POST Message (with terminal state restriction)
router.post('/:txId', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      const txId = parseInt(req.params.txId as string);
      const { text, isAi } = req.body;

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: txId } });
      if (!trade || (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id)) {
         return res.status(403).json({ error: 'Forbidden.' });
      }

      // Block messaging in terminal and pre-acceptance states
      const blockedStates = ['completed', 'cancelled', 'refunded', 'pending_invite'];
      if (blockedStates.includes(trade.status || '')) {
         return res.status(400).json({ error: 'This trade room is closed. No further messages allowed.' });
      }

      // Server-side risk analysis — never trust the client
      const HIGH_RISK_PATTERNS = ['gcash', 'pay me direct', 'facebook', 'blue app', 'tiktok', 'black app', 'orange app', 'outside midly', 'pay outside', 'direct payment', 'send money'];
      const textLower = (text || '').toLowerCase();
      const computedRiskLevel = HIGH_RISK_PATTERNS.some(p => textLower.includes(p)) ? 'High' : 'Safe';

      const newMsg = await prisma.message.create({
         data: {
            transaction_id: txId,
            sender_id: req.user.user_id,
            message_text: text,
            is_system_generated: isAi || false,
            risk_level: computedRiskLevel
         }
      });

      // io.to will only work if we import io successfully. Assuming it works.
      io.to(`trade_${txId}`).emit('new_message', newMsg);
      res.json({ message: newMsg });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

export default router;
