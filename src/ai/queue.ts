import { Queue } from 'bullmq';

import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Toggle via environment: use fallback in local development by default, but use Redis in production
const isDev = process.env.NODE_ENV !== 'production';
const USE_FALLBACK = isDev ? process.env.KYC_QUEUE_FALLBACK !== 'false' : process.env.KYC_QUEUE_FALLBACK === 'true';

export const kycQueue = USE_FALLBACK
  ? { add: async (name: string, data: any, opts: any = {}) => {
        console.log(`[Queue Fallback] Job ${name} added to in-process queue.`);
        const worker = require('./worker');
        const delay = opts.delay || 100;
        if (name === 'verify-kyc-phase2') setTimeout(() => worker.processKycPhase2(data), delay);
        else if (name === 'verify-kyc-phase3') setTimeout(() => worker.processKycPhase3(data), delay);
        else if (name === 'auto-release') setTimeout(() => worker.processAutoRelease(data), delay);
        else if (name === 'crypto-shredder') setTimeout(() => worker.processCryptoShredder(data), delay);
        else if (name === 'auto-cancel-invite') setTimeout(() => worker.processAutoCancelInvite(data), delay);
        return { id: Math.random() };
     } }
  : new Queue('kyc-processing', { 
      connection: process.env.REDIS_URL 
          ? new IORedis(process.env.REDIS_URL.endsWith(':') ? process.env.REDIS_URL.slice(0, -1) : process.env.REDIS_URL, { maxRetriesPerRequest: null, password: process.env.REDIS_PASSWORD }) 
          : { host: REDIS_HOST, port: REDIS_PORT, password: process.env.REDIS_PASSWORD }
    });
