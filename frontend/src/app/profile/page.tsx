"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, Mail, Settings, LogOut, CheckCircle2 } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/user/profile", {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
         if (data.email) {
            setProfile(data);
         }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
     return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>
  }

  if (!profile) {
     return <div className="flex-1 flex items-center justify-center text-text-muted">You are not logged in.</div>
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          Your Identity
          <ShieldCheck className="w-8 h-8 text-primary glow-icon" />
        </h1>
        <p className="text-text-muted mt-2">Manage your verified credentials and security settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-dark-bg border-2 border-primary/50 flex items-center justify-center mb-4 relative glow-icon">
              <span className="text-3xl font-bold text-primary">{profile.first_name[0]}{profile.last_name[0]}</span>
              {profile.kyc.status === 'verified' && (
                 <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-dark-panel flex items-center justify-center shadow-[0_0_10px_rgba(63,229,108,0.5)]">
                   <CheckCircle2 className="w-4 h-4 text-black" />
                 </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{profile.first_name} {profile.last_name}</h2>
            <p className="text-sm text-text-muted flex items-center gap-1 mt-1 justify-center">
               <Mail className="w-3 h-3" /> {profile.email}
            </p>
            <div className="mt-6 w-full flex flex-col gap-2">
               <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">Reputation</span>
                  <span className="text-white font-bold text-lg">{profile.reputation_score} <span className="text-primary text-xs">/ 5.0</span></span>
               </div>
               <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted">KYC Status</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${profile.kyc.status === 'verified' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>{profile.kyc.status.toUpperCase()}</span>
               </div>
            </div>
          </DynamicCard>

          <DynamicCard hoverEffect={false} className="p-4 border border-dark-border bg-dark-panel/50 space-y-2">
             <NeonButton variant="ghost" className="w-full justify-start text-text-muted hover:text-white" onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
             }}>
                <LogOut className="w-4 h-4 mr-2" /> Log Out
             </NeonButton>
          </DynamicCard>
        </div>

        <div className="md:col-span-2 space-y-6">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg/30">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" /> Identity Verification
            </h3>
            
            {profile.kyc.status === 'verified' ? (
                <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-primary shrink-0 glow-icon" />
                  <div>
                    <h4 className="text-white font-bold">Identity Verified</h4>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                      Your identity has been securely verified. You have full access to create smart escrows and interact with other verified buyers and sellers.
                    </p>
                  </div>
                </div>
            ) : (
                <div className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-yellow-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-bold">Verification Required</h4>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed mb-4">
                      You need to complete your KYC to utilize the Midly platform safely.
                    </p>
                    <NeonButton onClick={() => window.location.href = "/kyc"} className="!py-2 !px-4 text-sm gap-2">
                       Verify Identity Now
                    </NeonButton>
                  </div>
                </div>
            )}
          </DynamicCard>

          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg/30">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Settings className="w-5 h-5 text-text-muted" /> Preferences
               </h3>
             </div>
             <p className="text-sm text-text-muted">Account settings and 2FA configuration will appear here.</p>
          </DynamicCard>
        </div>
      </div>
    </div>
  );
}
