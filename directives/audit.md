# Audit Logging Directive (Midly)

**Goal**: Maintain an immutable, forensic trail of all significant platform actions.

## The Audit Protocol
Every significant action on the platform MUST be logged using the `logAudit()` utility function found in `server/utils/auditLogger.ts`.

### Function Signature
```typescript
await logAudit({
  tx,                      // Prisma transaction client (optional)
  userId: number,
  actionType: ActionType,  // from ACTION_TYPES enum in auditLogger.ts
  description: string,
  transactionId?: number,  // for trade-scoped events
  entityType?: string,     // 'USER' | 'KYC' | 'WITHDRAWAL' | 'SETTINGS'
  entityId?: string,
  riskScore?: number,      // from riskEngine — never hardcode 0
  metadata?: object,       // structured per-event data
  ip?: string,
});
```

### Critical Requirements
1. **Atomic Logging**: If the action modifies state within a Prisma `$transaction` block, the audit log MUST be written using the same transaction client (`tx`) to ensure atomicity.
2. **Action Types**: ALWAYS reference the `ACTION_TYPES` constants defined in `auditLogger.ts`. NEVER use raw strings.
3. **Completeness**: Include relevant context in the `metadata` object (e.g., old vs. new values, specific IDs, amounts).

## Centralized Action Types
The platform tracks 25 core action types, categorized as follows:
- **Trade Lifecycle**: `TRADE_CREATED`, `INVITE_ACCEPTED`, `PAYMENT_REQUESTED`, `FUNDS_DEPOSITED`, `ESCROW_LOCKED`, `ITEM_DELIVERED`, `TRADE_APPROVED`, `FUNDS_RELEASED`, `TRADE_AUTO_RELEASED`, `TRADE_CANCELLED`
- **Disputes**: `DISPUTE_FILED`, `RESOLVE_DISPUTE`, `BUYER_REFUNDED`
- **Security**: `CREDENTIAL_REVEAL`, `SYSTEM_FREEZE`, `ADMIN_FREEZE`, `ADMIN_UNFREEZE`
- **KYC**: `KYC_APPROVED`, `KYC_REJECTED`
- **User Management**: `USER_BANNED`, `USER_UNBANNED`
- **Financial**: `WITHDRAWAL_SUCCESS`, `WITHDRAWAL_BLOCKED`
- **Settings**: `SETTINGS_CHANGED`
