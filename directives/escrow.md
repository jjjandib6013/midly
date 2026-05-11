# Escrow Directive (Midly)

**Goal**: Manage the lifecycle of an escrow trade accurately to prevent financial loss and secure digital assets.

## The State Machine Invariants
The core of the escrow system is its strict, unidirectional state machine. **Never bypass this flow.**

```text
pending_invite → agreement → awaiting_payment → active → verifying → completed
      ↓               ↓                              ↓          ↓
  cancelled       cancelled                      disputed   disputed
  (rejected)      (mutual)                          ↓          ↓
  expired                                       refunded   completed
```

## Critical Rules
1. **Atomic Transactions Only**: All wallet debits, credits, and vault status changes MUST happen inside `prisma.$transaction()` blocks. No exceptions.
2. **Terminal States**: `completed`, `refunded`, `cancelled`, and `expired` are terminal. No mutations of any kind are allowed once a trade reaches these states.
3. **Payment Vault Progression**: `Payment.vault_status` must strictly progress forward: `held → locked → released | refunded | frozen`.
4. **Auto-Release Guards**: 
   - The 24-hour auto-release fires via a BullMQ delayed job, not a client-side timer.
   - The `POST /:id/auto-release` endpoint MUST re-verify server-side that the trade is still in the `verifying` state and that the vault is not `frozen`.
5. **Dispute Freeze**: A dispute MUST set `vault_status = 'frozen'` atomically. No auto-release job can fire on a frozen vault, and the `PAY` action is also blocked.
6. **Race Conditions**: When purchasing a listing, the check for `status === 'open'` MUST use an atomic `updateMany` condition inside the transaction block, not a prior `findUnique`.

## Credential Vault Protocol
- **Encryption**: `account_credentials` MUST be encrypted with a per-trade derived key before storage using `scryptSync(ENCRYPTION_KEY, "midly-trade-{id}", 32)`.
- **Decryption**: Decryption is ONLY allowed via `POST /transactions/:id/reveal-credentials`, gated to the buyer, and ONLY when the trade status is `verifying` or `completed`.
- **Exposure**: NEVER include `account_credentials` in general `GET` responses. Always use Prisma `select` to explicitly exclude it.
- **Shredding**: The field is nullified 72h after completion by the `crypto-shredder` BullMQ job.

## Self-Annealing Loop
When an error occurs during an escrow transition:
1. Diagnose the stack trace.
2. Fix the execution script and test it in isolation.
3. Update this directive if new edge cases or timing constraints are discovered.
