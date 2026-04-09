"use client";

import { useRef, MouseEvent, ButtonHTMLAttributes } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export default function NeonButton({
  children,
  className,
  variant = "primary",
  isLoading,
  disabled,
  ...props
}: NeonButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: buttonRef });

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || !spotlightRef.current || disabled || isLoading) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update CSS variables for the radial-gradient position
    spotlightRef.current.style.setProperty("--x", `${x}px`);
    spotlightRef.current.style.setProperty("--y", `${y}px`);
  };

  const handleMouseEnter = contextSafe(() => {
    if (disabled || isLoading) return;
    gsap.to(spotlightRef.current, { opacity: 1, duration: 0.5, ease: "power2.out" });
    gsap.to(buttonRef.current, { y: -2, scale: 1.02, duration: 0.4, ease: "back.out(1.7)" });
  });

  const handleMouseLeave = contextSafe(() => {
    if (disabled || isLoading) return;
    gsap.to(spotlightRef.current, { opacity: 0, duration: 0.5, ease: "power2.out" });
    gsap.to(buttonRef.current, { y: 0, scale: 1, duration: 0.4, ease: "power2.out" });
  });

  const handleMouseDown = contextSafe(() => {
    if (disabled || isLoading) return;
    gsap.to(buttonRef.current, { scale: 0.96, duration: 0.2, ease: "power2.out" });
  });

  const handleMouseUp = contextSafe(() => {
    if (disabled || isLoading) return;
    gsap.to(buttonRef.current, { scale: 1.02, duration: 0.4, ease: "back.out(1.7)" });
  });

  const isPrimary = variant === "primary";
  
  const baseStyles =
    "group relative inline-flex items-center justify-center transition-colors duration-500 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-semibold";

  const variants = {
    primary:
      "bg-primary text-dark-bg hover:shadow-[0_0_40px_-5px_rgba(63,229,108,0.5)] px-8 py-3",
    secondary:
      "bg-dark-panel/80 backdrop-blur-md border border-white/5 text-white shadow-xl hover:border-primary/50 hover:text-primary px-8 py-3",
    danger:
      "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:border-red-500/50 px-8 py-3",
    ghost: "bg-transparent text-text-muted hover:text-white px-6 py-2",
  };

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(baseStyles, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Spotlight Hover Effect via CSS Variables */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute -inset-px rounded-full opacity-0 z-0"
        style={{
          background: `radial-gradient(75px circle at var(--x, 50%) var(--y, 50%), ${isPrimary ? 'rgba(255,255,255,0.4)' : 'rgba(63, 229, 108, 0.2)'}, transparent 100%)`
        }}
      />
      
      {isLoading ? (
        <span className="flex items-center gap-3 relative z-10 w-full justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Processing...
        </span>
      ) : (
        <span className="relative z-10 flex items-center justify-center gap-2 w-full">{children}</span>
      )}
    </button>
  );
}
