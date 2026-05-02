import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, requireKYC } from '../../shared/middlewares/auth.middleware';
import { disputeLimiter } from '../../shared/middlewares/rateLimiter';
import { io, logAudit } from '../../../server';
import { encryptForTrade, decryptForTrade } from '../../../src/ai/cryptoUtils';
import { createPaymentLink } from '../../utils/payments/paymongo';
import { kycQueue } from '../../../src/ai/queue';
import { generateUploadUrl } from '../../utils/s3';
import crypto from 'crypto';

const router = Router();

const TERMINAL_STATES = ['completed', 'cancelled', 'refunded'];
const PRE_ACCEPTANCE_STATES = ['pending_invite'];


// GET P2P Listings
router.get('/listings', async (req, res): Promise<any> => {
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

// GET My Trades (For Dashboard/Transactions)
router.get('/', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const trades = await prisma.transaction.findMany({
         where: { OR: [{ buyer_id: req.user.user_id }, { seller_id: req.user.user_id }] },
         include: { 
            buyer: { select: { email: true, first_name: true } }, 
            seller: { select: { email: true, first_name: true } },
            payment: true
         },
         orderBy: { updated_at: 'desc' }
      });
      res.json({ trades });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Create P2P Listing
router.post('/listings', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
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
router.post('/listings/buy/:id', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
   try {
      const listingId = parseInt(req.params.id as string);
      const listing = await prisma.listing.findUnique({ where: { listing_id: listingId } });

      if (!listing || listing.status !== 'open') return res.status(404).json({ error: 'Listing not available' });
      if (listing.seller_id === req.user.user_id) return res.status(400).json({ error: 'Cannot buy your own listing' });

      const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
      const feeRate = Number(settings?.base_fee ?? 0.05);

      const basePrice = Number(listing.price);
      const serviceFee = basePrice * feeRate;
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

      // --- Fraud Detection Layer 2: Initial Risk Score ---
      import('../../utils/riskEngine').then(({ calculateTransactionRisk }) => {
         calculateTransactionRisk(tradeIdRes).catch(console.error);
      });

      res.json({ tradeId: tradeIdRes });
   } catch (e: any) {
      res.status(400).json({ error: e.message || 'Server error' });
   }
});

// POST Create Escrow Transaction
router.post('', authenticateJWT, requireKYC, async (req, res): Promise<any> => {
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

      const settings = await prisma.platformSettings.findUnique({ where: { id: 1 } });
      const feeRate = Number(settings?.base_fee ?? 0.05);

      const basePrice = Number(agreedPrice);
      const serviceFee = basePrice * feeRate;
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

         const notif = await tx.notification.create({
            data: {
               user_id: counterParty.user_id,
               message: `You have received a new Private Escrow Request for ${itemCategory}.`,
               type: 'escrow_invite',
               reference_id: trade.transaction_id
            }
         });

         const io = req.app.get('io');
         if (io) io.to(`user_${counterParty.user_id}`).emit('new_notification', notif);

         return trade;
      });

      // --- Fraud Detection Layer 2: Initial Risk Score ---
      import('../../utils/riskEngine').then(({ calculateTransactionRisk }) => {
         calculateTransactionRisk(tradeRes.transaction_id).catch(console.error);
      });

      res.json({ transaction: tradeRes });
   } catch (error: any) {
      res.status(400).json({ error: error.message || 'Server error' });
   }
});

// GET View Notifications
router.get('/notifications', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const data = await prisma.notification.findMany({
         where: { user_id: req.user.user_id, is_read: false },
         orderBy: { created_at: 'desc' }
      });
      res.json({ notifications: data });
   } catch (e) { res.status(500).json({ error: 'Server err' }); }
});

// PUT Mark Notifications Read
router.put('/notifications/mark-read', authenticateJWT, async (req, res): Promise<any> => {
   try {
      await prisma.notification.updateMany({
         where: { user_id: req.user.user_id, is_read: false },
         data: { is_read: true }
      });
      res.json({ success: true });
   } catch (e) { res.status(500).json({ error: 'Server err' }); }
});

