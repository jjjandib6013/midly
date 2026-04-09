"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const stepContainerRef = useRef<HTMLDivElement>(null);

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

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power4.out" });
  }, { scope: containerRef });

  useGSAP(() => {
      if (stepContainerRef.current) {
         gsap.fromTo(stepContainerRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" });
      }
  }, [step]);
  
  const idOptions = ["Passport Card", "Driver's License System", "National ID Protocol"];

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
       
       if (!res.ok) throw new Error("KYC Protocol Failed. Return to matrix.");
       
       router.push("/dashboard");
    } catch (err: any) {
       setError(err.message);
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-white mb-4 flex items-center justify-center gap-4 tracking-tighter uppercase">
          Identity Sync <ShieldCheck className="w-10 h-10 text-primary"/>
        </h1>
        <p className="text-[#8892b0] font-medium tracking-wide">Military-grade synchronization to protect the Midly network from rogue elements.</p>
      </div>

      <div className="flex justify-between items-center mb-16 max-w-3xl mx-auto relative z-0">
         <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
            <div 
              style={{ width: `${((step - 1) / 2) * 100}%` }} 
              className="h-full bg-primary transition-all duration-500 shadow-[0_0_15px_rgba(63,229,108,0.5)]"
            />
         </div>
         
         {[1, 2, 3].map((s) => (
            <div key={s} className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${step >= s ? 'bg-primary border-primary text-[#030407] shadow-[0_0_20px_rgba(63,229,108,0.4)]' : 'bg-[#050608] border-white/10 text-[#8892b0]'}`}>
               {step > s ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black text-lg">{s}</span>}
            </div>
         ))}
      </div>

      <div className="max-w-3xl mx-auto" ref={containerRef}>
         {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center justify-center gap-3 font-bold uppercase tracking-widest">
               <ShieldAlert className="w-5 h-5"/> {error}
            </div>
         )}
         
         {isLoadingProfile ? (
            <div className="py-20 text-center flex flex-col items-center justify-center grayscale opacity-50 border border-white/5 bg-[#0a0d14]/80 rounded-[2rem]">
               <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
               <p className="text-sm font-black tracking-widest uppercase text-white">Scanning Identity Protocols...</p>
            </div>
         ) : isAlreadyVerified ? (
              <DynamicCard hoverEffect={false} className="border border-primary/30 bg-primary/10 p-16 text-center rounded-[3rem] shadow-[inset_0_0_50px_rgba(63,229,108,0.1)]">
                  <CheckCircle2 className="w-24 h-24 text-primary mx-auto mb-8 drop-shadow-[0_0_20px_rgba(63,229,108,0.6)]" />
                  <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tighter">Fully Synchronized</h2>
                  <p className="text-[#8892b0] mb-10 font-medium tracking-wide text-lg max-w-lg mx-auto">Your identity matrix has been accepted by the federal logic. Your Midly protocol node is clear for unlimited operations.</p>
                  <NeonButton onClick={() => router.push("/dashboard")} className="!py-4 !px-10 text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(63,229,108,0.2)]">Access Dashboard Hub</NeonButton>
              </DynamicCard>
         ) : (
          <div ref={stepContainerRef}>
            {step === 1 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-tight">Select Identifier Node</h2>
                     <div className="space-y-4 mb-10">
                        {idOptions.map((opt) => (
                           <div 
                              key={opt}
                              onClick={() => setSelectedID(opt)}
                              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedID === opt ? 'border-primary bg-primary/5 text-white' : 'border-white/5 bg-[#050608] hover:border-white/20 text-[#8892b0]'}`}
                           >
                              <span className="font-black text-lg uppercase tracking-wider">{opt}</span>
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${selectedID === opt ? 'border-primary' : 'border-white/10 group-hover:border-white/30'}`}>
                                 {selectedID === opt && <div className="w-4 h-4 bg-primary rounded-full" />}
                              </div>
                           </div>
                        ))}
                     </div>
                     <NeonButton className="w-full !py-6 text-sm uppercase tracking-widest font-black" disabled={!selectedID} onClick={handleNextStep}>
                        Engage Matrix Check <ArrowRight className="w-5 h-5 ml-3" />
                     </NeonButton>
                  </DynamicCard>
            )}

            {step === 2 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Inject {selectedID} Image</h2>
                     <p className="text-[#8892b0] font-medium mb-10">Sensors require maximum clarity and illumination to scan.</p>
                     
                     <div className="border-2 border-dashed border-white/10 rounded-[2rem] p-16 flex flex-col items-center justify-center mb-10 bg-[#050608] hover:bg-white/[0.02] hover:border-primary/50 transition-all cursor-pointer group shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
                        <UploadCloud className="w-16 h-16 text-[#8892b0] group-hover:text-primary transition-colors mb-6" />
                        <p className="text-white font-black text-lg uppercase tracking-wide mb-2">Upload Primary Vector Image</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#8892b0]">JPG / PNG Layer up to 5MB</p>
                     </div>
                     
                     <div className="flex gap-6">
                        <NeonButton variant="ghost" className="flex-1 !py-6 text-sm uppercase tracking-widest" onClick={() => setStep(1)}>Abort</NeonButton>
                        <NeonButton className="flex-1 !py-6 text-sm uppercase tracking-widest font-black" onClick={handleNextStep}>Proceed Forward <ArrowRight className="w-5 h-5 ml-3" /></NeonButton>
                     </div>
                  </DynamicCard>
            )}

            {step === 3 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-10 md:p-14 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Biological Scan</h2>
                     <p className="text-[#8892b0] font-medium mb-12">Calibrate facial coordinates to match identification matrix.</p>
                     
                     <div className="w-64 h-64 rounded-full border-[6px] border-dashed border-primary/50 mx-auto mb-12 flex items-center justify-center relative overflow-hidden bg-[#030407] shadow-[0_0_40px_rgba(63,229,108,0.1)]">
                        <Camera className="w-16 h-16 text-primary/30" />
                        <div className="absolute inset-0 border-[8px] border-[#0a0d14] rounded-full pointer-events-none" />
                     </div>
                     
                     <div className="flex gap-6">
                        <NeonButton variant="ghost" className="flex-1 !py-6 text-sm uppercase tracking-widest" disabled={isProcessing} onClick={() => setStep(2)}>Abort</NeonButton>
                        <NeonButton className="flex-1 !py-6 text-sm uppercase tracking-widest font-black" isLoading={isProcessing} onClick={handleComplete}>
                           Initialize Sync <ShieldCheck className="w-5 h-5 ml-3" />
                        </NeonButton>
                     </div>
                  </DynamicCard>
            )}
          </div>
         )}
      </div>
    </div>
  );
}
