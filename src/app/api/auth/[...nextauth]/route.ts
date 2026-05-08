import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET!,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // Generic rejection to prevent user enumeration attacks
        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        if (!(user as any).is_email_verified) {
            throw new Error("Please verify your email address first.");
        }

        // Record Login History and Detect New Device (Layer 1 Fraud Detection)
        try {
           const headersList = await import("next/headers").then(m => m.headers());
           const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "127.0.0.1";
           const userAgent = headersList.get("user-agent") || "Unknown Device";
           
           // Check if this IP/Device has been seen in the last 30 days
           const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
           const priorLogin = await prisma.loginHistory.findFirst({
              where: {
                 user_id: user.user_id,
                 ip_address: ip,
                 created_at: { gte: thirtyDaysAgo }
              }
           });

           // Log the current login
           await prisma.loginHistory.create({
              data: {
                 user_id: user.user_id,
                 ip_address: ip,
                 user_agent: userAgent,
                 location: "Unknown" // Can be enhanced with GeoIP later
              }
           });

           if (!priorLogin) {
              // Trigger New Device Email (Asynchronously)
              import("../../../../../server/config/resend").then(({ resend }) => {
                 const timeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
                 resend.emails.send({
                    to: user.email,
                    from: process.env.RESEND_FROM_EMAIL || 'security@midly.com',
                    subject: 'Security Alert: New Login to Midly',
                    html: `
                       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0d14; padding: 40px; border-radius: 12px; color: #fff; border: 1px solid #1f2937;">
                          <h2 style="color: #ef4444; font-size: 20px; text-transform: uppercase; margin-bottom: 20px; font-weight: 900;">⚠️ New Login Detected</h2>
                          <p style="color: #8892b0; font-size: 16px; line-height: 1.5; margin-bottom: 20px; font-weight: 500;">
                             We noticed a new login to your Midly account from an unrecognized IP address or device.
                          </p>
                          <div style="background-color: #111827; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                             <p style="margin: 0 0 10px 0; color: #fff;"><strong>IP Address:</strong> ${ip}</p>
                             <p style="margin: 0 0 10px 0; color: #fff;"><strong>Device:</strong> ${userAgent}</p>
                             <p style="margin: 0; color: #fff;"><strong>Time:</strong> ${timeStr} (PHT)</p>
                          </div>
                          <p style="color: #8892b0; font-size: 14px; line-height: 1.5; font-weight: 500;">
                             If this was you, you can safely ignore this email. If you did not log in, please reset your password immediately.
                          </p>
                       </div>
                    `
                 }).catch(err => console.error('[AUTH] Failed to send new login alert:', err));
              }).catch(err => console.error('Could not import resend for login alert', err));
           }
        } catch (err) {
           console.error("[AUTH] Fingerprinting error:", err);
        }

        return {
            id: user.user_id.toString(),
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role, // Inject role for routing
        };
      }
    })
  ],
  session: { 
     strategy: "jwt",
     maxAge: 7 * 24 * 60 * 60, // 7 days (matches our Express JWT lifecycle)
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Sign the token with the exact key and payload Express expects
        const expressToken = jwt.sign(
          { user_id: parseInt(user.id), role: (user as any).role },
          process.env.JWT_SECRET!,
          { expiresIn: '7d' }
        );
        token.expressJwt = expressToken;
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Inject the Express JWT so Next.js UI can send it in headers
      (session as any).accessToken = token.expressJwt;
      if (session.user) {
         (session.user as any).id = token.id;
         (session.user as any).role = token.role;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };
