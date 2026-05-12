"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Lock, RefreshCw, Zap, ShieldCheck, Scale } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    id: 1,
    number: "01",
    category: "AGREEMENT",
    title: "Set terms and conditions.",
    description:
      "Buyer and seller meet in a secure trade room to define what's being traded, the price, and the delivery method. Everything is documented upfront.",
    icon: Scale,
    accent: "#A855F7",
    visual: "agreement",
  },
  {
    id: 2,
    number: "02",
    category: "LOCK",
    title: "Lock the payment.",
    description:
      "The buyer deposits the agreed amount into the Midly Escrow Vault. The funds are instantly verified and locked—visible to both parties, but untouchable by either.",
    icon: Lock,
    accent: "#3B82F6",
    visual: "lock",
  },
  {
    id: 3,
    number: "03",
    category: "HANDOVER",
    title: "Deliver the asset.",
    description:
      "With the money safely locked, the seller transfers the game account, skin, or item in-game, and uploads screenshot proof directly into the trade room.",
    icon: RefreshCw,
    accent: "#EC4899",
    visual: "handover",
  },
  {
    id: 4,
    number: "04",
    category: "VERIFICATION",
    title: "Verify the transfer.",
    description:
      "The buyer reviews the delivered asset to ensure it matches the agreement exactly. If anything is wrong, Midly admins step in to investigate.",
    icon: ShieldCheck,
    accent: "#F59E0B",
    visual: "verification",
  },
  {
    id: 5,
    number: "05",
    category: "RELEASE",
    title: "Escrow complete.",
    description:
      "Upon successful mutual verification, Midly instantly releases the locked funds to the seller's wallet. A flawless, zero-trust transaction.",
    icon: Zap,
    accent: "#3FE56C",
    visual: "release",
  },
];

/* ──────────────────────────────────────────────────────────────
 * STEP VISUAL — lightweight SVG illustrations themed per step.
 * Kept simple and on-brand. No external image dependency.
 * ────────────────────────────────────────────────────────────── */
