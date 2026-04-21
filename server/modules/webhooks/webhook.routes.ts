import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { io } from '../../../server';

const router = Router();

// POST PayMongo Webhook Listener
router.post('/paymongo', async (req: Request, res: Response): Promise<any> => {
   try {
      const event = req.body;

      // In production, you MUST verify the webhook signature using process.env.PAYMONGO_WEBHOOK_SECRET
      // For this implementation, we will process the payload directly.

      const eventType = event.data?.attributes?.type;

      // PayMongo fires different event types depending on the payment source:
      // - 'link.payment.paid' when payment is made through a Payment Link
      // - 'payment.paid' when payment is made directly
      // - 'payment.failed' when a payment attempt fails
      if (eventType === 'payment.paid' || eventType === 'link.payment.paid' || eventType === 'checkout_session.payment.paid') {
         // Log the FULL raw payload so we can debug exactly what PayMongo sends
         console.log(`[Webhook] RAW PAYLOAD:`, JSON.stringify(event, null, 2));

         const eventData = event.data?.attributes?.data?.attributes || {};
         
         // Extract payment amount - structure varies by event type
         let amountPaid = 0;
         if (eventType === 'checkout_session.payment.paid' && eventData.payments?.[0]) {
            amountPaid = Number(eventData.payments[0].attributes?.amount || 0) / 100;
         } else {
            amountPaid = Number(eventData.amount || 0) / 100;
         }

         // Extract reference ID - PayMongo puts it in different places depending on event type
         let referenceId = 
            eventData.reference_number ||                          // Checkout Session direct
            eventData.remarks ||                                   // Payment Links
            eventData.metadata?.reference_number ||                // Sometimes in metadata
            eventData.payments?.[0]?.attributes?.description ||    // Nested in checkout payments
            '';

         console.log(`[Webhook] Parsed: eventType=${eventType} | ref=${referenceId} | amount=₱${amountPaid}`);

         // FALLBACK STRATEGY: If no reference found, match by checkout session ID
         // Our pending transactions store: "Pending Top-Up via PayMongo (cs_xxx)"
         // The payment.paid event might have the checkout session ID in source or metadata
         if (!referenceId || !referenceId.startsWith('topup_')) {
            const checkoutSessionId = 
               event.data?.attributes?.data?.id ||                    // The payment/session ID itself
               eventData.source?.id ||                                // Source reference
               eventData.metadata?.checkout_session_id ||             // Metadata
               '';

            console.log(`[Webhook] No direct reference. Trying checkout session match: ${checkoutSessionId}`);

            if (checkoutSessionId) {
               // Search for a pending transaction that contains this checkout session ID
               const pendingTx = await prisma.walletTransaction.findFirst({
                  where: {
                     type: 'deposit_pending',
                     description: { contains: checkoutSessionId }
                  }
               });

               if (pendingTx) {
                  console.log(`[Webhook] MATCHED pending tx #${pendingTx.id} for user ${pendingTx.user_id}`);
                  const userId = pendingTx.user_id;
                  const depositAmount = amountPaid > 0 ? amountPaid : Number(pendingTx.amount);

                  await prisma.$transaction(async (tx) => {
                     const user = await tx.user.update({
                        where: { user_id: userId },
                        data: { wallet_balance: { increment: depositAmount } }
                     });

                     await tx.walletTransaction.create({
                        data: {
                           user_id: userId,
                           type: 'deposit',
                           amount: depositAmount,
                           balance: user.wallet_balance || 0,
                           description: `Top-Up via PayMongo (${eventType} → matched ${checkoutSessionId})`
                        }
                     });

                     // Mark the pending transaction so we don't double-credit
                     await tx.walletTransaction.update({
                        where: { id: pendingTx.id },
                        data: { type: 'deposit_fulfilled' }
                     });
                  });

                  console.log(`[Webhook] Fulfilled Top-Up for User ${userId}: ₱${depositAmount}`);
                  io.to(`user_${userId}`).emit('wallet_updated');
                  return res.status(200).send('Fulfilled via session match');
               }
            }

            console.log(`[Webhook] Could not match payment to any pending transaction.`);
            return res.status(200).send('No matching transaction found');
         }

         if (!referenceId) return res.status(200).send('No reference ID');

         if (referenceId.startsWith('topup_')) {
            // ==========================================
            // FLOW 1: WALLET TOP-UP FULFILLMENT
            // ==========================================
            const parts = referenceId.split('_');
            const userId = parseInt(parts[1]);

            await prisma.$transaction(async (tx) => {
               const user = await tx.user.update({
                  where: { user_id: userId },
                  data: { wallet_balance: { increment: amountPaid } }
               });

               await tx.walletTransaction.create({
                  data: {
                     user_id: userId,
                     type: 'deposit',
                     amount: amountPaid,
                     balance: user.wallet_balance || 0,
                     description: `Top-Up via PayMongo (${eventType})`
                  }
               });
            });

            console.log(`[Webhook] Fulfilled Top-Up for User ${userId}: ₱${amountPaid}`);
            io.to(`user_${userId}`).emit('wallet_updated');

         } else if (referenceId.startsWith('trade_')) {
            // ==========================================
            // FLOW 2: ESCROW DIRECT CHECKOUT FULFILLMENT
            // ==========================================
            const tradeId = parseInt(referenceId.split('_')[1]);

            await prisma.$transaction(async (tx) => {
               const trade = await tx.transaction.findUnique({
                  where: { transaction_id: tradeId },
                  include: { payment: true }
               });

               if (!trade || !trade.payment || trade.payment.vault_status !== 'pending_deposit') {
                  console.log(`[Webhook] Trade ${tradeId} is not pending deposit. Skipping.`);
                  return;
               }

               await tx.payment.update({
                  where: { payment_id: trade.payment.payment_id },
                  data: { vault_status: 'locked' }
               });

               await tx.transaction.update({
                  where: { transaction_id: tradeId },
                  data: { status: 'active' }
               });

               await tx.message.create({
                  data: {
                     transaction_id: tradeId,
                     sender_id: trade.buyer_id,
                     message_text: `[SYSTEM ALERT] Gateway confirmation received. ₱${amountPaid.toLocaleString()} has been securely deposited into the Midly Smart Vault. Seller, please proceed to Handover the item.`,
                     is_system_generated: true,
                     risk_level: 'Safe'
                  }
               });
            });

            console.log(`[Webhook] Fulfilled Direct Checkout for Trade ${tradeId}`);
            io.to(`trade_${tradeId}`).emit('trade_updated', 'active');
         }

      } else if (eventType === 'payment.failed') {
         console.warn(`[Webhook] Payment failed:`, JSON.stringify(event.data?.attributes?.data?.attributes?.last_payment_error));
      }

      res.status(200).send('Webhook Received');
   } catch (error) {
      console.error('[Webhook Error]', error);
      res.status(500).send('Webhook Error');
   }
});

