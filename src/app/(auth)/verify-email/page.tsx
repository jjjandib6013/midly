"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import DynamicCard from "@/components/ui/DynamicCard";
import NeonButton from "@/components/ui/NeonButton";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

function VerifyEmailLogic() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<"waiting" | "verifying" | "success" | "error" | "cross_verified">(token ? "verifying" : "waiting");
  const [errorMsg, setErrorMsg] = useState("");
  const [verifyPassword, setVerifyPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  useEffect(() => {
    if (token && emailParam) {
      verifyToken(token, emailParam);
    }
  }, [token, emailParam]);

  useEffect(() => {
    if (status === "waiting" && emailParam) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/api/auth/check-verification?email=${encodeURIComponent(emailParam)}`);
          const data = await res.json();
          if (data.verified) {
            setStatus("cross_verified");
          }
        } catch (e) {}
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status, emailParam]);

  const handleCrossDeviceLogin = async (e: React.FormEvent) => {
     e.preventDefault();
     setIsLoggingIn(true);
     try {
         const res = await signIn("credentials", { email: emailParam, password: verifyPassword, redirect: false });
         if (res?.error) {
            toast.error("Invalid password.");
            setIsLoggingIn(false);
         } else {
            window.location.href = "/kyc";
         }
     } catch (err) {
         toast.error("An error occurred");
         setIsLoggingIn(false);
     }
  }

  const verifyToken = async (tkn: string, email: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tkn, email })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      
      setStatus("success");
      toast.success("Email verified successfully! Please log in.");
      
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  return (
      <div ref={containerRef} className="w-full max-w-xl z-10 opacity-0">
         <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Identity Vault</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Secure mandatory email verification checkpoint.</p>
        </div>

        <DynamicCard className="border border-white/5 bg-[#0a0d14]/80 p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" hoverEffect={false}>
          
          {status === "waiting" && (
            <div className="text-center space-y-6">
               <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                  <Mail className="w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Check Your Inbox</h2>
               <p className="text-[#8892b0]">We have dispatched a highly secured verification link to your email address {emailParam ? <span className="text-white font-bold">{emailParam}</span> : null}.</p>
               <p className="text-sm font-medium text-white/50 mt-4">You cannot access the Midly platform until you click the link. If you didn't receive it, check your spam/junk folder.</p>
               
               <Link href="/login" className="block mt-8">
                  <NeonButton className="w-full text-sm !py-5 tracking-widest uppercase bg-[#111620]">
                     Return to Login
                  </NeonButton>
               </Link>
            </div>
          )}

          {status === "verifying" && (
            <div className="text-center space-y-6">
               <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Decrypting Token...</h2>
               <p className="text-[#8892b0]">Verifying your email securely against the database.</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-6">
               <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                  <ShieldCheck className="w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Verified</h2>
               <p className="text-[#8892b0]">Your email has been definitively linked to your account. You may now log in to the engine.</p>
               
               <Link href="/login" className="block mt-8">
                  <NeonButton className="w-full text-sm !py-5 tracking-widest uppercase">
                     Proceed to Login <ArrowRight className="w-4 h-4 ml-2" />
                  </NeonButton>
               </Link>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-6">
               <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Verification Failed</h2>
               <p className="text-red-400 font-bold">{errorMsg}</p>
               <p className="text-[#8892b0] text-sm">The link may have expired or been used already.</p>
               
               <Link href="/login" className="block mt-8">
                  <NeonButton className="w-full text-sm !py-5 tracking-widest uppercase">
                     Return to Login
                  </NeonButton>
               </Link>
            </div>
          )}

          {status === "cross_verified" && (
            <div className="text-center space-y-6">
               <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                  <ShieldCheck className="w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Verified on Phone!</h2>
               <p className="text-[#8892b0]">We detected that you magically verified this account on another device.</p>
               
               <p className="text-xs text-white/50 bg-white/5 p-4 rounded-xl border border-white/10 mt-4 text-left">For your security, you must enter your password one time to establish the encrypted session on this device.</p>
               
               <form onSubmit={handleCrossDeviceLogin} className="space-y-4 pt-4 border-t border-white/10">
                  <input type="password" placeholder="Confirm Password" value={verifyPassword} onChange={e=>setVerifyPassword(e.target.value)} className="w-full bg-[#030407] border border-white/10 text-white rounded-xl px-4 py-3 focus:border-primary/50 outline-none" required />
                  <NeonButton type="submit" className="w-full text-sm py-4 tracking-widest uppercase" isLoading={isLoggingIn}>Securely Log In</NeonButton>
               </form>
            </div>
          )}

        </DynamicCard>
      </div>
  );
}

export default function VerifyEmail() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <Suspense fallback={<div className="text-white z-10 text-xl font-bold uppercase tracking-widest">Loading security protocols...</div>}>
         <VerifyEmailLogic />
      </Suspense>
    </div>
  );
}
