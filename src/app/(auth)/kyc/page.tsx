"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  CheckCircle2, ShieldCheck, ArrowRight, ShieldAlert, RotateCcw, UploadCloud,
  Camera, X, FileText, IdCard, User, Eye, Lightbulb, Lock, Clock, AlertCircle,
  Info, ImageIcon, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api";

// ──────────────────────────────────────────────────────────────────────────
// KYC Verification — 3-phase identity pipeline.
//
// Phase gates are enforced server-side (see directives/kyc.md). This page
// stays a thin client: it drives the stepper, uploads the image, captures
// liveness frames, and polls the backend status until the AI worker lands
// on `verified`, `pending_review`, or `rejected`.
//
// All state/APIs/status codes/polling loops are preserved 1:1 from the
// previous version. Only presentation + information architecture changed.
// ──────────────────────────────────────────────────────────────────────────

type Phase = 1 | 2 | 3;

const PHASE_LABELS: Record<Phase, { title: string; kicker: string }> = {
   1: { title: "Identity", kicker: "ID selection" },
   2: { title: "Document", kicker: "Upload & OCR" },
   3: { title: "Liveness", kicker: "Biometric match" },
};

const ID_OPTIONS: { label: string; hint: string; icon: typeof IdCard }[] = [
   { label: "Philippine Passport", hint: "P#######", icon: FileText },
   { label: "Driver's License", hint: "N## ## ######", icon: IdCard },
   { label: "Philippine National ID (PhilSys)", hint: "####-####-####-####", icon: User },
];

