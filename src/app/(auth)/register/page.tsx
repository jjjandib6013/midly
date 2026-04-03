"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, Phone, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
       const res = await fetch("http://localhost:5000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
       });
       const data = await res.json();
       
       if (!res.ok) throw new Error(data.error || "Registration Failed");
       
       localStorage.setItem("token", data.token); // Store token
       document.cookie = `token=${data.token}; path=/; max-age=86400`;
       router.push("/kyc"); // Enforce KYC logic immediately
    } catch (err: any) {
       setError(err.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Identity</h1>
          <p className="text-text-muted">Register to interact securely via smart escrows.</p>
        </div>

        <DynamicCard className="border border-dark-border/50 bg-dark-panel p-8" hoverEffect={false}>
          {error && (
             <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4"/> {error}
             </div>
          )}
          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4">
               {/* First Name */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-text-muted">First Name</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-text-muted" /></div>
                   <input type="text" onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary/50" required />
                 </div>
               </div>
               {/* Last Name */}
               <div className="space-y-2">
                 <label className="text-sm font-medium text-text-muted">Last Name</label>
                 <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-text-muted" /></div>
                   <input type="text" onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary/50" required />
                 </div>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Email Address (Requires Verification)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-text-muted" /></div>
                <input type="email" onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Mobile Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-text-muted" /></div>
                <input type="tel" onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-text-muted" /></div>
                <input type="password" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50" required minLength={8}/>
              </div>
              <p className="text-xs text-text-muted">Must be at least 8 characters</p>
            </div>

            <NeonButton type="submit" className="w-full gap-2 mt-4" isLoading={isLoading}>
              Next: Identity Verification <ArrowRight className="w-4 h-4" />
            </NeonButton>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Already verified?{" "}
              <Link href="/login" className="text-primary hover:text-white transition-colors font-medium">Log into Gateway</Link>
            </p>
          </div>
        </DynamicCard>
      </motion.div>
    </div>
  );
}
