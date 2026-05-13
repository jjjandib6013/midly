import { prisma } from '../config/db';

// ==========================================
// CENTRALISED ACTION TYPES
// ==========================================

export const ACTION_TYPES = {
   // Trade Lifecycle
   TRADE_CREATED: 'TRADE_CREATED',
   INVITE_ACCEPTED: 'INVITE_ACCEPTED',
   PAYMENT_REQUESTED: 'PAYMENT_REQUESTED',
   FUNDS_DEPOSITED: 'FUNDS_DEPOSITED',
   ESCROW_LOCKED: 'ESCROW_LOCKED',
   ITEM_DELIVERED: 'ITEM_DELIVERED',
   TRADE_APPROVED: 'TRADE_APPROVED',
   FUNDS_RELEASED: 'FUNDS_RELEASED',
   TRADE_AUTO_RELEASED: 'TRADE_AUTO_RELEASED',
   TRADE_CANCELLED: 'TRADE_CANCELLED',
   DISPUTE_FILED: 'DISPUTE_FILED',
   METADATA_DECLARED: 'METADATA_DECLARED',

   // Credential Access
   CREDENTIAL_REVEAL: 'CREDENTIAL_REVEAL',

   // Admin Actions
   RESOLVE_DISPUTE: 'RESOLVE_DISPUTE',
   BUYER_REFUNDED: 'BUYER_REFUNDED',
   ADMIN_FREEZE: 'ADMIN_FREEZE',
   ADMIN_UNFREEZE: 'ADMIN_UNFREEZE',
   SYSTEM_FREEZE: 'SYSTEM_FREEZE',
   KYC_APPROVED: 'KYC_APPROVED',
   KYC_REJECTED: 'KYC_REJECTED',
   USER_BANNED: 'USER_BANNED',
   USER_UNBANNED: 'USER_UNBANNED',
   SETTINGS_CHANGED: 'SETTINGS_CHANGED',

   // Financial
   WITHDRAWAL_SUCCESS: 'WITHDRAWAL_SUCCESS',
   WITHDRAWAL_BLOCKED: 'WITHDRAWAL_BLOCKED',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

// ==========================================
// REWRITTEN logAudit UTILITY
// ==========================================

interface AuditLogParams {
   /** Prisma transaction client for atomic writes. If omitted, uses the default prisma client. */
   tx?: any;
   /** The transaction ID (optional for non-transactional events like login, KYC, ban) */
   transactionId?: number | null;
   /** The user performing the action */
   userId: number;
   /** Centralised action type from ACTION_TYPES */
   actionType: ActionType;
   /** Human-readable description */
   description: string;
   /** Client IP address */
   ip?: string;
   /** Risk score from the engine (0-100) */
   riskScore?: number;
   /** Entity type for non-transactional events (USER, KYC, WALLET, SETTINGS) */
   entityType?: string;
   /** Entity ID for non-transactional events */
   entityId?: number;
   /** Structured per-event data — amounts, reasons, before/after diffs */
   metadata?: Record<string, any>;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
   const client = params.tx || prisma;
   try {
      await client.auditLog.create({
         data: {
            transaction_id: params.transactionId ?? null,
            user_id: params.userId,
            action_type: params.actionType,
            action_description: params.description,
            ip_address: params.ip || 'system',
            risk_score: params.riskScore ?? 0,
            entity_type: params.entityType ?? null,
            entity_id: params.entityId ?? null,
            metadata: params.metadata ?? null,
         }
      });
   } catch (err) {
      console.error('[AUDIT] Failed to write audit log:', err);
   }
}
