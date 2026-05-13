# Fraud & Risk Directive (Midly)

**Goal**: Proactively identify and prevent fraudulent activity on the platform.

## Risk Engine Scoring
The `calculateTransactionRisk()` function in `server/utils/riskEngine.ts` scores trades from 0 to 100 at creation time.

### Heuristic Signals & Point Values
| Signal | Points | Notes |
|---|---|---|
| Either account age < 24h | +25 | |
| Missing KYC (either party) | +20 | Edge case — `requireKYC` normally blocks first |
| Amount > 2× buyer's avg AND > ₱1,000 | +15 | PHP amounts |
| Buyer initiated 3+ trades in past hour | +15 | Velocity anomaly |
| Either party reputation score < 3.0 | +10 | Below Silver tier equivalent |
| High-risk chat content flagged in trade | +10 | Feeds from message `risk_level` |
| First-ever transaction for user | +5 | |
| **Total ≥ 81** | **AUTO-FREEZE** | Blocks PAY, alerts admin |

## Auto-Freeze Protocol
When a trade score reaches ≥ 81:
1. The transaction status is immediately set to `frozen`.
2. A system message is injected into the trade chat.
3. An admin `Notification` is created.
4. A `SYSTEM_FREEZE` event is written to the `AuditLog`.
5. Frozen trades can ONLY be cleared by administrators via `POST /admin/frozen-trades/:id/clear`.

## Message Moderation
- Every message in a trade room is tagged with a `risk_level` (Safe / High / Critical) computed server-side. Client-provided risk levels MUST be discarded.
- System-generated messages MUST use `sender_id: null` or a dedicated system user ID. Do not spoof buyer or seller IDs.
- Chat rooms MUST lock when a trade reaches a terminal state. New messages should return a `400 Bad Request`.
