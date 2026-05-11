"use client";

import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Lock, UserCheck, RefreshCw, Zap, ShieldCheck, Scale } from "lucide-react";

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
  },
];

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

          {/* Left Column ΓÇö Pinned by GSAP */}
          <div
            ref={leftRef}
            className="w-full lg:w-[45%] flex flex-col justify-center py-20 lg:py-0 lg:h-screen"
          >
            {/* Badge */}
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

            {/* Social proof */}
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

          {/* Right Column ΓÇö Scrollable Cards */}
          <div className="w-full lg:w-[55%] flex flex-col gap-8 py-12 lg:py-24">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
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
                  {/* Top Accent Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                      background: `linear-gradient(90deg, transparent 10%, ${step.accent}50 50%, transparent 90%)`,
                    }}
                  />

                  {/* Step Label */}
                  <div className="flex items-center gap-3 mb-5">
                    <span
                      className="text-xs font-bold tracking-[0.25em] uppercase"
                      style={{ color: step.accent }}
                    >
                      {step.number} ┬╖ {step.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl lg:text-3xl font-bold text-white tracking-tight mb-4 leading-tight">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#8892b0] font-medium leading-relaxed mb-8 max-w-lg">
                    {step.description}
                  </p>

                  {/* Visual placeholder */}
                  <div
                    className="relative w-full h-[280px] rounded-2xl overflow-hidden border border-white/[0.04]"
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

                    {/* Centered Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center border backdrop-blur-sm"
                        style={{
                          backgroundColor: `${step.accent}10`,
                          borderColor: `${step.accent}20`,
                          boxShadow: `0 0 80px ${step.accent}20`,
                        }}
                      >
                        <StepIcon
                          className="w-10 h-10"
                          style={{ color: step.accent }}
                        />
                      </div>
                    </div>

                    {/* Ambient glow */}
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[100px] pointer-events-none"
                      style={{ backgroundColor: `${step.accent}10` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
