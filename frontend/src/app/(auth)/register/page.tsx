"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, User } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function RegisterPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="mb-8 text-center flex flex-col items-center">
          <ShieldCheck className="w-12 h-12 text-primary glow-icon mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-text-muted">Start trading safely with zero blind trust.</p>
        </div>

        <DynamicCard hoverEffect={false} className="border border-dark-border/50 bg-dark-panel p-8">
          <form className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="text"
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Juan Dela Cruz"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="email"
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="trader@midly.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="password"
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <p className="text-xs text-text-muted mt-4">
              By registering, you agree to MIDLY's strict Zero-Tolerance Fraud Policy and Anti-Scam guidelines.
            </p>

            <Link href="/kyc" className="block mt-6">
              <NeonButton className="w-full text-lg glow-icon">
                Continue to KYC Verification
              </NeonButton>
            </Link>
          </form>
        </DynamicCard>

        <p className="mt-8 text-center text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
