import { Queue } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Toggle via environment: set KYC_QUEUE_FALLBACK=false in production to use Redis+BullMQ
const USE_FALLBACK = process.env.KYC_QUEUE_FALLBACK !== 'false';

export const kycQueue = USE_FALLBACK
  ? { add: async (name: string, data: any, opts: any = {}) => {
        console.log(`[Queue Fallback] Job ${name} added to in-process queue.`);
        const worker = require('./worker');
        const delay = opts.delay || 100;
        if (name === 'verify-kyc-phase2') setTimeout(() => worker.processKycPhase2(data), delay);
        else if (name === 'verify-kyc-phase3') setTimeout(() => worker.processKycPhase3(data), delay);
        else if (name === 'auto-release') setTimeout(() => worker.processAutoRelease(data), delay);
        else if (name === 'crypto-shredder') setTimeout(() => worker.processCryptoShredder(data), delay);
        return { id: Math.random() };
     } }
  : new Queue('kyc-processing', {
      connection: {
         host: REDIS_HOST,
         port: REDIS_PORT
      }
   });