// PUT Accept Escrow Invite (Hardened: counterparty-only, idempotent, audit-logged)
router.put('/:id/accept-invite', authenticateJWT, async (req, res): Promise<any> => {
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
         const acceptNotif = await tx.notification.create({
            data: {
               user_id: initiatorId,
               message: `Your Private Escrow invite for Trade #${tradeId} has been accepted! The Agreement Phase is now active.`,
               type: 'escrow_accepted',
               reference_id: tradeId
            }
         });

         const io = req.app.get('io');
         if (io) io.to(`user_${initiatorId}`).emit('new_notification', acceptNotif);

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
router.put('/:id/progress', authenticateJWT, async (req, res): Promise<any> => {
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
                  data: { user_id: trade.buyer_id, type: 'escrow_lock', amount: -Number(trade.total_amount), balance: updatedBuyer.wallet_balance || 0, description: `Escrow Lock - Trade #${tradeId}` }
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
            // External Gateway Checkout via PayMongo
            // Wallet Premium Economics: Direct checkout incurs an extra 2% gateway fee
            const gatewayFee = Number(trade.total_amount) * 0.02;
            const amountToCharge = Number(trade.total_amount) + gatewayFee;

            const gatewayResult = await createPaymentLink(
               amountToCharge, 
               `Escrow Trade #${tradeId}`, 
               `trade_${tradeId}`
            );

            if (!gatewayResult.success) {
               return res.status(402).json({ error: gatewayResult.error || 'Payment failed to generate.' });
            }

            await prisma.$transaction(async (tx) => {
               await tx.payment.create({
                  data: {
                     transaction_id: trade.transaction_id,
                     amount: amountToCharge, // Includes the 2% extra fee
                     payment_method: paymentMethod,
                     vault_status: 'pending_deposit', // Asynchronous wait for Webhook
                     deposit_date: new Date()
                  }
               });

               // Note: Trade status remains 'awaiting_payment' until Webhook confirms deposit
               await tx.message.create({
                  data: {
                     transaction_id: tradeId,
                     sender_id: trade.buyer_id,
                     message_text: `[SYSTEM LOG] The Buyer has opted to pay directly via ${paymentMethod.toUpperCase()}. A checkout link has been generated. The Smart Vault will remain waiting until the deposit is confirmed by the gateway.`,
                     is_system_generated: true,
                     risk_level: 'Safe'
                  }
               });
            });

            // Return the checkout URL so the client can redirect the buyer
            return res.json({ status: 'PENDING_GATEWAY', checkoutUrl: gatewayResult.checkoutUrl });
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
                  ...(credentials ? { account_credentials: encryptForTrade(credentials, tradeId) } : {})
               }
            });

            await kycQueue.add('auto-release', { tradeId }, { delay: 24 * 60 * 60 * 1000 });

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

            // Queue crypto-shredder to run 72 hours from completion
            await kycQueue.add('crypto-shredder', { tradeId }, { delay: 72 * 60 * 60 * 1000 });

            // 2. Update payment vault status
            await tx.payment.update({
               where: { payment_id: trade.payment!.payment_id },
               data: { vault_status: 'released', release_date: new Date() }
            });

            // 3. Increment seller wallet and reputation
            const amountToReceive = Number(trade.agreed_price);
            const updatedSeller = await tx.user.update({
               where: { user_id: trade.seller_id },
               data: { 
                  wallet_balance: { increment: amountToReceive },
                  reputation_score: { increment: 0.01 }
               }
            });
            await tx.walletTransaction.create({
               data: { user_id: trade.seller_id, type: 'escrow_release', amount: amountToReceive, balance: updatedSeller.wallet_balance || 0, description: `Escrow Release - Trade #${tradeId}` }
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
router.post('/:id/dispute', authenticateJWT, disputeLimiter, async (req, res): Promise<any> => {
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
   } catch (e: any) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'A dispute is already active for this transaction.' });
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Generate Presigned Evidence Upload URL
router.post('/:id/evidence/upload-url', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const { mime_type, file_name, size_bytes } = req.body;

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId }, include: { dispute: true } });
      if (!trade || !trade.dispute) return res.status(404).json({ error: 'Active dispute not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden' });
      
      const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedMimes.includes(mime_type)) return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and PDF allowed.' });
      if (size_bytes > 5 * 1024 * 1024) return res.status(400).json({ error: 'File size exceeds 5MB limit.' });

      const evidenceCount = await prisma.disputeEvidence.count({ where: { dispute_id: trade.dispute.dispute_id, uploaded_by: req.user.user_id } });
      if (evidenceCount >= 5) return res.status(400).json({ error: 'Maximum 5 files allowed per party.' });

      const storageKey = crypto.randomUUID();
      const uploadUrl = await generateUploadUrl(`evidence/${trade.dispute.dispute_id}/${req.user.user_id}/${storageKey}`, mime_type);

      res.json({ uploadUrl, storageKey });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Confirm Evidence Upload
