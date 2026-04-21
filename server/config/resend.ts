import { Resend } from 'resend';

// Initialize Resend safely so the server doesn't crash on boot if env vars are missing
export const resend = new Resend(process.env.RESEND_API_KEY || 're_dummykey_to_prevent_crash_12345');
