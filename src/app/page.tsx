"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, ArrowRight, Lock, CheckCircle2, PackageSearch, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import FeatureSlider from "@/components/sections/FeatureSlider";

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo(".hero-badge",
      { opacity: 0, x: -30 },
      { opacity: 1, x: 0, duration: 0.8, ease: "power4.out", delay: 0.2 }
    )
      .fromTo(".hero-title .line",
        { opacity: 0, y: 50, rotateX: -40 },
        { opacity: 1, y: 0, rotateX: 0, duration: 1, stagger: 0.15, ease: "power3.out" },
        "-=0.5"
      )
      .fromTo(".hero-desc",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      )
      .fromTo(".hero-btn",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" },
        "-=0.4"
      )
      .fromTo(".hero-footer",
        { opacity: 0 },
        { opacity: 1, duration: 1 },
        "-=0.2"
      );

    gsap.fromTo(".section-header",
      { opacity: 0, y: 50 },
      { scrollTrigger: { trigger: ".section-header", start: "top 80%" }, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );

    // Parallax logic for Awwwards-style depth
    gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
      const speed = parseFloat(el.getAttribute("data-speed") || "0");
      if (speed !== 0) {
        gsap.to(el, {
          yPercent: speed * 100,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement || "body",
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        });
      }
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-start overflow-hidden bg-[#030407]">

      {/* Asymmetric Hero Section */}
      <section className="relative w-full min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-104px)] flex items-center pt-6 sm:pt-10 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-16 max-w-[1600px] mx-auto">
        <div data-speed="-0.15" className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-primary/5 blur-[180px] rounded-full pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div data-speed="-0.25" className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none -z-10 -translate-x-1/2 translate-y-1/2" />

        <div className="grid grid-cols-1 gap-16 lg:gap-8 w-full items-center">
          <div className="flex flex-col items-start relative z-10 max-w-4xl">
            <div className="hero-badge inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/20 bg-primary/[0.03] text-primary text-xs font-bold tracking-widest uppercase mb-10 shadow-[0_0_20px_rgba(63,229,108,0.1)]">
              <ShieldCheck className="w-4 h-4" />
              Hardware Identity Verification
            </div>

            <h1 className="hero-title text-fluid-hero font-black tracking-tighter text-white mb-6 sm:mb-10 leading-[0.85] uppercase">
              <div className="line block" style={{ perspective: 1000 }}>Absolute</div>
              <div className="line block text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-emerald-900 drop-shadow-[0_0_30px_rgba(63,229,108,0.2)]" style={{ perspective: 1000 }}>
                Trust Protocol
              </div>
            </h1>

            <p className="hero-desc text-lg md:text-xl text-[#8892b0] max-w-xl mb-12 leading-relaxed font-medium">
              Eliminate digital asset fraud permanently. Midly leverages strict hardware-enforced KYC and algorithmic vault locking to secure peer-to-peer exchanges.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full sm:w-auto border-l-4 border-primary/50 pl-4 sm:pl-6">
              <Link href="/register" className="hero-btn w-full sm:w-auto">
                <NeonButton className="w-full sm:w-auto gap-3 text-sm !py-6 !px-12 tracking-widest uppercase shadow-[0_0_40px_-5px_rgba(63,229,108,0.3)]">
                  Create Account <ArrowRight className="w-5 h-5" />
                </NeonButton>
              </Link>
              <Link href="/login" className="hero-btn w-full sm:w-auto">
                <NeonButton variant="secondary" className="w-full sm:w-auto text-sm !py-6 !px-12 tracking-widest uppercase">
                  Sign In
                </NeonButton>
              </Link>
            </div>

            <div className="hero-footer mt-10 sm:mt-16 text-xs font-black tracking-widest uppercase text-[#8892b0] flex flex-wrap items-center gap-4 sm:gap-8 pl-4 sm:pl-6">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Supported Networks:</span>
              <span className="text-white">Dota 2</span>
              <span className="text-white">Valorant</span>
              <span className="text-white">CS2</span>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Image Slider Section */}
      <FeatureSlider />

      {/* Structured Grid Section */}
      <section className="w-full px-4 sm:px-6 lg:px-16 py-16 sm:py-24 lg:py-32 max-w-[1600px] mx-auto border-t border-white/[0.02] relative">
        <div className="section-header flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 lg:mb-24 gap-6 sm:gap-8">
          <div>
            <h2 className="text-sm font-black text-primary tracking-widest uppercase mb-4">Architecture</h2>
            <h3 className="text-fluid-section font-black text-white tracking-tighter uppercase leading-[0.9]">
              Zero-Trust <span className="block sm:inline">Guarantee.</span>
            </h3>
          </div>
          <p className="text-lg text-[#8892b0] max-w-md font-medium leading-relaxed border-l-2 border-white/10 pl-6">
            Our automated Escrow State Engine guarantees that neither party can manipulate the transaction flow. Funds are algorithmically verified before assets move.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <DynamicCard hoverEffect={true} delay={0.1} className="flex flex-col justify-between min-h-[280px] sm:min-h-[350px] lg:h-[400px]">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Phase 1: Secure</h4>
              <p className="text-[#8892b0] font-medium leading-relaxed">Buyer deposits funds directly into the Midly Smart Vault. Funds are verified and instantly frozen in the global ledger.</p>
            </div>
            <div className="text-8xl font-black text-white/5 absolute bottom-4 right-8 tracking-tighter">01</div>
          </DynamicCard>

          <DynamicCard hoverEffect={true} delay={0.3} className="flex flex-col justify-between min-h-[280px] sm:min-h-[350px] lg:h-[400px] lg:translate-y-12">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
                <PackageSearch className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Phase 2: Handover</h4>
              <p className="text-[#8892b0] font-medium leading-relaxed">The Seller safely transfers the digital asset, knowing the exact funds are currently secured by our algorithm.</p>
            </div>
            <div className="text-8xl font-black text-white/5 absolute bottom-4 right-8 tracking-tighter">02</div>
          </DynamicCard>

          <DynamicCard hoverEffect={true} delay={0.5} className="flex flex-col justify-between min-h-[280px] sm:min-h-[350px] lg:h-[400px] lg:translate-y-24">
            <div>
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
                <MessageSquareWarning className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-3xl font-black text-white tracking-tight uppercase mb-4">Phase 3: Release</h4>
              <p className="text-[#8892b0] font-medium leading-relaxed">If satisfied, funds release instantly. If a scam is detected, instant dispute freezing protocols are initiated.</p>
            </div>
            <div className="text-8xl font-black text-white/5 absolute bottom-4 right-8 tracking-tighter">03</div>
          </DynamicCard>
        </div>
      </section>
    </div>
  );
}
