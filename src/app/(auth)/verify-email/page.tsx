"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ShieldCheck, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import DynamicCard from "@/components/ui/DynamicCard";
import NeonButton from "@/components/ui/NeonButton";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import toast from "react-hot-toast";

const BROADCAST_CHANNEL_NAME = "midly_email_verification";
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailLogic() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [status, setStatus] = useState<"waiting" | "verifying" | "success" | "error">(token ? "verifying" : "waiting");
  const [errorMsg, setErrorMsg] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  // Helper: check verification status from server
  const checkVerificationStatus = useCallback(async () => {
    if (!emailParam || status !== "waiting") return;
    try {
      const res = await fetch(`${API_URL}/api/auth/check-verification?email=${encodeURIComponent(emailParam)}`);
      const data = await res.json();
      if (data.verified) {
        setStatus("success");
        toast.success("Email verified successfully!");
      }
    } catch (e) {}
  }, [emailParam, status]);

  // 1. Direct token verification (Tab B — opened from email link)
  useEffect(() => {
    if (token && emailParam) {
      verifyToken(token, emailParam);
    }
  }, [token, emailParam]);

  // 2. BroadcastChannel listener (Tab A — instant sync from Tab B)
  useEffect(() => {
    if (status !== "waiting") return;
    
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === "email_verified" && event.data?.email === emailParam) {
          setStatus("success");
          toast.success("Email verified successfully!");
        }
      };
      return () => bc.close();
    } catch (e) {
      // BroadcastChannel not supported — polling + visibilitychange will handle it
    }
  }, [status, emailParam]);

  // 3. Polling fallback (cross-device scenario — e.g. user clicked link on phone)
  useEffect(() => {
    if (status !== "waiting" || !emailParam) return;
    
    const interval = setInterval(checkVerificationStatus, 5000);
    return () => clearInterval(interval);
  }, [status, emailParam, checkVerificationStatus]);

  // 4. Revalidate on tab focus (user switches back to this tab)
  useEffect(() => {
    if (status !== "waiting") return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVerificationStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [status, checkVerificationStatus]);

  // 5. Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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

      // Broadcast to other tabs so they instantly update
      try {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage({ type: "email_verified", email });
        bc.close();
      } catch (e) {
        // BroadcastChannel not supported — other tabs will pick it up via polling
      }
      
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !emailParam) return;
    
    const loadingToast = toast.loading("Sending new verification email...");
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam })
      });
      const data = await res.json();
      toast.dismiss(loadingToast);
      if (res.ok) {
        toast.success("Verification email dispatched!");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        throw new Error(data.error || "Failed to resend");
      }
    } catch(err: any) {
      toast.dismiss(loadingToast);
      toast.error(err.message);
    }
  };

  return (
      <div ref={containerRef} className="w-full max-w-xl z-10 opacity-0">
         <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tighter uppercase">Identity Vault</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Secure mandatory email verification checkpoint.</p>
        </div>

        <DynamicCard className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" hoverEffect={false}>
          
          {status === "waiting" && (
            <div className="text-center space-y-6">
               <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/50">
                  <Mail className="w-8 h-8 text-primary" />
               </div>
               <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Check Your Inbox</h2>
               <p className="text-[#8892b0]">We have dispatched a highly secured verification link to your email address {emailParam ? <span className="text-white font-bold">{emailParam}</span> : null}.</p>
               <p className="text-sm font-medium text-white/50 mt-4">You cannot access the Midly platform until you click the link. If you didn&apos;t receive it, check your spam/junk folder.</p>
               
               <div className="flex flex-col gap-3 mt-8">
                  {emailParam && (
                     <NeonButton 
                        className={`w-full text-xs sm:text-sm !py-4 sm:!py-5 tracking-widest uppercase touch-manipulation ${resendCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={handleResend}
                        disabled={resendCooldown > 0}
                     >
                        {resendCooldown > 0 ? `Resend Available in ${resendCooldown}s` : "Resend Verification Email"}
                     </NeonButton>
                  )}
                  <Link href="/login" className="block">
                     <NeonButton variant="ghost" className="w-full text-xs sm:text-sm !py-4 sm:!py-5 tracking-widest uppercase bg-transparent text-[#8892b0] hover:text-white touch-manipulation border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all">
                        Return to Login
                     </NeonButton>
                  </Link>
               </div>
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
               
               <Link href={`/login${emailParam ? `?email=${encodeURIComponent(emailParam)}` : ''}`} className="block mt-8">
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

        </DynamicCard>
      </div>
  );
}

export default function VerifyEmail() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <Suspense fallback={<div className="text-white z-10 text-xl font-bold uppercase tracking-widest">Loading security protocols...</div>}>
         <VerifyEmailLogic />
      </Suspense>
    </div>
  );
}
