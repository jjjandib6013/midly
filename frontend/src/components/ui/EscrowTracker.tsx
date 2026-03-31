"use client";

import { motion } from "framer-motion";
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
  return (
    <div className={cn("w-full py-6", className)}>
      <div className="relative flex justify-between items-center w-full max-w-3xl mx-auto">
        {/* Background Track */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-dark-border -translate-y-1/2 z-0 rounded-full" />

        {/* Dynamic Progress Track */}
        <motion.div
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 rounded-full glow-icon"
          initial={{ width: "0%" }}
          animate={{
            width: `${
              (steps.filter((s) => s.status === "completed").length /
                (steps.length - 1)) *
              100
            }%`,
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
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
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-xl bg-dark-bg",
                  isCompleted
                    ? "border-primary text-primary neon-glow"
                    : isCurrent
                    ? "border-primary/50 text-white animate-pulse glass-panel"
                    : isDisputed
                    ? "border-red-500 text-red-500 neon-glow"
                    : "border-dark-border text-text-muted bg-dark-panel"
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
              </motion.div>
              <div className="text-center absolute top-14 w-32 left-1/2 -translate-x-1/2 mt-2">
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isCompleted || isCurrent ? "text-white" : "text-text-muted"
                  )}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-primary mt-1"
                  >
                    In Progress
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
