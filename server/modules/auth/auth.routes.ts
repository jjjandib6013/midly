import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';
import { resend } from '../../config/resend';
import { authLimiter } from '../../shared/middlewares/rateLimiter';
import { RegisterSchema } from '../../../src/lib/validations';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = Router();

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const validation = RegisterSchema.safeParse(req.body);
      if (!validation.success) {
         return res.status(400).json({ error: validation.error.issues[0].message });
      }

      const { first_name, last_name, email, password, phone, birthdate } = validation.data;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'Email already exists' });

      const password_hash = await bcrypt.hash(password, 10);
      const verification_token = crypto.randomBytes(32).toString('hex');

      const user = await prisma.user.create({
         data: { 
            first_name, 
            last_name, 
            email, 
            password_hash, 
            phone, 
            birthdate: new Date(birthdate), 
            wallet_balance: 0.00,
            is_email_verified: false,
            email_verification_token: verification_token
         } as any
      });

      // Send Verification Email
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const verifyUrl = `${clientUrl}/verify-email?token=${verification_token}&email=${encodeURIComponent(email)}`;
      
      try {
         const emailResult = await resend.emails.send({
            to: user.email,
            from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
            subject: 'Midly - Verify Your Email Address',
            html: `
               <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
                  <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Welcome to Midly</h2>
                  <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                     You have successfully registered your account. To unlock the Midly Escrow Engine, you must first verify your email address.
                  </p>
                  <a href="${verifyUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                     VERIFY EMAIL ADDRESS
                  </a>
               </div>
            `
         });
         console.log('[EMAIL] Registration verification sent:', JSON.stringify(emailResult));
      } catch (emailError) {
         console.error('[EMAIL ERROR] Failed to send registration verification email:', emailError);
         console.log(`[DEV FALLBACK] Verify Email Link: ${verifyUrl}`);
      }

      res.json({ message: 'User registered successfully', user_email: user.email });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error', msg: error.message });
   }
});

router.post('/verify-email', authLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const { email, token } = req.body;
      if (!email || !token) return res.status(400).json({ error: 'Email and token required.' });

      const user: any = await prisma.user.findFirst({
         where: { email, email_verification_token: token } as any
      });

      if (!user) return res.status(400).json({ error: 'Invalid verification token or email.' });

      await prisma.user.update({
         where: { user_id: user.user_id },
         data: { is_email_verified: true, email_verification_token: null } as any
      });

      res.json({ message: 'Email successfully verified!' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

router.post('/resend-verification', authLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required.' });

      const user: any = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: 'Account not found.' });
      if (user.is_email_verified) return res.status(400).json({ error: 'Email is already verified.' });

      let token = user.email_verification_token;
      if (!token) {
         token = crypto.randomBytes(32).toString('hex');
         await prisma.user.update({
            where: { email },
            data: { email_verification_token: token } as any
         });
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const verifyUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
      
      try {
         const emailResult = await resend.emails.send({
            to: user.email,
            from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
            subject: 'Midly - Verify Your Email Address (Resend)',
            html: `
               <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
                  <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Welcome to Midly</h2>
                  <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                     You have requested a new verification link. To unlock the Midly Escrow Engine, you must first verify your email address.
                  </p>
                  <a href="${verifyUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                     VERIFY EMAIL ADDRESS
                  </a>
               </div>
            `
         });
         console.log('[EMAIL] Resend verification sent:', JSON.stringify(emailResult));
      } catch (emailError) {
         console.error('[EMAIL ERROR] Failed to resend verification email:', emailError);
         console.log(`[DEV FALLBACK] Verify Email Link: ${verifyUrl}`);
         return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }

      res.json({ message: 'Verification email resent successfully' });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

router.get('/check-verification', async (req: Request, res: Response): Promise<any> => {
   try {
      const email = req.query.email as string;
      if (!email) return res.status(400).json({ error: 'Email required' });
      
      const user: any = await prisma.user.findUnique({
         where: { email }
      });
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      res.json({ verified: user.is_email_verified });
   } catch (error) {
      res.status(500).json({ error: 'Server error' });
   }
});

router.post('/forgot-password', authLimiter, async (req: Request, res: Response): Promise<any> => {
   try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
         return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
         where: { email },
         data: { reset_password_token: token, reset_password_expires: expires }
      });

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const resetUrl = `${clientUrl}/reset-password?token=${token}`;

      try {
         const emailResult = await resend.emails.send({
            to: user.email,
            from: process.env.RESEND_FROM_EMAIL || 'support@midly.com',
            subject: 'Midly - Password Reset Request',
            html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
                     <h2 style="color: #fff; font-size: 24px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">Password Reset</h2>
                     <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 40px; font-weight: 500;">
                        We received a request to securely reset your password on Midly. Click the button below to authenticate your new credentials.
                     </p>
                     <a href="${resetUrl}" style="background-color: #3fe56c; color: #000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
                        RESET PASSWORD
                     </a>
                     <p style="margin-top: 40px; color: #8892b0; font-size: 12px; line-height: 1.5; font-weight: 500;">
                        If you did not request this, please ignore this email. This secure link will expire in exactly 1 hour.
                     </p>
                  </div>
               `
         });
         console.log('[EMAIL] Password reset sent:', JSON.stringify(emailResult));
      } catch (emailError) {
         console.error('[EMAIL ERROR] Failed to send password reset email:', emailError);
         console.log(`[DEV FALLBACK] Reset Password Link: ${resetUrl}`);
      }
      res.json({ message: 'If that email is registered, a password reset link has been sent.' });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

router.post('/reset-password', async (req: Request, res: Response): Promise<any> => {
   try {
      const { token, new_password } = req.body;
      if (!token || !new_password) return res.status(400).json({ error: 'Token and new password are required' });

      if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters long.' });

      const user = await prisma.user.findFirst({
         where: {
            reset_password_token: token,
            reset_password_expires: { gt: new Date() }
         }
      });

      if (!user) {
         return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }

      const password_hash = await bcrypt.hash(new_password, 10);

      await prisma.user.update({
         where: { user_id: user.user_id },
         data: {
            password_hash,
            reset_password_token: null,
            reset_password_expires: null,
            is_email_verified: true,
            last_password_change: new Date()
         } as any
      });

      res.json({ message: 'Password has been securely updated.', email: user.email });
   } catch (error: any) {
      res.status(500).json({ error: 'Server error' });
   }
});

export default router;