router.post('/:id/evidence/confirm', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const { storage_key, original_name, mime_type, size_bytes, sha256_hash } = req.body;

      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId }, include: { dispute: true } });
      if (!trade || !trade.dispute) return res.status(404).json({ error: 'Active dispute not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden' });

      await prisma.disputeEvidence.create({
         data: {
            dispute_id: trade.dispute.dispute_id,
            uploaded_by: req.user.user_id,
            storage_key,
            original_name,
            mime_type,
            size_bytes,
            sha256_hash
         }
      });

      res.json({ status: 'CONFIRMED' });
   } catch (e) {
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Auto-Release System Trigger
router.post('/:id/auto-release', authenticateJWT, async (req, res): Promise<any> => {
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

      // Server-side time validation only — no client bypass allowed
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      if (trade.item_delivered_at >= twentyFourHoursAgo) {
         return res.status(403).json({ error: '24 hours have not elapsed yet.' });
      }

      if (!trade.payment) return res.status(400).json({ error: 'Vault empty' });

      await prisma.$transaction(async (tx) => {
         // Race condition guard: verify status hasn't changed to disputed milliseconds before execution
         const currentTrade = await tx.transaction.findUnique({ where: { transaction_id: tradeId }, include: { payment: true } });
         if (!currentTrade || currentTrade.status === 'disputed' || currentTrade.payment?.vault_status === 'frozen') {
             throw new Error('Transaction is frozen or disputed. Auto-release aborted.');
         }

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
            data: { user_id: trade.seller_id, type: 'escrow_release', amount: amountToReceive, balance: updatedSeller.wallet_balance || 0, description: `Escrow Auto-Release - Trade #${tradeId}` }
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
   } catch (e: any) {
      if (e.message === 'Transaction is frozen or disputed. Auto-release aborted.') {
          return res.status(409).json({ error: e.message });
      }
      res.status(500).json({ error: 'Server error' });
   }
});

// POST Cancel Pre-Vault Trade (Bilateral)
router.post('/:id/cancel', authenticateJWT, async (req, res): Promise<any> => {
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
router.post('/:id/request-cancel', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      const trade = await prisma.transaction.findUnique({ where: { transaction_id: tradeId } });

      if (!trade) return res.status(404).json({ error: 'Trade not found.' });
      if (trade.buyer_id !== req.user.user_id && trade.seller_id !== req.user.user_id) return res.status(403).json({ error: 'Forbidden.' });
      
      if (trade.status !== 'active' && trade.status !== 'verifying') {
         return res.status(400).json({ error: 'Mutual Cancellation applies to the Active or Verifying Vault phases.' });
      }

      if (trade.status === 'verifying' && trade.item_delivered_at) {
         const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
         if (trade.item_delivered_at < fourHoursAgo) {
            return res.status(400).json({ error: 'The 4-hour cancellation window has passed. You must raise a dispute instead.' });
         }
      }

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
router.post('/:id/accept-cancel', authenticateJWT, async (req, res): Promise<any> => {
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
            data: { user_id: trade.buyer_id, type: 'escrow_refund', amount: amount, balance: updatedBuyer.wallet_balance || 0, description: `Mutual Cancellation Refund - Trade #${tradeId}` }
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


// POST Reveal Credentials (Secure Decryption Flow)
router.post('/:id/reveal-credentials', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      if (isNaN(tradeId)) return res.status(400).json({ error: 'Invalid trade ID' });

      const trade = await prisma.transaction.findUnique({
         where: { transaction_id: tradeId },
         select: { buyer_id: true, status: true, account_credentials: true }
      });

      if (!trade) return res.status(404).json({ error: 'Not found' });

      // STRICT AUTH: Only the buyer of THIS trade
      if (trade.buyer_id !== req.user.user_id) {
         return res.status(403).json({ error: 'Forbidden. You are not the buyer.' });
      }

      // STRICT STATE: Only during active inspection or after completion
      const ALLOWED = ['verifying', 'completed'];
      if (!ALLOWED.includes(trade.status || '')) {
         return res.status(403).json({ error: 'Credentials not available at this stage.' });
      }

      if (!trade.account_credentials) {
         return res.status(404).json({ error: 'No credentials on file.' });
      }

      // Rate limit reveal access
      const revealCount = await prisma.auditLog.count({
         where: { transaction_id: tradeId, user_id: req.user.user_id, action_type: 'CREDENTIAL_REVEAL' }
      });
      if (revealCount >= 5) {
         return res.status(429).json({ error: 'Reveal limit reached (5/5). Contact support.' });
      }

      // Audit every single access
      await prisma.auditLog.create({
         data: {
            transaction_id: tradeId,
            user_id: req.user.user_id,
            action_type: 'CREDENTIAL_REVEAL',
            action_description: `Buyer revealed credentials for trade #${tradeId}`,
            ip_address: req.ip || '0.0.0.0',
            risk_score: 0
         }
      });

      // Decrypt securely in memory
      let plaintext;
      try {
         plaintext = decryptForTrade(trade.account_credentials, tradeId);
      } catch (err) {
         console.error('[CRYPTO ERROR] Failed to decrypt credentials for trade', tradeId);
         return res.status(500).json({ error: 'Failed to retrieve secure data.' });
      }

      // Security Headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      return res.json({ credentials: plaintext });
   } catch (error) {
      console.error('POST /reveal-credentials error:', error);
      res.status(500).json({ error: 'Server error' });
   }
});

// GET Single Transaction by ID (must be LAST to avoid intercepting /listings, /notifications, etc.)
router.get('/:id', authenticateJWT, async (req, res): Promise<any> => {
   try {
      const tradeId = parseInt(req.params.id as string);
      if (isNaN(tradeId)) return res.status(400).json({ error: 'Invalid trade ID' });

      const trade = await prisma.transaction.findUnique({
         where: { transaction_id: tradeId },
         include: {
            buyer: { select: { user_id: true, email: true, first_name: true, last_name: true, reputation_score: true } },
            seller: { select: { user_id: true, email: true, first_name: true, last_name: true, reputation_score: true } },
            payment: true,
            dispute: { include: { evidence: true } }
         }
      });

      if (!trade) return res.status(404).json({ error: 'Trade not found' });

      // Allow admins to view any trade (for dispute mediation)
      const userId = req.user.user_id;
      const dbUser = await prisma.user.findUnique({ where: { user_id: userId } });
      const isAdmin = dbUser?.role === 'admin';

      if (!isAdmin && trade.buyer_id !== userId && trade.seller_id !== userId) {
         return res.status(403).json({ error: 'You are not a participant in this trade' });
      }

      const my_role = isAdmin ? 'ADMIN' : (trade.buyer_id === userId ? 'BUY' : 'SELL');
      const is_initiator = isAdmin ? false : (trade.buyer_id === userId);

      // SECURITY: Strip credentials from general response payload
      if ((trade as any).account_credentials) {
         delete (trade as any).account_credentials;
      }

      res.json({ trade, my_role, is_initiator });
   } catch (e) {
      console.error('GET /transactions/:id error:', e);
      res.status(500).json({ error: 'Server error' });
   }
});

export default router;
