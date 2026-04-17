"use client";

import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldAlert } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to process request");
      
      setSuccess(true);
      toast.success(data.message || "Reset link sent!");
      
      // For development ONLY
      if (data._devToken) {
         console.log(`Reset Token Link: http://localhost:3000/reset-password?token=${data._devToken}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div
        ref={containerRef}
        className="w-full max-w-xl z-10 opacity-0"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tighter uppercase">Reset Password</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Enter your email to receive recovery instructions.</p>
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
                 <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Check Your Inbox</h2>
              <p className="text-[#8892b0]">If an account exists for <span className="text-white font-bold">{email}</span>, a secure password reset link has been dispatched.</p>
              <p className="text-sm font-medium text-white/50 mt-4">Haven't received any email yet? Check your spam/junk folder.</p>
              
              <div className="space-y-4 mt-8">
                 <button 
                   onClick={handleForgot} 
                   disabled={isLoading}
                   className="w-full bg-[#111620] hover:bg-[#1a2130] text-white text-sm py-4 rounded-xl border border-white/10 transition-colors uppercase tracking-widest font-bold disabled:opacity-50"
                 >
                   {isLoading ? "Resending..." : "Resend Email"}
                 </button>
                 
                 <Link href="/login" className="block">
                    <NeonButton className="w-full text-sm !py-5 tracking-widest uppercase">
                       Return to Login
                    </NeonButton>
                 </Link>
              </div>
            </div>
          ) : (
             <form className="space-y-8" onSubmit={handleForgot}>
               <div className="space-y-3">
                 <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1">Registered Email</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <Mail className="h-5 w-5 text-[#8892b0]" />
                   </div>
                   <input
                     type="email"
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                     className="w-full bg-[#030407] border border-white/10 text-white rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-primary/50 transition-colors font-medium"
                     placeholder="name@domain.com"
                     required
                   />
                 </div>
               </div>

               <NeonButton type="submit" className="w-full gap-3 mt-6 text-sm !py-5 tracking-widest uppercase" isLoading={isLoading}>
                 Send Reset Link <ArrowRight className="w-4 h-4" />
               </NeonButton>
             </form>
          )}

          {!success && (
             <div className="mt-10 text-center border-t border-white/[0.04] pt-8">
               <p className="text-sm text-[#8892b0] tracking-wide font-medium">
                 Remembered your password?{" "}
                 <Link href="/login" className="text-primary hover:text-white transition-colors font-bold uppercase tracking-wider ml-2">
                   Log In
                 </Link>
               </p>
             </div>
          )}
        </DynamicCard>
      </div>
    </div>
  );
}
