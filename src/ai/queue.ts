import { Queue } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Toggle via environment: set KYC_QUEUE_FALLBACK=false in production to use Redis+BullMQ
const USE_FALLBACK = process.env.KYC_QUEUE_FALLBACK !== 'false';

export const kycQueue = USE_FALLBACK
  ? { add: async (name: string, data: any) => {
        console.log(`[Queue Fallback] Job ${name} added to in-process queue.`);
        const worker = require('./worker');
        if (name === 'verify-kyc-phase2') setTimeout(() => worker.processKycPhase2(data), 100);
        else if (name === 'verify-kyc-phase3') setTimeout(() => worker.processKycPhase3(data), 100);
        return { id: Math.random() };
     } }
  : new Queue('kyc-processing', {
      connection: {
         host: REDIS_HOST,
         port: REDIS_PORT
      }
   });
