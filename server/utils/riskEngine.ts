import { prisma } from '../config/db';

/**
 * Calculates a heuristic risk score for a transaction.
 * Updates the transaction record with the new score and flags.
 * Returns the updated score.
 */
export async function calculateTransactionRisk(transactionId: number): Promise<{ score: number; flags: string[] }> {
    try {
        const tx = await prisma.transaction.findUnique({
            where: { transaction_id: transactionId },
            include: {
                buyer: { include: { kyc_verification: true } },
                seller: { include: { kyc_verification: true } },
                messages: true
            }
        });

        if (!tx) throw new Error("Transaction not found");

        let score = 0;
        const flags: string[] = [];

        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // 1. Account Age < 24 hours (+25)
        const buyerAge = now.getTime() - new Date(tx.buyer.created_at).getTime();
        const sellerAge = now.getTime() - new Date(tx.seller.created_at).getTime();
        if (buyerAge < oneDayMs || sellerAge < oneDayMs) {
            score += 25;
            flags.push("Account age < 24h");
        }

        // 2. No KYC Verification (+20)
        const buyerKyc = tx.buyer.kyc_verification?.status === 'verified';
        const sellerKyc = tx.seller.kyc_verification?.status === 'verified';
        if (!buyerKyc || !sellerKyc) {
            score += 20;
            flags.push("Missing KYC verification");
        }

        // 3. Trade amount > 2x average (Using a simplified average for now) (+15)
        // Check buyer's past completed trades
        const pastTrades = await prisma.transaction.findMany({
            where: {
                buyer_id: tx.buyer_id,
                status: 'completed'
            },
            select: { total_amount: true }
        });

        if (pastTrades.length > 0) {
            const avgAmount = pastTrades.reduce((acc, t) => acc + Number(t.total_amount), 0) / pastTrades.length;
            if (Number(tx.total_amount) > avgAmount * 2 && Number(tx.total_amount) > 1000) { // minimum threshold 1000 to ignore noise
                score += 15;
                flags.push("Trade amount > 2x historical average");
            }
        }

        // 4. 3+ trades created in 1 hour (+15)
        const recentTradesCount = await prisma.transaction.count({
            where: {
                buyer_id: tx.buyer_id,
                created_at: { gte: oneHourAgo }
            }
        });
        if (recentTradesCount >= 3) {
            score += 15;
            flags.push("Velocity anomaly: 3+ trades/hr");
        }

        // 5. Counterparty has low reputation (+10)
        // Assume default reputation is 0 or 5. Let's say < 3.0 is low.
        if (Number(tx.buyer.reputation_score || 5) < 3.0 || Number(tx.seller.reputation_score || 5) < 3.0) {
            score += 10;
            flags.push("Low counterparty reputation");
        }

        // 6. Chat flagged as high-risk (+10)
        const hasHighRiskChat = tx.messages.some(m => m.risk_level === 'High' || m.risk_level === 'Critical');
        if (hasHighRiskChat) {
            score += 10;
            flags.push("Chat contains high-risk patterns");
        }

        // 7. First-ever transaction (+5)
        const totalTrades = await prisma.transaction.count({
            where: {
                OR: [
                    { buyer_id: tx.buyer_id },
                    { seller_id: tx.seller_id }
                ]
            }
        });
        if (totalTrades <= 1) { // 1 means just this current one
            score += 5;
            flags.push("First transaction for user");
        }

        // Cap score at 100
        score = Math.min(score, 100);

        // Auto-freeze logic if score >= 81
        let updatedStatus = tx.status;
        if (score >= 81 && tx.status !== 'frozen' && tx.status !== 'completed' && tx.status !== 'cancelled') {
            updatedStatus = 'frozen';
            flags.push("AUTO-FROZEN (Score >= 81)");
            
            // Generate audit log for auto-freeze
            await prisma.auditLog.create({
               data: {
                  transaction_id: transactionId,
                  user_id: tx.buyer_id, // System action, attribute to trade context
                  action_type: 'SYSTEM_FREEZE',
                  action_description: `System automatically frozen transaction due to high risk score (${score})`,
                  ip_address: '127.0.0.1',
                  risk_score: score
               }
            });
        }

        // Update transaction
        await prisma.transaction.update({
            where: { transaction_id: transactionId },
            data: {
                risk_score: score,
                risk_flags: flags,
                status: updatedStatus
            }
        });

        return { score, flags };
    } catch (error) {
        console.error(`[Risk Engine] Error calculating risk for TX ${transactionId}:`, error);
        return { score: 0, flags: [] };
    }
}
