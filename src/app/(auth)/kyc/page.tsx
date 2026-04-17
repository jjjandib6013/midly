"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, ShieldCheck, ArrowRight, ShieldAlert, RotateCcw, UploadCloud, Camera, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api";

export default function KYCVerification() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const router = useRouter();
  const containerRef = useRef(null);
  const stepContainerRef = useRef(null);
  const webcamRef = useRef<Webcam>(null);
  
  const [step, setStep] = useState(1);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [livenessImage, setLivenessImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const fetchProfile = useCallback(() => {
     setIsLoadingProfile(true);
     fetch(`${API_URL}/api/user/profile`, {
         headers: { "Authorization": `Bearer ${token}` }
     })
     .then(res => res.json())
     .then(data => {
         if (data.kyc?.status === 'verified') setIsAlreadyVerified(true);
         else setIsAlreadyVerified(false);
         setIsLoadingProfile(false);
     })
     .catch(() => setIsLoadingProfile(false));
  }, [token]);

  useEffect(() => {
      if (!token) return;
      fetchProfile();
     setIsMounted(true);
  }, [fetchProfile, token]);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
  }, { scope: containerRef });

  useGSAP(() => {
      if (stepContainerRef.current) gsap.fromTo(stepContainerRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" });
  }, [step]);
  
  const idOptions = ["Philippine Passport", "Driver's License", "Philippine National ID (PhilSys)"];

  const handleNextStep = () => { if (step < 3) setStep(step + 1); };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      try {
          const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) setImageUrl(data.url);
          else setError("Upload failed from server.");
      } catch(err) { setError("Upload network error."); } 
      finally { setIsUploading(false); }
  };

  const captureLiveness = useCallback(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) setLivenessImage(imageSrc);
  }, [webcamRef]);

  const handlePhase1 = async () => {
      setIsProcessing(true);
      setError("");
      try {
         const res = await fetch(`${API_URL}/api/kyc/phase1`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ idType: selectedID, idNumber: idNumber })
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to initialize Phase 1.");
         setStep(2);
      } catch (err: any) { setError(err.message); }
      finally { setIsProcessing(false); }
  };

  const handlePhase2 = async () => {
    setIsProcessing(true);
    setError("");
    try {
       const res = await fetch(`${API_URL}/api/kyc/phase2`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ imageUrl: imageUrl })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Document upload failed.");

       for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers: { "Authorization": `Bearer ${token}` } });
          const profileData = await profileRes.json();
          const status = profileData.kyc?.status;
          
          if (status === 'phase2_verified') {
             setStep(3);
             return;
          }
          if (status === 'rejected') {
             setImageUrl("");
             const reason = profileData.kyc?.rejection_reason || "AI could not extract required data from ID.";
             throw new Error(`Verification failed. ${reason}`);
          }
       }
       throw new Error("AI Processing timed out.");
    } catch (err: any) { setError(err.message); } 
    finally { setIsProcessing(false); }
  };



  const handlePhase3 = async () => {
    setIsProcessing(true);
    setError("");
    try {
       const res = await fetch(`${API_URL}/api/kyc/phase3`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ livenessImage: livenessImage })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Selfie submission failed.");

       for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers: { "Authorization": `Bearer ${token}` } });
          const profileData = await profileRes.json();
          const status = profileData.kyc?.status;
          
          if (status === 'verified') {
             setIsAlreadyVerified(true);
             return;
          }
          if (status === 'rejected') {
             setLivenessImage(null);
             const reason = profileData.kyc?.rejection_reason || "Biometric match failed. Selfie does not match ID document.";
             throw new Error(`Biometric Error: ${reason}`);
          }
       }
       throw new Error("Verification timed out.");
    } catch (err: any) { setError(err.message); } 
    finally { setIsProcessing(false); }
  };

  const handleDevReset = async () => {
     try {
         setIsLoadingProfile(true);
         await fetch(`${API_URL}/api/kyc/reset`, {
             method: "POST",
             headers: { "Authorization": `Bearer ${token}` }
         });
         fetchProfile();
         setStep(1);
         setImageUrl("");
         setIdNumber("");
         setLivenessImage(null);
     } catch (err) { console.error(err); }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16 overflow-hidden">
      <div className="text-center mb-10 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4 flex items-center justify-center gap-3 sm:gap-4 uppercase tracking-tight">
          Identity Verification <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0"/>
        </h1>
        <p className="text-[#8892b0] font-medium tracking-wide flex-wrap items-center w-full px-2">Secure your Midly account to unlock full peer-to-peer trading capabilities.</p>
      </div>

      <div className="flex justify-between items-center mb-10 sm:mb-16 max-w-xs sm:max-w-3xl mx-auto relative z-0 px-4 sm:px-0">
         <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/5 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
            <div style={{ width: `${((step - 1) / 2) * 100}%` }} className="h-full bg-primary transition-all duration-500 shadow-[0_0_15px_rgba(63,229,108,0.5)]" />
         </div>
         {[1, 2, 3].map((s) => (
            <div key={s} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all duration-300 ${step >= s ? 'bg-primary border-primary text-[#030407] shadow-[0_0_20px_rgba(63,229,108,0.4)]' : 'bg-[#050608] border-white/10 text-[#8892b0]'}`}>
               {step > s ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <span className="font-black text-base sm:text-lg">{s}</span>}
            </div>
         ))}
      </div>

      <div className="max-w-3xl mx-auto" ref={containerRef}>
         {error && (
            <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs sm:text-sm flex items-center justify-between gap-3 font-bold tracking-wide">
               <div className="flex items-center gap-2 sm:gap-3">
                 <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5"/> {error}
               </div>
               <button onClick={() => setError("")} className="hover:text-white transition-colors" type="button"><X className="w-4 h-4"/></button>
            </div>
         )}
         
         {isLoadingProfile ? (
            <div className="py-10 sm:py-20 text-center flex flex-col items-center justify-center grayscale opacity-50 border border-white/5 bg-[#0a0d14]/80 rounded-2xl sm:rounded-[2rem]">
               <div className="w-8 h-8 sm:w-12 sm:h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
               <p className="text-xs sm:text-sm font-black uppercase text-white tracking-widest">Loading Verification Status...</p>
            </div>
         ) : isAlreadyVerified ? (
              <DynamicCard hoverEffect={false} className="border border-primary/30 bg-primary/10 p-8 sm:p-16 text-center rounded-3xl sm:rounded-[3rem] shadow-[inset_0_0_50px_rgba(63,229,108,0.1)] relative overflow-hidden">
                  <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-primary mx-auto mb-4 sm:mb-6 drop-shadow-[0_0_20px_rgba(63,229,108,0.6)]" />
                  <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4 tracking-tight">Identity Verified</h2>
                  <p className="text-[#8892b0] mb-8 sm:mb-10 font-medium tracking-wide max-w-lg mx-auto text-xs sm:text-base">Your identity has been successfully verified. You have full access to Midly's secure escrow and wallet features.</p>
                  <NeonButton onClick={() => router.push("/dashboard")} className="!py-3 sm:!py-4 !px-6 sm:!px-10 text-xs sm:text-sm uppercase font-bold tracking-widest w-full sm:w-auto">Go to Dashboard</NeonButton>
                  
                  <div className="absolute top-4 right-4 group">
                      <button onClick={handleDevReset} className="p-2 sm:p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 touch-manipulation">
                         <RotateCcw className="w-4 h-4" />
                         <span className="text-[10px] uppercase tracking-widest hidden group-hover:block font-bold">Dev Reset</span>
                      </button>
                  </div>
              </DynamicCard>
         ) : (
          <div ref={stepContainerRef}>
            {step === 1 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Document Type</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm mb-6 sm:mb-8">Please select a valid Government ID.</p>
                     
                     <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                        {idOptions.map((opt) => (
                           <div key={opt} onClick={() => setSelectedID(opt)} className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group touch-manipulation ${selectedID === opt ? 'border-primary bg-primary/5 text-white' : 'border-white/5 bg-[#050608] hover:border-white/20 text-[#8892b0]'}`}>
                              <span className="font-bold tracking-wide text-sm sm:text-base">{opt}</span>
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedID === opt ? 'border-primary' : 'border-white/10 group-hover:border-white/30'}`}>
                                 {selectedID === opt && <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-primary rounded-full" />}
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="space-y-4 mb-8 sm:mb-10">
                         <div>
                            <label className="text-[10px] sm:text-xs font-bold text-[#8892b0] uppercase tracking-wider mb-2 block">ID Number</label>
                            <input type="text" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="000-000-0000" className="w-full bg-[#050608] border border-white/10 p-3 sm:p-4 rounded-xl text-white focus:border-primary focus:outline-none placeholder:text-white/20 text-sm sm:text-base transition-colors" />
                         </div>
                     </div>
                     <NeonButton className="w-full !py-4 sm:!py-5 text-xs sm:text-sm uppercase tracking-widest font-black touch-manipulation" disabled={!selectedID || !idNumber || isProcessing} onClick={handlePhase1}>
                        {isProcessing ? "Processing..." : "Next Step"} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3" />
                     </NeonButton>
                  </DynamicCard>
            )}

            {step === 2 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 md:p-14 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Upload Document</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm mb-6 sm:mb-8">Ensure the document is well-lit and all text is clearly visible.</p>
                     
                     <label className={`border-2 border-dashed ${imageUrl ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-[#050608]'} rounded-2xl sm:rounded-[2rem] p-10 sm:p-16 flex flex-col items-center justify-center mb-8 sm:mb-10 hover:bg-white/[0.02] hover:border-primary/50 transition-all cursor-pointer group touch-manipulation`}>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading || isProcessing} />
                        {isUploading ? (
                           <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3 sm:mb-4" />
                        ) : imageUrl ? (
                           <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-3 sm:mb-4" />
                        ) : (
                           <UploadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-[#8892b0] group-hover:text-primary transition-colors mb-3 sm:mb-4" />
                        )}
                        <p className="text-white font-bold text-base sm:text-lg mb-1">{isUploading ? 'Uploading...' : imageUrl ? 'Document Uploaded' : 'Upload Image'}</p>
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#8892b0] text-center px-4">JPG or PNG, up to 5MB</p>
                     </label>

                     {isProcessing && (
                         <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/20 mb-4 sm:mb-6">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                            <span className="text-xs sm:text-sm text-primary font-bold">AI is scanning your document...</span>
                         </div>
                      )}
                     
                     <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                        <NeonButton variant="ghost" className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold touch-manipulation" disabled={isProcessing} onClick={() => setStep(1)}>Back</NeonButton>
                        <NeonButton className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold tracking-widest touch-manipulation" disabled={!imageUrl || isUploading || isProcessing} onClick={handlePhase2}>
                            {isProcessing ? "Validating..." : "Next Step"} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                        </NeonButton>
                     </div>
                  </DynamicCard>
            )}

            {step === 3 && (
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 md:p-14 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Live Selfie</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm mb-6 sm:mb-10">We need to match your face with the submitted document.</p>
                     
                     <div className="w-full max-w-sm mx-auto mb-6 sm:mb-10 aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#030407] border-4 border-white/5 relative shadow-xl">
                        {!livenessImage ? (
                           isMounted && (
                             <Webcam
                                audio={false}
                                height={720}
                                width={1280}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user" }}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onUserMediaError={(err) => setError("Camera access denied or unavailable: " + String(err))}
                             />
                           )
                        ) : (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img src={livenessImage} alt="Selfie" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}

                        <div className="absolute bottom-3 sm:bottom-4 left-0 right-0 flex justify-center z-10">
                           {!livenessImage ? (
                               <button 
                                 type="button" 
                                 onClick={(e) => { 
                                     e.preventDefault(); 
                                     captureLiveness(); 
                                 }} 
                                 className="w-12 h-12 sm:w-14 sm:h-14 bg-primary text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg border-2 border-white/20 z-50 touch-manipulation">
                                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                               </button>
                           ) : (
                               <button type="button" onClick={(e) => { e.preventDefault(); setLivenessImage(null); }} className="w-auto px-4 sm:px-6 py-2 bg-[#0a0d14] text-white rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors shadow-lg border border-white/20 font-bold text-[10px] sm:text-xs uppercase tracking-widest z-50 touch-manipulation">
                                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" /> Retake
                               </button>
                           )}
                        </div>
                     </div>
                     
                      {isProcessing && (
                         <div className="flex items-center justify-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/20 mb-4 sm:mb-6">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                            <span className="text-xs sm:text-sm text-primary font-bold">AI is analyzing your identity documents...</span>
                         </div>
                      )}
                      
                      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                         <NeonButton variant="ghost" className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold touch-manipulation" disabled={isProcessing} onClick={() => setStep(2)}>Back</NeonButton>
                         <NeonButton className="w-full sm:flex-1 !py-4 sm:!py-5 text-[10px] sm:text-sm uppercase font-bold tracking-widest touch-manipulation" disabled={isProcessing || !livenessImage} onClick={handlePhase3}>
                            {isProcessing ? "Processing..." : "Verify Identity"} <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
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
