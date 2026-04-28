import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT } from '../../shared/middlewares/auth.middleware';
import { io } from '../../../server';

const router = Router();

// GET Messages for Transaction
router.get('/:txId', authenticateJWT, async (req: Request, res: Response): Promise<any> => {
   try {
      const txId = parseInt(req.params.txId as string);

      // Ensure user is authorized (admins can view any trade's messages for dispute mediation)
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: txId } });
      if (!trade) return res.status(404).json({ error: 'Trade not found.' });

      const dbUser = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      const isAdmin = dbUser?.role === 'admin';

      if (!isAdmin && trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) {
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

      // Fuzzy matching utilities
      const levenshteinDistance = (s1: string, s2: string): number => {
         const m = s1.length, n = s2.length;
         const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
         for (let i = 0; i <= m; i++) dp[i][0] = i;
         for (let j = 0; j <= n; j++) dp[0][j] = j;
         for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
               if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
               else dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]) + 1;
            }
         }
         return dp[m][n];
      };

      const similarity = (s1: string, s2: string): number => {
         let longer = s1.length > s2.length ? s1 : s2;
         let shorter = s1.length > s2.length ? s2 : s1;
         if (longer.length === 0) return 1.0;
         return (longer.length - levenshteinDistance(longer, shorter)) / parseFloat(longer.length.toString());
      };

      // Server-side risk analysis
      const HIGH_RISK_PATTERNS = ['gcash', 'pay direct', 'facebook', 'messenger', 'blue app', 'tiktok', 'black app', 'orange app', 'outside midly', 'pay outside', 'send money'];
      
      // Normalize text: remove spaces, punctuation, special chars, convert to lowercase
      const normalizedText = (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawTextTokens = (text || '').toLowerCase().split(/[\s\-_]+/);
      
      let computedRiskLevel = 'Safe';
      
      // 1. Check strict substrings
      if (HIGH_RISK_PATTERNS.some(p => (text || '').toLowerCase().includes(p) || normalizedText.includes(p.replace(/[^a-z0-9]/g, '')))) {
         computedRiskLevel = 'High';
      } else {
         // 2. Check fuzzy matches for words
         for (const pattern of HIGH_RISK_PATTERNS) {
            const patternNorm = pattern.replace(/[^a-z0-9]/g, '');
            // Check if any word token is very similar to the pattern
            if (rawTextTokens.some((token: string) => similarity(token, patternNorm) > 0.85)) {
               computedRiskLevel = 'High';
               break;
            }
            // Check similarity of whole normalized block
            if (similarity(normalizedText, patternNorm) > 0.85) {
               computedRiskLevel = 'High';
               break;
            }
         }
      }

      const newMsg = await prisma.message.create({
         data: {
            transaction_id: txId,
            sender_id: req.user.user_id,
            message_text: text,
            is_system_generated: isAi || false,
            risk_level: computedRiskLevel
         }
      });

      io.to(`trade_${txId}`).emit('new_message', newMsg);

      if (computedRiskLevel === 'High') {
         // Emit risk alert directly to client
         io.to(`trade_${txId}`).emit('risk_alert', newMsg);
         
         // Inject warning message
         const warningMsg = await prisma.message.create({
            data: {
               transaction_id: txId,
               sender_id: req.user.user_id, // System acts under context
               message_text: `[SYSTEM WARNING] Midly has detected a possible off-platform communication or payment attempt. Do not transact outside the Smart Vault. You will lose all buyer protection.`,
               is_system_generated: true,
               risk_level: 'Critical'
            }
         });
         io.to(`trade_${txId}`).emit('new_message', warningMsg);
      }

      res.json({ message: newMsg });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

export default router;
