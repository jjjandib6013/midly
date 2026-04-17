"use client";

import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { LoginSchema } from "@/lib/validations";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  // Inside handleLogin
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Zod Client-Side Zero-Trust Block
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      setIsLoading(false);
      const firstError = validation.error?.issues?.[0]?.message || "Invalid input";
      toast.error(firstError);
      setError(firstError);
      return;
    }

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (res?.error) {
         if (res.error === "Please verify your email address first.") {
            toast.error("Unverified Email. Redirecting to Identity Vault...");
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
         }

         const errorMsg = res.error === "CredentialsSignin" ? "Invalid email or password" : res.error;
         toast.error(errorMsg);
         throw new Error(errorMsg);
      }

      toast.success("Welcome back to Midly");
      // Force hard refresh to Next.js dashboard so session cookie is definitively swept up
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div
        ref={containerRef}
        className="w-full max-w-xl z-10 opacity-0"
      >
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 tracking-tighter uppercase">Log In</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Welcome back to Midly.</p>
        </div>

        <DynamicCard className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" hoverEffect={false}>
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 font-semibold">
              <ShieldAlert className="w-5 h-5" /> {error}
            </div>
          )}
          <form className="space-y-8" onSubmit={handleLogin}>
            <div className="space-y-3">
              <label htmlFor="login-email" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Verified Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-primary/50 transition-colors font-medium"
                  placeholder="name@domain.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label htmlFor="login-password" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-primary/50 transition-colors font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Link href="/forgot-password" className="text-xs text-primary hover:text-white transition-colors font-bold uppercase tracking-widest">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <NeonButton type="submit" className="w-full gap-3 mt-6 text-sm !py-5 tracking-widest uppercase" isLoading={isLoading}>
              Log In <ArrowRight className="w-4 h-4" />
            </NeonButton>
          </form>

          <div className="mt-10 text-center border-t border-white/[0.04] pt-8">
            <p className="text-sm text-[#8892b0] tracking-wide font-medium">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:text-white transition-colors font-bold uppercase tracking-wider ml-2">
                Register Here
              </Link>
            </p>
          </div>
        </DynamicCard>
      </div>
    </div>
  );
}
