"use client";

import { motion } from "framer-motion";
import { User, ShieldCheck, Mail, Phone, ExternalLink, Settings, ShieldAlert, Fingerprint, CheckCircle2 } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Profile() {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Account Profile
          </h1>
          <p className="text-text-muted mt-2">Manage your personal information and view strict KYC verification status.</p>
        </div>
        <NeonButton variant="secondary" className="gap-2 text-sm !px-4 !py-2.5 rounded-xl">
           <Settings className="w-4 h-4" /> Account Settings
        </NeonButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Personal Details */}
        <div className="md:col-span-2 space-y-6">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-dark-border/50 pb-4">
              <User className="w-5 h-5 text-text-muted" /> Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Full Legal Name</p>
                <p className="text-base font-medium text-white">Juan Dela Cruz</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">Email <ShieldCheck className="w-3 h-3 text-primary glow-icon"/></p>
                <p className="text-base font-medium text-white flex items-center gap-2">
                  trader@midly.com 
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Phone Number</p>
                <p className="text-base flex items-center gap-2 text-white">
                   +63 912 345 6789
                   <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/30 ml-2">Verified</span>
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Reputation Level</p>
                <p className="text-base font-bold text-primary flex items-center gap-1 glow-icon">
                   Trusted Escrow User
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
               <NeonButton variant="secondary" className="text-sm">
                 Edit Details
               </NeonButton>
            </div>
          </DynamicCard>

          <DynamicCard hoverEffect={false} className="border-t border-t-red-500/20 bg-red-500/5">
             <div className="flex items-start gap-4">
               <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <ShieldAlert className="w-6 h-6" />
               </div>
               <div>
                  <h4 className="font-bold text-white mb-1">Strict Anti-Fraud Security</h4>
                  <p className="text-sm text-text-muted mb-4 leading-relaxed">
                     Your verified information is permanently linked to your transactions. Any attempt to scam buyers or sellers will result in an immediate, permanent ban and details will be subjected to local dispute authorities.
                  </p>
               </div>
             </div>
          </DynamicCard>
        </div>

        {/* KYC Verification Sidebar */}
        <div className="md:col-span-1">
          <DynamicCard hoverEffect className="border-t-2 border-t-primary bg-dark-panel relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 p-8 border-l border-b border-dark-border rounded-bl-[100px] bg-dark-bg">
              <Fingerprint className="w-12 h-12 text-primary/20 glow-icon" />
            </div>

            <div className="relative z-10">
               <h3 className="font-bold text-white mb-6">KYC Status</h3>
               
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center glow-icon relative">
                     <ShieldCheck className="w-8 h-8 text-primary" />
                     <div className="absolute top-0 right-0 w-4 h-4 bg-primary rounded-full border-2 border-dark-panel" />
                  </div>
                  <div>
                     <h2 className="text-xl font-bold text-primary glow-icon">Verified</h2>
                     <p className="text-xs text-text-muted">Approved on Oct 10, 2026</p>
                  </div>
               </div>

               <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center bg-dark-bg p-3 rounded border border-dark-border">
                     <span className="text-sm text-white font-medium">Government ID</span>
                     <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex justify-between items-center bg-dark-bg p-3 rounded border border-dark-border">
                     <span className="text-sm text-white font-medium">Biometric Liveness</span>
                     <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
               </div>

               <p className="text-xs text-text-muted mb-6">
                 Your identity data is securely encrypted using AES-256 state-of-the-art standards.
               </p>

               <NeonButton variant="secondary" className="w-full text-sm gap-2">
                 View KYC Details <ExternalLink className="w-4 h-4"/>
               </NeonButton>
            </div>
          </DynamicCard>
        </div>

      </div>
    </div>
  );
}
