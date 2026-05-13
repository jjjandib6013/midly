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
        const avg = await prisma.transaction.aggregate({
            where: {
                buyer_id: tx.buyer_id,
                status: 'completed'
            },
            _avg: { total_amount: true }
        });
        const avgAmount = Number(avg._avg.total_amount ?? 0);

        if (avgAmount > 0 && Number(tx.total_amount) > avgAmount * 2 && Number(tx.total_amount) > 50000) {
            score += 15;
            flags.push("Trade amount > 2x historical average");
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
        if (Number(tx.buyer.reputation_score ?? 0) < 50 || Number(tx.seller.reputation_score ?? 0) < 50) {
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
            where: { buyer_id: tx.buyer_id }
        });
        if (totalTrades <= 1) { // 1 means just this current one
            score += 5;
            flags.push("First transaction for user");
        }

        // --- AIL CONTEXTUAL RISK RULES ---
        
        // 8. Critical Context (+100): Regex/Pattern match for stolen/cracked slang
        const itemText = (tx.item_name || "").toLowerCase() + " " + JSON.stringify(tx.asset_metadata || {}).toLowerCase();
        const criticalKeywords = ['hacked', 'cracked', 'stolen', 'pulled', 'carded'];
        if (criticalKeywords.some(kw => itemText.includes(kw))) {
            score += 100;
            flags.push("CRITICAL: Contains stolen/cracked keywords");
        }

        // 9. High Risk Context (+30): Missing original email on Game Account
        if (tx.trade_category === 'Game Account') {
            const metadata = tx.asset_metadata as Record<string, any> || {};
            const emailStatus = metadata?.linkedEmailStatus || metadata?.linked_email_status || 'Unknown';
            if (emailStatus !== 'Original' && emailStatus !== 'Original (OGE)') {
                score += 30;
                flags.push("HIGH RISK: Game Account missing Original Email");
            }
        }

        // Cap score at 100
        score = Math.min(score, 100);

        // Auto-freeze logic if score >= 81
        let isFrozen = tx.is_frozen || false;
        if (score >= 81 && !tx.is_frozen && tx.status !== 'completed' && tx.status !== 'cancelled') {
            isFrozen = true;
            flags.push("AUTO-FROZEN (Score >= 81)");
            
            // Generate audit log for auto-freeze
            const { logAudit, ACTION_TYPES } = await import('./auditLogger');
            await logAudit({
               transactionId: transactionId,
               userId: tx.buyer_id,
               actionType: ACTION_TYPES.SYSTEM_FREEZE,
               description: `System automatically frozen transaction due to high risk score (${score})`,
               ip: 'system',
               riskScore: score,
               metadata: { risk_flags: flags, score, threshold: 81, previous_status: tx.status }
            });

            // Emit real-time WebSocket event to notify users in the trade room
            try {
                const { io } = await import('../../server');
                if (io) {
                    io.to(`trade_${transactionId}`).emit('trade_updated', 'frozen');
                }
            } catch (e) {
                console.error('[Risk Engine] Failed to emit WebSocket event:', e);
            }
        }

        // Update transaction
        await prisma.transaction.update({
            where: { transaction_id: transactionId },
            data: {
                risk_score: score,
                risk_flags: flags,
                is_frozen: isFrozen
            }
        });

        return { score, flags };
    } catch (error) {
        console.error(`[Risk Engine] Error calculating risk for TX ${transactionId}:`, error);
        return { score: 0, flags: [] };
    }
}
