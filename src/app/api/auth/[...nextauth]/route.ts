import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "default_secret",
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

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          // Generic rejection to prevent user enumeration attacks
          if (!user || !user.password_hash) return null;

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) return null;

          return {
             id: user.user_id.toString(),
             email: user.email,
             name: `${user.first_name} ${user.last_name}`,
          };
        } catch (error) {
          console.error("NextAuth Authorize Error:", error);
          return null;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
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
          { user_id: parseInt(user.id) },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        token.expressJwt = expressToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Inject the Express JWT so Next.js UI can send it in headers
      (session as any).accessToken = token.expressJwt;
      if (session.user) {
         (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  }
});

export { handler as GET, handler as POST };
