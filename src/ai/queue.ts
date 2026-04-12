import { Queue } from 'bullmq';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Toggle to false if Redis is available, true for local development fallback
const USE_FALLBACK = true; 

export const kycQueue = USE_FALLBACK 
  ? { add: async (name: string, data: any) => {
        console.log(`[Queue Mock] Job ${name} added to local async queue.`);
        // To prevent cyclic import in mock, we will defer the process execution to the caller
        // Or trigger it via events.
        const { processKycJob } = require('./worker');
        setTimeout(() => processKycJob(data), 100);
        return { id: Math.random() };
     } }
  : new Queue('kyc-processing', {
      connection: {
         host: REDIS_HOST,
         port: REDIS_PORT
      }
   });
