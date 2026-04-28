"use client";

import { useState, useRef, Suspense } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Lock, CheckCircle, ShieldAlert, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { API_URL } from "@/lib/api";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [autoLoginFailed, setAutoLoginFailed] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!token) {
      setIsLoading(false);
      setError("Invalid or missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setIsLoading(false);
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setIsLoading(false);
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");
      
      setSuccess(true);
      setResetEmail(data.email || "");

      // Auto-login: the user just typed their new password — no need to make them type it again
      if (data.email) {
        setIsAutoLogging(true);
        try {
          const loginRes = await signIn("credentials", {
            email: data.email,
            password: password,
            redirect: false
          });

          if (loginRes?.error) {
            throw new Error(loginRes.error);
          }

          toast.success("Password updated. Welcome back!");

          // Route to correct dashboard based on role
          try {
            const sessionRes = await fetch("/api/auth/session");
            const sessionData = await sessionRes.json();
            if (sessionData?.user?.role === 'admin') {
              window.location.href = "/admin";
              return;
            }
          } catch (e) {}

          window.location.href = "/dashboard";
        } catch (loginErr) {
          // Auto-login failed — fall back to manual login with email pre-filled
          setIsAutoLogging(false);
          setAutoLoginFailed(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
     return (
        <div className="w-full max-w-xl z-10 text-center">
            <h1 className="text-3xl font-black text-white mb-4 uppercase">Invalid Link</h1>
            <p className="text-[#8892b0] mb-8">This password reset link is invalid or has expired.</p>
            <Link href="/forgot-password"><NeonButton>Request New Link</NeonButton></Link>
        </div>
     );
  }

  return (
      <div
        ref={containerRef}
        className="w-full max-w-xl z-10 opacity-0"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tighter uppercase">Update Password</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Enter and confirm your new strong password.</p>
        </div>

        <DynamicCard className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" hoverEffect={false}>
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 font-semibold">
              <ShieldAlert className="w-5 h-5" /> {error}
            </div>
          )}
          
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                 {isAutoLogging ? (
                   <Loader2 className="w-8 h-8 text-primary animate-spin" />
                 ) : (
                   <CheckCircle className="w-8 h-8 text-primary" />
                 )}
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Password Updated</h2>
              
              {isAutoLogging ? (
                <p className="text-[#8892b0]">Signing you in automatically...</p>
              ) : autoLoginFailed ? (
                <>
                  <p className="text-[#8892b0]">Your password has been updated. Please log in with your new credentials.</p>
                  <Link href={`/login${resetEmail ? `?email=${encodeURIComponent(resetEmail)}` : ''}`} className="block mt-8">
                     <NeonButton className="w-full text-sm !py-5 tracking-widest uppercase">
                        Proceed to Login <ArrowRight className="w-4 h-4 ml-2" />
                     </NeonButton>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-[#8892b0]">Your new credentials have been securely stored. Redirecting...</p>
                </>
              )}
            </div>
          ) : (
             <form className="space-y-8" onSubmit={handleReset}>
               <div className="space-y-3">
                 <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1">New Password</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Lock className="h-5 w-5 text-[#8892b0]" />
                   </div>
                   <input
                     type="password"
                     value={password}
                     onChange={e => setPassword(e.target.value)}
                     className="w-full bg-[#030407] border border-white/10 text-white rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-primary/50 transition-colors font-medium"
                     placeholder="••••••••"
                     required
                     minLength={8}
                   />
                 </div>
               </div>
               
               <div className="space-y-3">
                 <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1">Confirm Password</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Lock className="h-5 w-5 text-[#8892b0]" />
                   </div>
                   <input
                     type="password"
                     value={confirmPassword}
                     onChange={e => setConfirmPassword(e.target.value)}
                     className="w-full bg-[#030407] border border-white/10 text-white rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-primary/50 transition-colors font-medium"
                     placeholder="••••••••"
                     required
                     minLength={8}
                   />
                 </div>
               </div>

               <NeonButton type="submit" className="w-full gap-3 mt-6 text-sm !py-5 tracking-widest uppercase" isLoading={isLoading}>
                 Update Password <ArrowRight className="w-4 h-4" />
               </NeonButton>
             </form>
          )}
        </DynamicCard>
      </div>
  );
}

export default function ResetPassword() {
   return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <Suspense fallback={<div className="text-white z-10 w-full max-w-xl text-center">Loading...</div>}>
         <ResetPasswordForm />
      </Suspense>
    </div>
   );
}
