"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, ArrowRight, Lock, CheckCircle2, PackageSearch, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import FeatureSlider from "@/components/sections/FeatureSlider";
import SpinningCarousel from "@/components/sections/SpinningCarousel";

gsap.registerPlugin(ScrollTrigger);

/* ─── Starfield Component ─── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate stars with natural variance
    const stars: {
      x: number;
      y: number;
      size: number;
      baseOpacity: number;
      twinkleSpeed: number;
      twinklePhase: number;
    }[] = [];

    const starCount = Math.floor((canvas.width * canvas.height) / 3500); // Responsive count

    for (let i = 0; i < starCount; i++) {
      // Random distribution — cluster some stars, leave gaps
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;

      // Natural size distribution: mostly tiny pin-pricks, very few noticeable
      const sizeRandom = Math.random();
      let size: number;
      if (sizeRandom < 0.65) {
        size = 0.2 + Math.random() * 0.5; // 65% tiny specks
      } else if (sizeRandom < 0.85) {
        size = 0.5 + Math.random() * 0.8; // 20% small dots
      } else if (sizeRandom < 0.96) {
        size = 1 + Math.random() * 0.8; // 11% medium
      } else {
        size = 1.8 + Math.random() * 1.2; // 4% bright stars
      }

      // Brightness variation — most faint, a few bright
      const baseOpacity = sizeRandom < 0.6
        ? 0.1 + Math.random() * 0.25  // Faint
        : 0.3 + Math.random() * 0.5;  // Brighter

      stars.push({
        x,
        y,
        size,
        baseOpacity,
        twinkleSpeed: 0.3 + Math.random() * 2.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    let animId: number;
    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase);
        const opacity = star.baseOpacity + twinkle * 0.2;
        const clampedOpacity = Math.max(0.05, Math.min(1, opacity));

        ctx.beginPath();

        // Large stars get a subtle glow
        if (star.size > 2) {
          const gradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 3
          );
          gradient.addColorStop(0, `rgba(200, 220, 255, ${clampedOpacity})`);
          gradient.addColorStop(0.4, `rgba(180, 200, 240, ${clampedOpacity * 0.4})`);
          gradient.addColorStop(1, `rgba(150, 180, 220, 0)`);
          ctx.fillStyle = gradient;
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        } else {
          // Small stars — simple dots with slight color variation
          const warmth = Math.random() > 0.7 ? '255, 240, 220' : '200, 215, 255';
          ctx.fillStyle = `rgba(${warmth}, ${clampedOpacity})`;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        }

        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.9 }}
    />
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const tl = gsap.timeline();

    // Pill tags fade in
    tl.fromTo(".hero-tags span",
      { opacity: 0, y: -15, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.5)", delay: 0.1 }
    )
      // Headline lines
      .fromTo(".hero-title .line",
        { opacity: 0, y: 60, rotateX: -40 },
        { opacity: 1, y: 0, rotateX: 0, duration: 1, stagger: 0.12, ease: "power3.out" },
        "-=0.3"
      )
      // Subheadline
      .fromTo(".hero-desc",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      )
      // CTA buttons
      .fromTo(".hero-btn",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" },
        "-=0.3"
      );

    gsap.fromTo(".section-header",
      { opacity: 0, y: 50 },
      { scrollTrigger: { trigger: ".section-header", start: "top 80%" }, opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
    );

    // Parallax depth
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

      {/* ===== HERO SECTION — VAULT STYLE ===== */}
      <section className="relative w-full min-h-screen overflow-hidden">

        {/* Background ambient glows */}
        <div data-speed="-0.15" className="absolute top-0 right-0 w-[50vw] h-[80vh] bg-primary/5 blur-[180px] rounded-full pointer-events-none -z-10 translate-x-1/3 -translate-y-1/4" />
        <div data-speed="-0.25" className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none -z-10 -translate-x-1/2 translate-y-1/2" />

        {/* Text content wrapper — constrained width, above carousel */}
        <div className="relative z-20 flex flex-col items-center pt-8 sm:pt-12 px-4 sm:px-6 lg:px-16 max-w-[1600px] mx-auto pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center">
            {/* 1. Pill Tags */}
            <div className="hero-tags flex flex-wrap items-center justify-center gap-3 mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/20 bg-primary/[0.04] text-primary text-[13px] font-bold tracking-widest uppercase">
                <ShieldCheck className="w-4 h-4" /> Escrow Platform
              </span>
              <span className="inline-flex items-center px-5 py-2 rounded-full border border-white/10 bg-white/[0.02] text-[#8892b0] text-[13px] font-bold tracking-widest uppercase">
                KYC Verified
              </span>
              <span className="inline-flex items-center px-5 py-2 rounded-full border border-white/10 bg-white/[0.02] text-[#8892b0] text-[13px] font-bold tracking-widest uppercase">
                Dispute Engine
              </span>
              <span className="inline-flex items-center px-5 py-2 rounded-full border border-white/10 bg-white/[0.02] text-[#8892b0] text-[13px] font-bold tracking-widest uppercase">
                10+ Games
              </span>
            </div>

            {/* 2. Headline */}
            <h1 className="hero-title text-center text-fluid-hero font-black tracking-tighter text-white mb-6 leading-[0.85] uppercase max-w-4xl">
              <div className="line block" style={{ perspective: 1000 }}>Your Trusted</div>
              <div className="line block text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-emerald-900 drop-shadow-[0_0_30px_rgba(63,229,108,0.2)]" style={{ perspective: 1000 }}>
                Gaming Asset
              </div>
              <div className="line block" style={{ perspective: 1000 }}>Escrow</div>
            </h1>

            {/* 3. Subheadline */}
            <p className="hero-desc text-center text-xl md:text-2xl text-[#8892b0] max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              An innovative platform that eliminates digital asset fraud with hardware-enforced identity verification and automated escrow protection.
            </p>

            {/* 4. CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 sm:gap-6 w-full sm:w-auto justify-center">
              <Link href="/register" className="hero-btn w-full sm:w-auto">
                <NeonButton className="w-full sm:w-auto gap-3 text-base !py-6 !px-12 tracking-widest uppercase shadow-[0_0_40px_-5px_rgba(63,229,108,0.3)]">
                  Get Started <ArrowRight className="w-5 h-5" />
                </NeonButton>
              </Link>
              <Link href="/login" className="hero-btn w-full sm:w-auto">
                <NeonButton variant="secondary" className="w-full sm:w-auto text-base !py-6 !px-12 tracking-widest uppercase">
                  Sign In
                </NeonButton>
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Spinning 3D Carousel — FULL WIDTH, spans edge to edge */}
        <SpinningCarousel />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#030407] to-transparent z-30 pointer-events-none" />
      </section>

      {/* ===== FEATURE SLIDER SECTION ===== */}
      <FeatureSlider />

      {/* ===== ARCHITECTURE GRID SECTION ===== */}
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
              <p className="text-[#8892b0] font-medium leading-relaxed">Buyer deposits funds directly into the Midly Escrow. Funds are verified and instantly held securely during the transaction.</p>
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
