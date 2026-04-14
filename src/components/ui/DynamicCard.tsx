"use client";

import { useRef, MouseEvent, ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DynamicCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  delay?: number;
}

export default function DynamicCard({
  children,
  className,
  hoverEffect = false,
  delay = 0,
}: DynamicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlight1Ref = useRef<HTMLDivElement>(null);
  const spotlight2Ref = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: cardRef });

  useGSAP(() => {
    // Entrance animation using ScrollTrigger
    gsap.fromTo(cardRef.current, 
      { opacity: 0, y: 40 },
      {
        scrollTrigger: {
          trigger: cardRef.current,
          start: "top 95%",
          toggleActions: "play none none none"
        },
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: delay,
        ease: "power3.out"
      }
    );
  }, { scope: cardRef });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!hoverEffect || !cardRef.current || !spotlight1Ref.current || !spotlight2Ref.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    spotlight1Ref.current.style.setProperty("--x", `${x}px`);
    spotlight1Ref.current.style.setProperty("--y", `${y}px`);
    spotlight2Ref.current.style.setProperty("--x", `${x}px`);
    spotlight2Ref.current.style.setProperty("--y", `${y}px`);
  };

  const handleMouseEnter = contextSafe(() => {
    if (!hoverEffect) return;
    gsap.to([spotlight1Ref.current, spotlight2Ref.current], { opacity: 1, duration: 0.5, ease: "power2.out" });
    gsap.to(cardRef.current, { y: -4, duration: 0.4, ease: "power2.out" });
  });

  const handleMouseLeave = contextSafe(() => {
    if (!hoverEffect) return;
    gsap.to([spotlight1Ref.current, spotlight2Ref.current], { opacity: 0, duration: 0.5, ease: "power2.out" });
    gsap.to(cardRef.current, { y: 0, duration: 0.5, ease: "power2.out" });
  });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative rounded-3xl p-8 overflow-hidden transition-colors duration-500",
        "bg-dark-panel border border-white/5 shadow-xl",
        className
      )}
    >
      {/* Background Hover Spotlight */}
      {hoverEffect && (
        <div
          ref={spotlight1Ref}
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 z-0"
          style={{
            background: `radial-gradient(700px circle at var(--x, 50%) var(--y, 50%), rgba(255, 255, 255, 0.03), transparent 80%)`
          }}
        />
      )}
      {/* Border Spotlight */}
      {hoverEffect && (
        <div
          ref={spotlight2Ref}
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 z-0"
          style={{
            background: `radial-gradient(400px circle at var(--x, 50%) var(--y, 50%), rgba(255, 255, 255, 0.15), transparent 80%)`,
            maskImage: `linear-gradient(black, black)`,
            maskComposite: "exclude",
            WebkitMaskComposite: "destination-out",
            padding: "1px",
          }}
        >
            <div className="bg-black w-full h-full rounded-[inherit] absolute inset-0 z-0" />
        </div>
      )}
      
      <div className="relative z-10">{children}</div>
    </div>
  );
}
