"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, UploadCloud, ChevronRight, Fingerprint, Camera } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function KYCPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isUploading, setIsUploading] = useState(false);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep((curr) => Math.min(curr + 1, 3) as 1 | 2 | 3);
    }, 1500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-panel border border-primary/30 mb-6 glow-icon">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Identity Verification</h1>
          <p className="text-text-muted max-w-md mx-auto">
            MIDLY requires strict KYC to permanently eliminate ghosting and scammers. 
            Once verified, you are fully protected to trade.
          </p>
        </div>

        <DynamicCard className="border border-dark-border/50 bg-dark-panel p-8" hoverEffect={false}>
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-dark-border -translate-y-1/2 z-0" />
            <div 
              className="absolute top-1/2 left-0 h-[2px] bg-primary glow-icon -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${(step - 1) * 50}%` }}
            />
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 1 ? "bg-dark-bg border-primary text-primary" : "bg-dark-bg border-dark-border text-text-muted"}`}>1</div>
              <span className={`text-xs font-semibold ${step >= 1 ? "text-white" : "text-text-muted"}`}>Government ID</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 2 ? "bg-dark-bg border-primary text-primary glow-icon" : "bg-dark-bg border-dark-border text-text-muted"}`}>2</div>
              <span className={`text-xs font-semibold ${step >= 2 ? "text-white" : "text-text-muted"}`}>Selfie Verification</span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${step >= 3 ? "bg-dark-bg border-primary text-primary glow-icon" : "bg-dark-bg border-dark-border text-text-muted"}`}>3</div>
              <span className={`text-xs font-semibold ${step >= 3 ? "text-white" : "text-text-muted"}`}>Verified</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-full h-48 border-2 border-dashed border-dark-border rounded-xl flex flex-col items-center justify-center bg-dark-bg/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                  <UploadCloud className="w-10 h-10 text-text-muted group-hover:text-primary transition-colors mb-3" />
                  <p className="text-sm font-medium text-white mb-1">Click to upload valid ID</p>
                  <p className="text-xs text-text-muted">Passport, Driver's License, or National ID</p>
                </div>
                <NeonButton onClick={handleSimulateUpload} isLoading={isUploading} className="w-full gap-2">
                  Submit ID Document <ChevronRight className="w-4 h-4" />
                </NeonButton>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-48 h-48 border border-dark-border rounded-full flex flex-col items-center justify-center bg-dark-bg/50 overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop')] bg-cover opacity-50 sepia-[.3] hue-rotate-[90deg] saturate-[2]" />
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-full scale-105" />
                  <div className="w-full h-[2px] bg-primary absolute top-1/2 left-0 shadow-[0_0_15px_#3FE56C] animate-[bounce_3s_ease-in-out_infinite] z-20" />
                  <Camera className="w-10 h-10 text-white z-10 drop-shadow-md relative" />
                </div>
                <p className="text-sm text-text-muted max-w-xs">
                  Position your face in the oval. AI will verify this matches your submitted ID document.
                </p>
                <NeonButton onClick={handleSimulateUpload} isLoading={isUploading} className="w-full gap-2 mt-4">
                  Run Biometric Scan <ChevronRight className="w-4 h-4" />
                </NeonButton>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <ShieldCheck className="w-12 h-12 text-primary neon-glow drop-shadow-[0_0_15px_rgba(63,229,108,0.5)]" />
                </motion.div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Account Fully Verified!</h3>
                  <p className="text-text-muted">You now have access to High-Value Escrow Trades.</p>
                </div>
                <Link href="/dashboard" className="w-full block mt-4">
                  <NeonButton className="w-full gap-2 glow-icon">
                    Enter Trading Dashboard <ChevronRight className="w-4 h-4" />
                  </NeonButton>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </DynamicCard>
      </motion.div>
    </div>
  );
}
