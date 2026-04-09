"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type EscrowStep = {
  id: number;
  label: string;
  status: "completed" | "current" | "pending" | "disputed";
};

interface EscrowTrackerProps {
  steps: EscrowStep[];
  className?: string;
}

export default function EscrowTracker({ steps, className }: EscrowTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (trackRef.current) {
      const progressPercent = (steps.filter((s) => s.status === "completed").length / (steps.length - 1)) * 100;
      gsap.fromTo(
         trackRef.current,
         { width: "0%" },
         { width: `${progressPercent}%`, duration: 0.8, ease: "power2.out" }
      );
    }
    
    gsap.fromTo(
      ".step-circle",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, stagger: 0.1, duration: 0.5, ease: "back.out(1.5)" }
    );
  }, { scope: containerRef, dependencies: [steps] });

  return (
    <div ref={containerRef} className={cn("w-full py-6", className)}>
      <div className="relative flex justify-between items-center w-full max-w-3xl mx-auto">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-[#0a0d14] border border-white/5 -translate-y-1/2 z-0 rounded-full" />

        {/* Dynamic Progress Track */}
        <div
          ref={trackRef}
          className="absolute top-1/2 left-0 h-1 bg-[#3FE56C] -translate-y-1/2 z-0 rounded-full shadow-[0_0_15px_rgba(63,229,108,0.5)]"
        />

        {/* Steps */}
        {steps.map((step, index) => {
          const isCompleted = step.status === "completed";
          const isCurrent = step.status === "current";
          const isDisputed = step.status === "disputed";

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center gap-3"
            >
              <div
                className={cn(
                  "step-circle w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.5)] bg-[#030407]",
                  isCompleted
                    ? "border-[#3FE56C] text-[#3FE56C]"
                    : isCurrent
                    ? "border-[#3FE56C]/50 text-white shadow-[0_0_20px_rgba(63,229,108,0.2)] bg-[#3FE56C]/10"
                    : isDisputed
                    ? "border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-500/10"
                    : "border-white/10 text-[#8892b0] opacity-50"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : isDisputed ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CircleDashed
                    className={cn(
                      "w-6 h-6",
                      isCurrent && "animate-[spin_4s_linear_infinite]"
                    )}
                  />
                )}
              </div>
              <div className="text-center absolute top-14 w-32 left-1/2 -translate-x-1/2 mt-2">
                <span
                  className={cn(
                    "text-xs font-black uppercase tracking-widest transition-colors duration-300",
                    isCompleted || isCurrent ? "text-white" : "text-[#8892b0]"
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <div className="text-[10px] uppercase font-bold tracking-widest text-[#3FE56C] mt-2 animate-pulse">
                    In Progress
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
