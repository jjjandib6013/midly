/**
 * Midly Reputation Engine
 * 
 * Centralized logic for calculating reputation tiers, fee discounts, and score boundaries.
 */

export const SCORE_GAIN_SELLER = 0.5;
export const SCORE_GAIN_BUYER = 0.1;
export const SCORE_PENALTY = 10.0;
export const SCORE_CAP = 100.0;

export function isEligibleForScore(createdAt: Date): boolean {
    const ageInMs = Date.now() - createdAt.getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return ageInMs >= sevenDaysInMs;
}

export function getTier(score: number): 'Gold' | 'Silver' | 'Bronze' {
    if (score >= 90) return 'Gold';
    if (score >= 50) return 'Silver';
    return 'Bronze';
}

export function getFeeRate(score: number, baseFee: number = 0.05): number {
    const tier = getTier(score);
    let feeRate = baseFee;
    
    if (tier === 'Gold') {
        feeRate = Math.max(0, feeRate - 0.02);
    } else if (tier === 'Silver') {
        feeRate = Math.max(0, feeRate - 0.01);
    }
    
    return feeRate;
}

export function clampScore(score: number, adjustment: number): number {
    return Math.min(SCORE_CAP, Math.max(0, score + adjustment));
}
