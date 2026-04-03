"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UploadCloud, CheckCircle2, User, Camera, ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function KYCVerification() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
     fetch("http://localhost:5000/api/user/profile", {
         headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
     })
     .then(res => res.json())
     .then(data => {
         if (data.kyc?.status === 'verified') {
            setIsAlreadyVerified(true);
         }
         setIsLoadingProfile(false);
     })
     .catch(() => setIsLoadingProfile(false));
  }, []);
  
  const idOptions = ["Passport", "Driver's License", "National ID"];

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    setError("");
    
    try {
       const res = await fetch("http://localhost:5000/api/kyc", {
          method: "POST",
          headers: { 
             "Content-Type": "application/json",
             "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
             idType: selectedID,
             idNumber: "SIMULATED-ID-" + Math.floor(Math.random() * 100000),
             idName: "Simulated User",
             birthdate: "1995-10-15"
          })
       });
       
       if (!res.ok) throw new Error("KYC Verification Failed. Please try again.");
       
       router.push("/dashboard");
    } catch (err: any) {
       setError(err.message);
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          Identity Verification <ShieldCheck className="w-8 h-8 text-primary glow-icon"/>
        </h1>
        <p className="text-text-muted">Federal-grade verification to protect the Midly network from scammers.</p>
      </div>

      <div className="flex justify-between items-center mb-10 max-w-2xl mx-auto relative relative z-0">
         <div className="absolute top-1/2 left-0 right-0 h-1 bg-dark-border -z-10 -translate-y-1/2">
            <motion.div 
              initial={{ width: "0%" }} 
              animate={{ width: `${((step - 1) / 2) * 100}%` }} 
              className="h-full bg-primary"
            />
         </div>
         
         {[1, 2, 3].map((s) => (
            <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s ? 'bg-primary border-primary text-black glow-icon' : 'bg-dark-bg border-dark-border text-text-muted'}`}>
               {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
            </div>
         ))}
      </div>

      <div className="max-w-2xl mx-auto">
         {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm flex items-center justify-center gap-2">
               <ShieldAlert className="w-4 h-4"/> {error}
            </div>
         )}
         
         {isLoadingProfile ? (
            <div className="text-center text-text-muted py-12">Checking Verification Status...</div>
         ) : isAlreadyVerified ? (
             <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <DynamicCard hoverEffect={false} className="border border-primary/50 bg-primary/10 p-12 text-center rounded-2xl">
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4 glow-icon" />
                    <h2 className="text-2xl font-bold text-white mb-2">Fully Verified</h2>
                    <p className="text-text-muted mb-6">Your identity has been verified by the federal database. Your Midly account is clear for securing unlimited escrow funds.</p>
                    <NeonButton onClick={() => router.push("/dashboard")}>Return to Dashboard</NeonButton>
                </DynamicCard>
             </motion.div>
         ) : (
          <AnimatePresence mode="wait">
            {step === 1 && (
               <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-8">
                     <h2 className="text-xl font-bold text-white mb-6">Select Document Type</h2>
                     <div className="space-y-4 mb-8">
                        {idOptions.map((opt) => (
                           <div 
                              key={opt}
                              onClick={() => setSelectedID(opt)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${selectedID === opt ? 'border-primary bg-primary/10 text-white' : 'border-dark-border hover:border-text-muted text-text-muted'}`}
                           >
                              <span className="font-medium">{opt}</span>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedID === opt ? 'border-primary' : 'border-dark-border'}`}>
                                 {selectedID === opt && <div className="w-3 h-3 bg-primary rounded-full" />}
                              </div>
                           </div>
                        ))}
                     </div>
                     <NeonButton className="w-full" disabled={!selectedID} onClick={handleNextStep}>
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                     </NeonButton>
                  </DynamicCard>
               </motion.div>
            )}

            {step === 2 && (
               <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-8">
                     <h2 className="text-xl font-bold text-white mb-2">Upload {selectedID}</h2>
                     <p className="text-sm text-text-muted mb-6">Please ensure all details are clearly visible and well-lit.</p>
                     
                     <div className="border-2 border-dashed border-dark-border rounded-xl p-12 flex flex-col items-center justify-center mb-8 bg-dark-bg/50 hover:bg-dark-bg hover:border-primary/50 transition-colors cursor-pointer group">
                        <UploadCloud className="w-12 h-12 text-text-muted group-hover:text-primary transition-colors mb-4" />
                        <p className="text-white font-medium mb-1">Click to upload front of {selectedID}</p>
                        <p className="text-xs text-text-muted">JPG, PNG up to 5MB</p>
                     </div>
                     
                     <div className="flex gap-4">
                        <NeonButton variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</NeonButton>
                        <NeonButton className="flex-1" onClick={handleNextStep}>Continue <ArrowRight className="w-4 h-4 ml-2" /></NeonButton>
                     </div>
                  </DynamicCard>
               </motion.div>
            )}

            {step === 3 && (
               <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-8 text-center">
                     <h2 className="text-xl font-bold text-white mb-2">Liveness Check</h2>
                     <p className="text-sm text-text-muted mb-8">Position your face in the frame to match your ID.</p>
                     
                     <div className="w-48 h-48 rounded-full border-4 border-dashed border-primary/50 mx-auto mb-8 flex items-center justify-center relative overflow-hidden bg-dark-bg">
                        <Camera className="w-10 h-10 text-primary/50" />
                        <div className="absolute inset-0 border-[6px] border-dark-bg rounded-full pointer-events-none" />
                     </div>
                     
                     <div className="flex gap-4">
                        <NeonButton variant="ghost" className="flex-1" disabled={isProcessing} onClick={() => setStep(2)}>Back</NeonButton>
                        <NeonButton className="flex-1 glow-icon" isLoading={isProcessing} onClick={handleComplete}>
                           Verify Identity <ShieldCheck className="w-4 h-4 ml-2" />
                        </NeonButton>
                     </div>
                  </DynamicCard>
               </motion.div>
            )}
         </AnimatePresence>
         )}
      </div>
    </div>
  );
}