function StepVisual({ type, accent }: { type: string; accent: string }) {
  switch (type) {
    case "agreement":
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <linearGradient id="g-agreement" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Two cards meeting in the middle */}
          <rect x="30" y="40" width="90" height="110" rx="10" fill="url(#g-agreement)" stroke={accent} strokeOpacity="0.4" />
          <rect x="200" y="40" width="90" height="110" rx="10" fill="url(#g-agreement)" stroke={accent} strokeOpacity="0.4" />
          <line x1="130" y1="60" x2="190" y2="60" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="130" y1="90" x2="190" y2="90" stroke={accent} strokeOpacity="0.8" strokeWidth="2" />
          <line x1="130" y1="120" x2="190" y2="120" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="4 4" />
          {/* Handshake signatures — simulated lines */}
          <rect x="45" y="60"  width="60" height="4" rx="2" fill="#fff" fillOpacity="0.5" />
          <rect x="45" y="74"  width="45" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
          <rect x="45" y="115" width="60" height="4" rx="2" fill="#fff" fillOpacity="0.5" />
          <rect x="45" y="129" width="35" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
          <rect x="215" y="60"  width="60" height="4" rx="2" fill="#fff" fillOpacity="0.5" />
          <rect x="215" y="74"  width="45" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
          <rect x="215" y="115" width="60" height="4" rx="2" fill="#fff" fillOpacity="0.5" />
          <rect x="215" y="129" width="35" height="4" rx="2" fill="#fff" fillOpacity="0.3" />
          {/* Center dot */}
          <circle cx="160" cy="90" r="5" fill={accent} />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <radialGradient id="g-lock" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="90" r="80" fill="url(#g-lock)" />
          {/* Vault body */}
          <rect x="120" y="80" width="80" height="60" rx="8" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.6" strokeWidth="2" />
          {/* Shackle */}
          <path d="M 135 80 L 135 60 A 25 25 0 0 1 185 60 L 185 80" stroke={accent} strokeWidth="3" fill="none" strokeOpacity="0.9" />
          {/* Keyhole */}
          <circle cx="160" cy="105" r="5" fill={accent} />
          <rect x="158" y="108" width="4" height="12" fill={accent} />
          {/* Coins floating near */}
          <circle cx="80"  cy="60" r="10" fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.5" />
          <circle cx="240" cy="140" r="8" fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.5" />
          <circle cx="60"  cy="130" r="6" fill={accent} fillOpacity="0.15" stroke={accent} strokeOpacity="0.5" />
        </svg>
      );
    case "handover":
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <linearGradient id="g-handover" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Sender device */}
          <rect x="30" y="50" width="70" height="100" rx="10" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.5" />
          <rect x="40" y="60" width="50" height="70" rx="4" fill="#fff" fillOpacity="0.06" />
          {/* Arrow */}
          <line x1="115" y1="100" x2="205" y2="100" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <polyline points="195,90 210,100 195,110" stroke={accent} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Asset icon in transit */}
          <rect x="148" y="85" width="30" height="30" rx="4" fill={accent} fillOpacity="0.9" />
          <path d="M 156 100 L 163 107 L 172 93" stroke="#030407" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* Receiver device */}
          <rect x="220" y="50" width="70" height="100" rx="10" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.5" />
          <rect x="230" y="60" width="50" height="70" rx="4" fill="#fff" fillOpacity="0.06" />
          {/* Pulse behind arrow */}
          <circle cx="160" cy="100" r="60" fill="url(#g-handover)" />
        </svg>
      );
    case "verification":
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <radialGradient id="g-verify" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="90" r="80" fill="url(#g-verify)" />
          {/* Shield */}
          <path
            d="M 160 30 L 210 50 L 210 95 Q 210 135 160 155 Q 110 135 110 95 L 110 50 Z"
            fill={accent}
            fillOpacity="0.08"
            stroke={accent}
            strokeOpacity="0.7"
            strokeWidth="2"
          />
          {/* Check */}
          <path
            d="M 135 92 L 155 112 L 190 72"
            stroke={accent}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Scan dots */}
          <circle cx="70"  cy="45" r="3" fill={accent} fillOpacity="0.5" />
          <circle cx="250" cy="45" r="3" fill={accent} fillOpacity="0.5" />
          <circle cx="70"  cy="135" r="3" fill={accent} fillOpacity="0.5" />
          <circle cx="250" cy="135" r="3" fill={accent} fillOpacity="0.5" />
        </svg>
      );
    case "release":
      return (
        <svg viewBox="0 0 320 180" className="w-full h-full">
          <defs>
            <radialGradient id="g-release" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="90" r="85" fill="url(#g-release)" />
          {/* Open lock */}
          <rect x="120" y="80" width="80" height="60" rx="8" fill={accent} fillOpacity="0.08" stroke={accent} strokeOpacity="0.6" strokeWidth="2" />
          <path d="M 135 80 L 135 60 A 25 25 0 0 1 185 60" stroke={accent} strokeWidth="3" fill="none" strokeOpacity="0.9" />
          {/* Money flow — upward arrows */}
          <g stroke={accent} strokeWidth="2.5" strokeLinecap="round" fill="none" strokeLinejoin="round">
            <line x1="160" y1="70" x2="160" y2="20" />
            <polyline points="150,30 160,20 170,30" />
          </g>
          {/* Sparkle dots */}
          <circle cx="60"  cy="40"  r="2" fill={accent} />
          <circle cx="260" cy="50"  r="2" fill={accent} />
          <circle cx="50"  cy="120" r="2" fill={accent} />
          <circle cx="270" cy="130" r="2" fill={accent} />
          <circle cx="100" cy="25"  r="1.5" fill="#fff" fillOpacity="0.7" />
          <circle cx="220" cy="30"  r="1.5" fill="#fff" fillOpacity="0.7" />
        </svg>
      );
    default:
      return null;
  }
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current || !leftRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: leftRef.current,
        pinSpacing: false,
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative w-full bg-transparent border-t border-white/[0.02]"
    >
      <div className="max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-16">
        <div className="flex flex-col lg:flex-row lg:items-start gap-12 lg:gap-24">

          {/* Left Column — Pinned by GSAP */}
          <div
            ref={leftRef}
            className="w-full lg:w-[45%] flex flex-col justify-center py-20 lg:py-0 lg:h-screen"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/20 bg-primary/5 w-fit mb-10">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
                How It Works
              </span>
            </div>

            <h2 className="text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-8">
              How{" "}
              <span className="text-primary">Midly</span>
              <br />
              Works
            </h2>

            <p className="text-lg text-[#8892b0] font-medium leading-relaxed max-w-md mb-12">
              Five steps from handshake to handover. Every action is logged, every
              dollar accounted for — no rogue middlemen, no chargebacks, no
              excuses.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => {
                  const Icon = STEPS[i].icon;
                  return (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-[#030407] flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${STEPS[i].accent}40, ${STEPS[i].accent}10)`,
                        color: STEPS[i].accent,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  );
                })}
              </div>
              <span className="text-white/60 text-sm font-semibold tracking-wide">
                4M+ trades secured
              </span>
            </div>
          </div>

          {/* Right Column — Scrollable Cards */}
          <div className="w-full lg:w-[55%] flex flex-col gap-8 py-12 lg:py-24">
            {STEPS.map((step) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="relative rounded-3xl overflow-hidden bg-[#0A0A0E] border border-white/[0.06] p-8 lg:p-10"
                style={{
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
                }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, transparent 10%, ${step.accent}50 50%, transparent 90%)`,
                  }}
                />

                {/* Step label — no bullet separator, just a gap */}
                <div className="flex items-center gap-4 mb-5">
                  <span
                    className="text-xs font-bold tracking-[0.25em] uppercase"
                    style={{ color: step.accent }}
                  >
                    {step.number}
                  </span>
                  <span
                    className="text-xs font-bold tracking-[0.25em] uppercase"
                    style={{ color: step.accent }}
                  >
                    {step.category}
                  </span>
                </div>

                <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                  {step.title}
                </h3>

                <p className="text-[#8892b0] font-medium leading-relaxed mb-8 max-w-lg">
                  {step.description}
                </p>

                {/* Themed SVG visual — replaces generic icon */}
                <div
                  className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-white/[0.04] flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${step.accent}08, ${step.accent}03, transparent)`,
                  }}
                >
                  {/* Grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "40px 40px",
                    }}
                  />

                  <div className="relative z-10 w-[80%] h-[80%]">
                    <StepVisual type={step.visual} accent={step.accent} />
                  </div>

                  {/* Ambient glow */}
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[100px] pointer-events-none"
                    style={{ backgroundColor: `${step.accent}10` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