// ============================================================
// DEV ONLY: Manual Webhook Simulator
// This endpoint lets you manually confirm a Top-Up or Trade
// payment when testing locally (since PayMongo can't reach localhost).
//
// Usage:
//   POST /api/webhooks/simulate
//   Body: { "type": "topup", "userId": 1, "amount": 1000 }
//   Body: { "type": "trade", "tradeId": 5, "amount": 5000 }
// ============================================================
router.post('/simulate', async (req: Request, res: Response): Promise<any> => {
   if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'This endpoint is disabled in production.' });
   }

   try {
      const { type, userId, tradeId, amount } = req.body;

      if (!amount || Number(amount) <= 0) {
         return res.status(400).json({ error: 'Amount is required and must be positive.' });
      }

      if (type === 'topup') {
         if (!userId) return res.status(400).json({ error: 'userId is required for topup simulation.' });

         await prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
               where: { user_id: Number(userId) },
               data: { wallet_balance: { increment: Number(amount) } }
            });

            await tx.walletTransaction.create({
               data: {
                  user_id: Number(userId),
                  type: 'deposit',
                  amount: Number(amount),
                  balance: user.wallet_balance || 0,
                  description: `Top-Up via PayMongo (DEV SIMULATION)`
               }
            });
         });

         console.log(`[Webhook Simulator] Fulfilled Top-Up for User ${userId}: ₱${amount}`);
         io.to(`user_${userId}`).emit('wallet_updated');
         return res.json({ status: 'OK', message: `Simulated top-up of ₱${amount} for User ${userId}` });

      } else if (type === 'trade') {
         if (!tradeId) return res.status(400).json({ error: 'tradeId is required for trade simulation.' });

         await prisma.$transaction(async (tx) => {
            const trade = await tx.transaction.findUnique({
               where: { transaction_id: Number(tradeId) },
               include: { payment: true }
            });

            if (!trade || !trade.payment) {
               throw new Error('Trade or payment not found');
            }

            await tx.payment.update({
               where: { payment_id: trade.payment.payment_id },
               data: { vault_status: 'locked' }
            });

            await tx.transaction.update({
               where: { transaction_id: Number(tradeId) },
               data: { status: 'active' }
            });

            await tx.message.create({
               data: {
                  transaction_id: Number(tradeId),
                  sender_id: trade.buyer_id,
                  message_text: `[SYSTEM ALERT] Gateway confirmation received (DEV SIMULATION). ₱${Number(amount).toLocaleString()} has been deposited into the Smart Vault.`,
                  is_system_generated: true,
                  risk_level: 'Safe'
               }
            });
         });

         console.log(`[Webhook Simulator] Fulfilled Trade ${tradeId}: ₱${amount}`);
         io.to(`trade_${tradeId}`).emit('trade_updated', 'active');
         return res.json({ status: 'OK', message: `Simulated trade payment for Trade #${tradeId}` });

      } else {
         return res.status(400).json({ error: 'type must be "topup" or "trade"' });
      }

   } catch (error: any) {
      console.error('[Webhook Simulator Error]', error);
      res.status(500).json({ error: error.message || 'Simulation failed' });
   }
});

export default router;