// ──────────────────────────────────────────────────────────────────────────
// Phase stepper — labeled, accessible, with progress fill.
// ──────────────────────────────────────────────────────────────────────────
function PhaseStepper({ current }: { current: Phase }) {
   return (
      <nav aria-label="KYC progress" className="max-w-3xl mx-auto mb-10 sm:mb-14 px-2">
         <ol className="grid grid-cols-3 gap-2 sm:gap-4 relative">
            {/* Connector fill behind the circles */}
            <div className="absolute top-5 sm:top-6 left-[16.66%] right-[16.66%] h-0.5 bg-white/5 -z-10 rounded-full">
               <div
                  style={{ width: `${((current - 1) / 2) * 100}%` }}
                  className="h-full bg-primary transition-all duration-500 shadow-[0_0_12px_rgba(63,229,108,0.5)] rounded-full"
               />
            </div>
            {([1, 2, 3] as Phase[]).map((s) => {
               const active = current === s;
               const done = current > s;
               return (
                  <li key={s} className="flex flex-col items-center text-center">
                     <div
                        aria-current={active ? "step" : undefined}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 transition-all duration-300
                           ${done ? 'bg-primary border-primary text-[#030407] shadow-[0_0_20px_rgba(63,229,108,0.35)]'
                             : active ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(63,229,108,0.25)]'
                             : 'bg-[#050608] border-white/10 text-[#8892b0]'}`}
                     >
                        {done ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <span className="font-black text-base sm:text-lg">{s}</span>}
                     </div>
                     <div className="mt-2 sm:mt-3">
                        <p className={`text-xs sm:text-sm font-bold tracking-wide transition-colors ${active || done ? 'text-white' : 'text-[#8892b0]'}`}>
                           {PHASE_LABELS[s].title}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#8892b0] mt-0.5 hidden sm:block">
                           {PHASE_LABELS[s].kicker}
                        </p>
                     </div>
                  </li>
               );
            })}
         </ol>
      </nav>
   );
}

// ──────────────────────────────────────────────────────────────────────────
// Requirements bar — inline quick-scan list of what the phase expects.
// ──────────────────────────────────────────────────────────────────────────
function RequirementsBar({ items }: { items: { icon: typeof Lightbulb; text: string }[] }) {
   return (
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8">
         {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
               <it.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
               <span className="text-[11px] sm:text-xs text-[#8892b0] font-medium leading-tight">{it.text}</span>
            </li>
         ))}
      </ul>
   );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared status pill — used for inline state hints.
// ──────────────────────────────────────────────────────────────────────────
function StatusPill({ tone, children }: { tone: 'pending' | 'error' | 'success' | 'info'; children: React.ReactNode }) {
   const tones = {
      pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      error:   'bg-red-500/10 text-red-400 border-red-500/30',
      success: 'bg-primary/10 text-primary border-primary/30',
      info:    'bg-blue-500/10 text-blue-300 border-blue-500/30',
   }[tone];
   return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-bold uppercase tracking-widest ${tones}`}>
         {children}
      </span>
   );
}

// ──────────────────────────────────────────────────────────────────────────
// Processing panel — consistent visual for async AI work.
// ──────────────────────────────────────────────────────────────────────────
function ProcessingPanel({ status }: { status: string }) {
   return (
      <div className="flex items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/20 mb-4 sm:mb-6">
         <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin shrink-0" />
         <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-0.5">AI Processing</p>
            <p className="text-sm text-white font-medium truncate">{status}</p>
         </div>
      </div>
   );
}

export default function KYCVerification() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const router = useRouter();
  const containerRef = useRef(null);
  const stepContainerRef = useRef(null);
  const webcamRef = useRef<Webcam>(null);

  const [step, setStep] = useState<Phase>(1);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [idNumber, setIdNumber] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageS3Key, setImageS3Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Initializing...");
  const [error, setError] = useState("");
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  const [isPendingReview, setIsPendingReview] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [livenessFrames, setLivenessFrames] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [challengeText, setChallengeText] = useState("");
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(-1);

  // ──────────────────────────────────────────────────────────────────────
  // Dev-mode toggle. When on, every KYC request sends X-Dev-Mode: 1 which
  // the backend's rateLimiter honors as a skip for any authenticated JWT.
  // Persisted in localStorage so a refresh doesn't reset it mid-demo.
  //
  // NOT for production. Tighten the server-side check to role === 'admin'
  // before launch. The hidden toggle is a triple-tap on the "Phase 1 of 3"
  // kicker text.
  // ──────────────────────────────────────────────────────────────────────
  const [devMode, setDevMode] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);

  useEffect(() => {
     if (typeof window === 'undefined') return;
     setDevMode(localStorage.getItem('midly.kyc.devMode') === '1');
  }, []);

  const toggleDevMode = useCallback(() => {
     setDevMode((prev) => {
        const next = !prev;
        try {
           if (next) localStorage.setItem('midly.kyc.devMode', '1');
           else localStorage.removeItem('midly.kyc.devMode');
        } catch {}
        return next;
     });
  }, []);

  const handleDevTap = () => {
     setDevTapCount((c) => {
        if (c + 1 >= 3) {
           toggleDevMode();
           return 0;
        }
        return c + 1;
     });
  };

  // Build auth headers; layer in X-Dev-Mode when the toggle is on.
  const authHeaders = useCallback((extra?: Record<string, string>): HeadersInit => {
     const h: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(extra || {}),
     };
     if (devMode) h['X-Dev-Mode'] = '1';
     return h;
  }, [token, devMode]);

  const fetchProfile = useCallback(() => {
     setIsLoadingProfile(true);
     fetch(`${API_URL}/api/user/profile`, {
         headers: authHeaders()
     })
     .then(res => res.json())
     .then(data => {
         const status = data.kyc?.status;
         setIsAlreadyVerified(status === 'verified');
         setIsPendingReview(status === 'pending_review');
         setIsLoadingProfile(false);
     })
     .catch(() => setIsLoadingProfile(false));
  }, [token, authHeaders]);

  useEffect(() => {
      if (!token) return;
      fetchProfile();
      setIsMounted(true);
  }, [fetchProfile, token]);

  useGSAP(() => {
     gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" });
  }, { scope: containerRef });

  useGSAP(() => {
      if (stepContainerRef.current) gsap.fromTo(stepContainerRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }, [step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("file", file);
      try {
          const res = await fetch(`${API_URL}/api/upload?type=kyc`, { method: "POST", headers: authHeaders(), body: formData });
          const data = await res.json();
          if (data.url) {
             setImageUrl(data.url);
             setImageS3Key(data.s3Key || null);
          }
          else setError("Upload failed from server.");
      } catch (err) { setError("Upload network error."); }
      finally { setIsUploading(false); }
  };

  // ──────────────────────────────────────────────────────────────
  // Liveness capture (preserved from previous implementation)
  // ──────────────────────────────────────────────────────────────
  const challenges = [
     "Look directly at the camera",
     "Blink naturally",
     "Turn your head slightly left",
     "Turn your head slightly right",
     "Look directly at the camera again"
  ];

  const startLivenessCapture = useCallback(async () => {
     // Virtual Camera & Deepfake Injection Prevention (directive §Phase 3)
     try {
         const stream = webcamRef.current?.stream;
         if (stream) {
             const activeTrack = stream.getVideoTracks()[0];
             if (activeTrack) {
                 const label = activeTrack.label.toLowerCase();
                 if (['virtual', 'obs', 'manycam', 'splitcam', 'loopback'].some(k => label.includes(k))) {
                     setError("Security Alert: Virtual camera software detected. Please disable OBS/ManyCam and use a physical hardware webcam.");
                     return;
                 }
             }
         }
     } catch (err) {
         console.warn("Could not read active media stream track for virtual camera check.");
     }

     setIsCapturing(true);
     setLivenessFrames([]);
     setCaptureProgress(0);
     const frames: string[] = [];
     const totalFrames = challenges.length;
     const delayBetweenFrames = 2000;

     for (let i = 0; i < totalFrames; i++) {
        setCurrentChallengeIdx(i);
        setChallengeText(challenges[i]);
        setCaptureProgress((i / totalFrames) * 100);
        await new Promise(r => setTimeout(r, delayBetweenFrames));

        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) frames.push(imageSrc);
     }

     setCaptureProgress(100);
     setChallengeText("Capture complete!");
     setCurrentChallengeIdx(totalFrames);
     setLivenessFrames(frames);
     setIsCapturing(false);

     if (frames.length < 3) {
        setError("Could not capture enough frames. Please ensure your camera is working and try again.");
        setLivenessFrames([]);
     }
  }, [webcamRef]);

  // ──────────────────────────────────────────────────────────────
  // Phase handlers (preserved 1:1 — backend owns the state machine)
  // ──────────────────────────────────────────────────────────────
  const handlePhase1 = async () => {
      setIsProcessing(true);
      setError("");
      try {
         const res = await fetch(`${API_URL}/api/kyc/phase1`, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
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
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ imageUrl: imageUrl, s3Key: imageS3Key })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Document upload failed.");

       // Fix B: bumped poll budget from 60s (20×3s) to 120s (30×4s).
       // Cold-start of the AI pipeline can legitimately take 45–70s on a
       // fresh Railway container (model load + Tesseract language pack
       // download). Warmup at boot makes the steady-state path ~5–10s, but
       // the first request after a Railway restart still needs the long
       // budget. 4s interval cuts poll count by 25%.
       for (let i = 0; i < 30; i++) {
          if (i === 2) setProcessingStatus("Scanning document...");
          if (i === 5) setProcessingStatus("Extracting text...");
          if (i === 8) setProcessingStatus("Verifying face...");
          if (i === 11) setProcessingStatus("Finalizing analysis...");

          await new Promise(r => setTimeout(r, 4000));
          const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers: authHeaders() });
          const profileData = await profileRes.json();
          const status = profileData.kyc?.status;

          if (status === 'phase2_verified') {
             setStep(3);
             return;
          }
          if (status === 'rejected') {
             setImageUrl("");
             setImageS3Key(null);
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
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ livenessFrames: livenessFrames, challenge: 'blink_and_turn' })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Selfie submission failed.");

       // Fix B: same 120s budget as Phase 2 — Phase 3 runs five face-api
       // detections (one per frame) so it's actually heavier than Phase 2.
       for (let i = 0; i < 30; i++) {
          if (i === 2) setProcessingStatus("Analyzing frames...");
          if (i === 5) setProcessingStatus("Verifying liveness...");
          if (i === 8) setProcessingStatus("Cross-referencing ID...");

          await new Promise(r => setTimeout(r, 4000));
          const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers: authHeaders() });
          const profileData = await profileRes.json();
          const status = profileData.kyc?.status;

          if (status === 'verified') {
             setIsAlreadyVerified(true);
             return;
          }
          if (status === 'pending_review') {
             setIsPendingReview(true);
             return;
          }
          if (status === 'rejected') {
             setLivenessFrames([]);
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
             headers: authHeaders()
         });
         fetchProfile();
         setStep(1);
         setImageUrl("");
         setImageS3Key(null);
         setIdNumber("");
         setSelectedID(null);
         setLivenessFrames([]);
         setIsPendingReview(false);
     } catch (err) { console.error(err); }
  };

  // ──────────────────────────────────────────────────────────────
  // Early returns for terminal/async states
  // ──────────────────────────────────────────────────────────────
  if (isLoadingProfile) {
     return (
        <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
           <div className="flex flex-col items-center text-center border border-white/5 bg-[#0a0d14]/80 rounded-3xl px-10 py-16">
              <div className="w-10 h-10 border-4 border-white/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-xs font-black uppercase text-white tracking-widest">Loading Verification Status</p>
              <p className="text-xs text-[#8892b0] mt-2 max-w-xs">Securely fetching your identity state from the platform.</p>
           </div>
        </div>
     );
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-16 overflow-hidden">
      {/* Dev mode indicator — visible only when the hidden toggle is on.
          Click to disable without needing to find the triple-tap target again. */}
      {devMode && (
         <button
            type="button"
            onClick={toggleDevMode}
            title="Click to disable dev mode"
            className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500/30 transition-colors shadow-lg backdrop-blur-sm"
         >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />
            Dev Mode · Rate Limits Off
         </button>
      )}

      {/* Header */}
      <header className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
           <ShieldCheck className="w-3.5 h-3.5 text-primary" />
           <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-primary">AML-Compliant · 3-Phase Pipeline</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 tracking-tight uppercase">
          Identity Verification
        </h1>
        <p className="text-[#8892b0] font-medium tracking-wide max-w-2xl mx-auto text-sm sm:text-base px-2">
          Secure your Midly account to unlock full peer-to-peer trading, wallet deposits, and escrow trades.
        </p>
      </header>

      {/* Stepper (hidden once terminal) */}
      {!isAlreadyVerified && !isPendingReview && <PhaseStepper current={step} />}

      <div className="max-w-3xl mx-auto" ref={containerRef}>
         {/* Error banner (inline, contextual retry for Phase 2 reshoots) */}
         {error && (
            <div role="alert" className="mb-6 p-4 sm:p-5 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-4 shadow-xl">
               <div className="flex items-start justify-between gap-4">
                 <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-red-400 font-bold tracking-tight text-sm sm:text-base">Verification Failed</h4>
                          <StatusPill tone="error">Action Needed</StatusPill>
                       </div>
                       <p className="text-red-300/80 text-xs sm:text-sm">{error}</p>
                    </div>
                 </div>
                 <button onClick={() => setError("")} className="text-red-400 hover:text-white transition-colors shrink-0 p-1" type="button" aria-label="Dismiss error">
                    <X className="w-4 h-4"/>
                 </button>
               </div>
               {error.includes("Verification failed.") && (
                   <div className="pt-3 border-t border-red-500/20 flex">
                      <NeonButton onClick={() => { setError(""); setImageUrl(""); setImageS3Key(null); setStep(2); }} variant="danger" className="!py-3 !px-6 text-xs">
                         Try a different photo <ArrowRight className="w-4 h-4 ml-2" />
                      </NeonButton>
                   </div>
               )}
            </div>
         )}

         {/* Terminal states */}
         {isAlreadyVerified ? (
            <DynamicCard hoverEffect={false} className="border border-primary/30 bg-gradient-to-b from-primary/10 to-primary/0 p-8 sm:p-14 text-center rounded-3xl shadow-[inset_0_0_60px_rgba(63,229,108,0.1)] relative overflow-hidden">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 border border-primary/30 mb-6">
                  <CheckCircle2 className="w-10 h-10 text-primary drop-shadow-[0_0_20px_rgba(63,229,108,0.6)]" />
               </div>
               <div className="flex items-center justify-center gap-2 mb-3">
                  <StatusPill tone="success">Verified</StatusPill>
               </div>
               <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">Identity Verified</h2>
               <p className="text-[#8892b0] mb-8 font-medium tracking-wide max-w-lg mx-auto text-sm sm:text-base">
                  Your identity has been successfully verified. You now have full access to Midly's secure escrow, wallet, and peer-to-peer trading features.
               </p>
               <NeonButton onClick={() => router.push("/dashboard")} className="!py-3 sm:!py-4 !px-6 sm:!px-10 text-xs sm:text-sm uppercase font-bold tracking-widest w-full sm:w-auto">
                  Go to Dashboard <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
               </NeonButton>
               <div className="absolute top-4 right-4 group">
                  <button onClick={handleDevReset} className="p-2 sm:p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 touch-manipulation" type="button" aria-label="Dev reset">
                     <RotateCcw className="w-4 h-4" />
                     <span className="text-[10px] uppercase tracking-widest hidden group-hover:block font-bold">Dev Reset</span>
                  </button>
               </div>
            </DynamicCard>
         ) : isPendingReview ? (
            <DynamicCard hoverEffect={false} className="border border-amber-500/30 bg-amber-500/5 p-8 sm:p-14 text-center rounded-3xl">
               <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 mb-6">
                  <Clock className="w-10 h-10 text-amber-300" />
               </div>
               <div className="flex items-center justify-center gap-2 mb-3">
                  <StatusPill tone="pending">Pending Admin Review</StatusPill>
               </div>
               <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">Manual Review In Progress</h2>
               <p className="text-[#8892b0] mb-8 font-medium tracking-wide max-w-lg mx-auto text-sm sm:text-base">
                  Your biometric match landed in the review band. A Midly administrator will confirm your identity shortly. You'll be notified via email once the decision is finalized.
               </p>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left">
                     <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">Typical wait</p>
                     <p className="text-sm text-white font-bold">Under 24 hours</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left">
                     <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">Notification</p>
                     <p className="text-sm text-white font-bold">Via email</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left">
                     <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">Trading access</p>
                     <p className="text-sm text-white font-bold">Paused</p>
                  </div>
               </div>
               <NeonButton onClick={() => router.push("/dashboard")} variant="secondary" className="!py-3 !px-6 text-xs uppercase font-bold tracking-widest w-full sm:w-auto">
                  Back to Dashboard
               </NeonButton>
            </DynamicCard>
         ) : (
          <div ref={stepContainerRef}>
            {/* PHASE 1 — Identity data */}
            {step === 1 && (
               <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-3xl">
                  <div className="mb-6">
                     <p
                        onClick={handleDevTap}
                        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2 cursor-default select-none"
                        aria-hidden="true"
                     >
                        Phase 1 of 3
                     </p>
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Select Your Government ID</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm">Choose the document you'll use to verify your identity. This is encrypted before it touches our database.</p>
                  </div>

                  <RequirementsBar items={[
                     { icon: Lock, text: "ID number encrypted (AES-256-GCM)" },
                     { icon: ShieldCheck, text: "Duplicate-ID protection enabled" },
                     { icon: Info, text: "Must match the document name on your account" },
                  ]} />

                  <div className="space-y-3 mb-6">
                     {ID_OPTIONS.map((opt) => {
                        const active = selectedID === opt.label;
                        return (
                           <button
                              key={opt.label}
                              type="button"
                              onClick={() => setSelectedID(opt.label)}
                              aria-pressed={active}
                              className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between group touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                 active ? 'border-primary bg-primary/5' : 'border-white/5 bg-[#050608] hover:border-white/20'
                              }`}
                           >
                              <div className="flex items-center gap-4 min-w-0">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-primary/15 text-primary' : 'bg-white/[0.03] text-[#8892b0] group-hover:text-white'}`}>
                                    <opt.icon className="w-5 h-5" />
                                 </div>
                                 <div className="min-w-0">
                                    <p className={`font-bold tracking-wide text-sm sm:text-base truncate ${active ? 'text-white' : 'text-[#d0d8e0]'}`}>{opt.label}</p>
                                    <p className="text-[10px] sm:text-xs text-[#8892b0] mt-0.5 font-mono">{opt.hint}</p>
                                 </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'border-primary' : 'border-white/10 group-hover:border-white/30'}`}>
                                 {active && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                              </div>
                           </button>
                        );
                     })}
                  </div>

                  <div className="mb-8">
                     <label htmlFor="kyc-id-number" className="text-[10px] sm:text-xs font-bold text-[#8892b0] uppercase tracking-wider mb-2 block">ID Number</label>
                     <input
                        id="kyc-id-number"
                        type="text"
                        value={idNumber}
                        onChange={e => setIdNumber(e.target.value)}
                        placeholder={selectedID ? ID_OPTIONS.find(o => o.label === selectedID)?.hint : "000-000-0000"}
                        className="w-full bg-[#050608] border border-white/10 p-3 sm:p-4 rounded-xl text-white focus:border-primary focus:outline-none placeholder:text-white/20 text-sm sm:text-base transition-colors font-mono"
                        autoComplete="off"
                     />
                  </div>

                  <NeonButton
                     className="w-full !py-4 sm:!py-5 text-xs sm:text-sm uppercase tracking-widest font-black touch-manipulation"
                     disabled={!selectedID || !idNumber || isProcessing}
                     isLoading={isProcessing}
                     onClick={handlePhase1}
                  >
                     Continue to Document <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  </NeonButton>
               </DynamicCard>
            )}

            {/* PHASE 2 — Document upload */}
            {step === 2 && (
               <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-3xl">
                  <div className="mb-6">
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2">Phase 2 of 3</p>
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Upload Your ID Document</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm">A Tesseract OCR + face-detection worker extracts the data. Make sure the photo is sharp — rejected photos need a fresh attempt.</p>
                  </div>

                  <RequirementsBar items={[
                     { icon: ImageIcon, text: "Minimum resolution 800×500 pixels" },
                     { icon: Lightbulb, text: "Even lighting, no glare or shadows" },
                     { icon: Eye, text: "All four corners and text fully visible" },
                  ]} />

                  <label className={`border-2 border-dashed rounded-2xl sm:rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center mb-6 transition-all cursor-pointer group touch-manipulation focus-within:border-primary ${
                     imageUrl ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-[#050608] hover:bg-white/[0.02] hover:border-primary/40'
                  }`}>
                     <input type="file" className="sr-only" accept="image/jpeg,image/png,image/jpg" onChange={handleFileUpload} disabled={isUploading || isProcessing} />
                     {isUploading ? (
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                     ) : imageUrl ? (
                        <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                           <CheckCircle2 className="w-6 h-6 text-primary" />
                        </div>
                     ) : (
                        <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 group-hover:border-primary/30 transition-colors">
                           <UploadCloud className="w-6 h-6 text-[#8892b0] group-hover:text-primary transition-colors" />
                        </div>
                     )}
                     <p className="text-white font-bold text-base sm:text-lg mb-1">
                        {isUploading ? 'Uploading...' : imageUrl ? 'Document Uploaded' : 'Click to upload'}
                     </p>
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#8892b0] text-center px-4">
                        {imageUrl ? 'Swap for a new photo' : 'JPG or PNG · up to 5MB'}
                     </p>
                  </label>

                  {isProcessing && <ProcessingPanel status={processingStatus} />}

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                     <NeonButton variant="secondary" className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold touch-manipulation" disabled={isProcessing} onClick={() => setStep(1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                     </NeonButton>
                     <NeonButton
                        className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold tracking-widest touch-manipulation"
                        disabled={!imageUrl || isUploading || isProcessing}
                        isLoading={isProcessing}
                        onClick={handlePhase2}
                     >
                        Validate Document <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                     </NeonButton>
                  </div>
               </DynamicCard>
            )}

            {/* PHASE 3 — Liveness */}
            {step === 3 && (
               <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-6 sm:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] rounded-3xl">
                  <div className="mb-6">
                     <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary mb-2">Phase 3 of 3</p>
                     <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">Live Identity Challenge</h2>
                     <p className="text-[#8892b0] text-xs sm:text-sm">We'll capture {challenges.length} frames over ~{(challenges.length * 2)} seconds while you complete the prompts. This confirms you're a real person and matches your face to the ID.</p>
                  </div>

                  <RequirementsBar items={[
                     { icon: Camera, text: "Physical hardware webcam (virtual cams are blocked)" },
                     { icon: Eye, text: "Face centered, unobstructed, well-lit" },
                     { icon: User, text: "Remove glasses, masks, or heavy accessories" },
                  ]} />

                  {/* Webcam frame */}
                  <div className="w-full max-w-md mx-auto mb-6 aspect-video rounded-3xl overflow-hidden bg-[#030407] border-4 border-white/5 relative shadow-xl">
                     {livenessFrames.length === 0 ? (
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
                        <img src={livenessFrames[0]} alt="Captured selfie preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                     )}

                     {/* Overlay: challenge text + progress */}
                     {isCapturing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-5 bg-gradient-to-t from-black/70 via-transparent to-transparent z-20">
                           <div className="bg-primary/20 backdrop-blur-md border border-primary/40 rounded-xl px-4 py-2 mb-3">
                              <p className="text-primary font-bold text-sm animate-pulse">{challengeText}</p>
                           </div>
                           <div className="w-3/4 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(63,229,108,0.6)]" style={{ width: `${captureProgress}%` }} />
                           </div>
                        </div>
                     )}

                     {/* Frame counter badge */}
                     {livenessFrames.length > 0 && !isCapturing && (
                        <div className="absolute top-3 right-3 z-10 bg-primary/20 border border-primary/30 rounded-lg px-3 py-1 backdrop-blur-sm">
                           <span className="text-primary text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {livenessFrames.length} frames captured
                           </span>
                        </div>
                     )}

                     {/* Action buttons */}
                     <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
                        {livenessFrames.length === 0 && !isCapturing ? (
                           <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); startLivenessCapture(); }}
                              aria-label="Start capture"
                              className="w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg border-2 border-white/20 z-50 touch-manipulation">
                              <Camera className="w-6 h-6" />
                           </button>
                        ) : livenessFrames.length > 0 && !isCapturing ? (
                           <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setLivenessFrames([]); setCaptureProgress(0); setChallengeText(''); setCurrentChallengeIdx(-1); }}
                              className="px-5 py-2 bg-[#0a0d14] text-white rounded-full flex items-center gap-2 hover:bg-white/10 transition-colors shadow-lg border border-white/20 font-bold text-xs uppercase tracking-widest z-50 touch-manipulation">
                              <RotateCcw className="w-4 h-4" /> Retake
                           </button>
                        ) : null}
                     </div>
                  </div>

                  {/* Challenge checklist */}
                  <ol className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-6">
                     {challenges.map((c, i) => {
                        const done = currentChallengeIdx > i || livenessFrames.length > 0;
                        const current = currentChallengeIdx === i && isCapturing;
                        return (
                           <li key={i} className={`flex sm:flex-col items-center gap-2 sm:gap-1.5 p-2 sm:p-3 rounded-xl border transition-colors ${
                              done ? 'border-primary/30 bg-primary/5' : current ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/[0.02]'
                           }`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${
                                 done ? 'bg-primary text-black' : current ? 'bg-primary/20 text-primary border border-primary' : 'bg-white/5 text-[#8892b0]'
                              }`}>
                                 {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                              </div>
                              <p className={`text-[10px] sm:text-[11px] font-medium leading-tight ${done || current ? 'text-white' : 'text-[#8892b0]'} sm:text-center`}>
                                 {c}
                              </p>
                           </li>
                        );
                     })}
                  </ol>

                  {isProcessing && <ProcessingPanel status={processingStatus} />}

                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                     <NeonButton variant="secondary" className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold touch-manipulation" disabled={isProcessing || isCapturing} onClick={() => setStep(2)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                     </NeonButton>
                     <NeonButton
                        className="w-full sm:flex-1 !py-4 sm:!py-5 text-xs sm:text-sm uppercase font-bold tracking-widest touch-manipulation"
                        disabled={isProcessing || isCapturing || livenessFrames.length < 3}
                        isLoading={isProcessing}
                        onClick={handlePhase3}
                     >
                        Verify Identity <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                     </NeonButton>
                  </div>
               </DynamicCard>
            )}
          </div>
         )}

         {/* Help footer — visible on all non-terminal steps */}
         {!isAlreadyVerified && !isPendingReview && (
            <footer className="mt-8 text-center">
               <p className="text-[11px] text-[#8892b0]/70 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                  Your data is encrypted at rest and in transit. Phase gates are enforced server-side for every submission.
               </p>
            </footer>
         )}
      </div>
    </div>
  );
}
