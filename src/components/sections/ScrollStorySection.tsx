"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

const FRAMES = [
  { slide: 0, stage: 0 },
  { slide: 0, stage: 1 },
  { slide: 1, stage: 0 },
  { slide: 1, stage: 1 },
  { slide: 1, stage: 2 },
  { slide: 2, stage: 0 },
  { slide: 2, stage: 1 },
  { slide: 2, stage: 2 },
  { slide: 2, stage: 3 },
  { slide: 2, stage: 4 },
];

const GRAPH_POINTS = [
  { year: "2021", value: 22 },
  { year: "2022", value: 36 },
  { year: "2023", value: 52 },
  { year: "2024", value: 70 },
  { year: "2025", value: 92 },
];

interface ScrollStorySectionProps {
  onEnter?: () => void;
  onExit?: () => void;
}

export default function ScrollStorySection({ onEnter, onExit }: ScrollStorySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const wheelAccumRef = useRef(0);
  const wheelCooldownRef = useRef(false);
  const prevFrameRef = useRef(0);
  const [flash, setFlash] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const prevOverflowRef = useRef<string | null>(null);
  const isEscapingRef = useRef(false);

  const activeFrame = FRAMES[frameIndex];
  const activeSlide = activeFrame.slide;
  const stage = activeFrame.stage;

  const indicatorIndex = useMemo(() => activeSlide, [activeSlide]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isEscapingRef.current) return;
      const rect = el.getBoundingClientRect();
      // Lock if the top of the section is within 100px of the top of the viewport
      const shouldLock = Math.abs(rect.top) < 100;
      
      if (shouldLock && !isActive && !wheelCooldownRef.current) {
        const lenis = (window as any).lenis;
        if (lenis) lenis.stop();
        // Snap to perfect alignment
        window.scrollTo({ top: window.scrollY + rect.top });
        if (lenis) lenis.scrollTo(window.scrollY + rect.top, { immediate: true });
        onEnter?.();
        setIsActive(true);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isActive, onEnter]);

  useEffect(() => {
    const lenis = (window as any).lenis;
    if (!isActive) {
      if (prevOverflowRef.current !== null) {
        document.body.style.overflow = prevOverflowRef.current;
        prevOverflowRef.current = null;
      }
      if (lenis) lenis.start();
      return;
    }

    if (lenis) lenis.stop();
    prevOverflowRef.current = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";

    return () => {
      if (prevOverflowRef.current !== null) {
        document.body.style.overflow = prevOverflowRef.current;
        prevOverflowRef.current = null;
      }
      if (lenis) lenis.start();
    };
  }, [isActive]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isActive) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      const atFirst = frameIndex === 0;
      const atLast = frameIndex === FRAMES.length - 1;

      // Hard lock the page scroll while the story is active
      e.preventDefault();
      e.stopPropagation();

      if (direction < 0 && atFirst) {
        isEscapingRef.current = true;
        setIsActive(false);
        onExit?.();
        
        const lenis = (window as any).lenis;
        if (lenis) {
           lenis.start();
           lenis.scrollTo(window.scrollY - 150, { immediate: true });
        } else {
           window.scrollBy({ top: -150, behavior: "smooth" });
        }
        
        setTimeout(() => { isEscapingRef.current = false; }, 1000);
        return;
      }

      if (direction > 0 && atLast) {
        isEscapingRef.current = true;
        setIsActive(false);
        onExit?.();
        
        const lenis = (window as any).lenis;
        if (lenis) {
           lenis.start();
           lenis.scrollTo(window.scrollY + 150, { immediate: true });
           const features = document.getElementById("features");
           if (features) {
              lenis.scrollTo(features, { duration: 1.2, offset: -50 });
           }
        } else {
           window.scrollBy({ top: 150, behavior: "smooth" });
        }
        
        setTimeout(() => { isEscapingRef.current = false; }, 1000);
        return;
      }

      if (wheelCooldownRef.current) return;

      wheelAccumRef.current += e.deltaY;
      if (Math.abs(wheelAccumRef.current) < 140) return;

      const step = wheelAccumRef.current > 0 ? 1 : -1;
      wheelAccumRef.current = 0;
      wheelCooldownRef.current = true;

      setFrameIndex((prev) => {
        const next = prev + step;
        return Math.max(0, Math.min(FRAMES.length - 1, next));
      });

      window.setTimeout(() => {
        wheelCooldownRef.current = false;
      }, 320);
    };

    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true } as AddEventListenerOptions);
  }, [frameIndex, isActive, onExit]);

  useEffect(() => {
    const prevFrame = FRAMES[prevFrameRef.current];
    const nextFrame = FRAMES[frameIndex];

    if (prevFrame.slide === 1 && nextFrame.slide === 2) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 650);
    }

    const delta = (prevFrameRef.current - frameIndex) * 60;
    prevFrameRef.current = frameIndex;
    window.dispatchEvent(new CustomEvent("starfield-drift", { detail: { delta } }));
  }, [frameIndex]);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-16"
    >
      {flash && <div className="absolute inset-0 pointer-events-none animate-slide-sweep" />}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto text-center flex flex-col items-center justify-center">
        {/* Slide Indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 sm:-bottom-16 flex items-center gap-2">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`h-[3px] w-12 rounded-full transition-colors ${
                indicatorIndex === idx ? "bg-primary" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Slide 1: The Problem */}
        {activeSlide === 0 && (
          <div className="transition-all duration-700">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-[#92c7b0] uppercase mb-4 transition-all duration-700">
              The Problem
            </div>
            <h2
              className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-[#d7f3e6] transition-all duration-700 ${
                stage === 0 ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              Filipino traders lost over <span className="text-primary">₱198 Million</span> to online fraud in 2024.
            </h2>
            <p
              className={`mt-4 text-xs sm:text-sm text-[#9fb9ad] transition-all duration-700 ${
                stage === 0 ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              Behind every "trusted middleman" in a Discord server is a stranger holding
              both sides of the deal. One disappears, both lose.
            </p>
          </div>
        )}

        {/* Slide 2: Scam Rate Graph */}
        {activeSlide === 1 && (
          <div className="transition-all duration-700">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-[#92c7b0] uppercase mb-4 transition-all duration-700">
              Scam Rate — Philippines
            </div>
            <h2
              className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-[#d7f3e6] transition-all duration-700 ${
                stage === 0 ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              Cybercrime complaints surged to <span className="text-primary">10,004+</span> recorded cases last year.
            </h2>

            <div
              className={`relative mt-10 mx-auto max-w-[820px] rounded-3xl border border-white/15 bg-black/50 p-8 transition-all duration-700 ${
                stage === 0 ? "opacity-0 translate-y-6" : stage === 1 ? "opacity-60 translate-y-3" : "opacity-100 translate-y-0"
              }`}
            >
              <div className="relative h-44 sm:h-56">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path
                    d="M5,40 L22,28 L40,34 L58,22 L76,30 L95,10"
                    fill="none"
                    stroke="#3FE56C"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="graph-stroke"
                  />
                </svg>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between">
                  {GRAPH_POINTS.map((point) => (
                    <span key={point.year} className="text-[10px] sm:text-xs text-[#9fb9ad]">
                      {point.year}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-6 text-[10px] sm:text-xs text-[#6f8a80] uppercase tracking-widest">
                Indexed reports of online fraud and swindling in the Philippines
              </p>
            </div>
          </div>
        )}

        {/* Slide 3: The Solution */}
        {activeSlide === 2 && (
          <div className="transition-all duration-700">
            <div className="text-[10px] sm:text-xs tracking-[0.3em] text-[#92c7b0] uppercase mb-4 transition-all duration-700">
              The Solution
            </div>
            <h2
              className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-[#d7f3e6] transition-all duration-700 ${
                stage === 0 ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              Meet <span className="text-primary">Midly</span> — the escrow platform that holds everyone accountable.
            </h2>
            <p
              className={`mt-4 text-xs sm:text-sm text-[#9fb9ad] transition-all duration-700 ${
                stage < 1 ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
              }`}
            >
              Verified identities, locked escrow wallets, and secure trade rooms — every transaction is
              protected end-to-end. No ghosting. No vanishing. Just a flat 5% fee.
            </p>

            <div
              className={`mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-700 ${
                stage < 2 ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
              }`}
            >
              {stage >= 2 && (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left">
                  <div className="text-sm font-semibold text-white">Verified ID</div>
                  <div className="text-[11px] text-white/70 mt-1">KYC for every party</div>
                </div>
              )}
              {stage >= 3 && (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left">
                  <div className="text-sm font-semibold text-white">Smart Vault</div>
                  <div className="text-[11px] text-white/70 mt-1">Funds locked on-chain</div>
                </div>
              )}
              {stage >= 4 && (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left">
                  <div className="text-sm font-semibold text-white">Auto Release</div>
                  <div className="text-[11px] text-white/70 mt-1">Only on dual confirm</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
