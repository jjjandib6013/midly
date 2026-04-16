"use client";

import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, Phone, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { RegisterSchema } from "@/lib/validations";
import { API_URL } from "@/lib/api";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '', confirmPassword: '', phone: '', birthdate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" });
  }, { scope: containerRef });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setIsLoading(false);
      toast.error("Passwords do not match");
      setError("Passwords do not match");
      return;
    }

    // Zod Client-Side Zero-Trust Block
    const validation = RegisterSchema.safeParse(formData);
    if (!validation.success) {
      setIsLoading(false);
      const firstError = validation.error?.issues?.[0]?.message || "Invalid input parameters.";
      toast.error(firstError);
      setError(firstError);
      return;
    }

    try {
       const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
       });
       const data = await res.json();
       
       if (!res.ok) throw new Error(data.error || "Registration Failed");
       
       toast.success("Account securely created! Redirecting to Identity Vault...");
       
       router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
       toast.error(err.message);
       setError(err.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div
        ref={containerRef}
        className="w-full max-w-2xl z-10 opacity-0"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black text-white mb-4 tracking-tighter">Create Account</h1>
          <p className="text-[#8892b0] font-medium tracking-wide">Register to trade securely.</p>
        </div>

        <DynamicCard className="border border-white/5 bg-[#0a0d14]/80 p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]" hoverEffect={false}>
          {error && (
             <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 font-semibold">
                <ShieldAlert className="w-5 h-5"/> {error}
             </div>
          )}
          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* First Name */}
               <div className="space-y-2 w-full">
                 <label htmlFor="reg-first-name" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">First Name</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-text-muted" /></div>
                   <input id="reg-first-name" type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" required />
                 </div>
               </div>
               {/* Last Name */}
               <div className="space-y-2 w-full">
                 <label htmlFor="reg-last-name" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Last Name</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-5 w-5 text-text-muted" /></div>
                   <input id="reg-last-name" type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" required />
                 </div>
               </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-text-muted" /></div>
                <input id="reg-email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Phone Number */}
               <div className="space-y-2 w-full">
                 <label htmlFor="reg-phone" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Phone Number</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-text-muted" /></div>
                   <input id="reg-phone" type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" />
                 </div>
               </div>
               {/* Date of Birth */}
               <div className="space-y-2 w-full">
                 <label htmlFor="reg-birthdate" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Date of Birth</label>
                 <div className="relative">
                   <input id="reg-birthdate" type="date" value={formData.birthdate} onChange={e => setFormData({...formData, birthdate: e.target.value} as any)} className="w-full bg-dark-bg border border-dark-border text-text-muted rounded-2xl px-4 py-4 focus:outline-none focus:border-primary/50 font-medium focus:text-white" required />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 w-full">
                <label htmlFor="reg-password" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-text-muted" /></div>
                  <input id="reg-password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" required minLength={8}/>
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted pl-1">Minimum 8 characters</p>
              </div>
              <div className="space-y-2 w-full">
                <label htmlFor="reg-confirm-password" className="text-xs font-black text-text-muted uppercase tracking-widest pl-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-text-muted" /></div>
                  <input id="reg-confirm-password" type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 font-medium" required minLength={8}/>
                </div>
              </div>
            </div>

            <NeonButton type="submit" className="w-full gap-3 mt-8 text-sm uppercase tracking-widest !py-5" isLoading={isLoading}>
              Create Account <ArrowRight className="w-5 h-5" />
            </NeonButton>
          </form>

          <div className="mt-8 pt-8 border-t border-white/[0.04] text-center">
            <p className="text-sm text-[#8892b0] tracking-wide font-medium">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-white transition-colors font-bold tracking-wider uppercase ml-2">Log in here</Link>
            </p>
          </div>
        </DynamicCard>
      </div>
    </div>
  );
}
