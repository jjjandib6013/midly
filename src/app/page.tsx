"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import NeonButton from "@/components/ui/NeonButton";
import SpinningCarousel from "@/components/sections/SpinningCarousel";
import InfiniteLogoMarquee from "@/components/sections/InfiniteLogoMarquee";
import ScrollStorySection from "@/components/sections/ScrollStorySection";
import FeatureSlider from "@/components/sections/FeatureSlider";
import HowItWorks from "@/components/sections/HowItWorks";
import SupportedGames from "@/components/sections/SupportedGames";
import ReadyToTrade from "@/components/sections/ReadyToTrade";
import Footer from "@/components/layout/Footer";
import type { SpinningCarouselHandle } from "@/components/sections/SpinningCarousel";

gsap.registerPlugin(ScrollTrigger);

/* ─── Interactive Starfield Component ─── */
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const driftRef = useRef(0);
  const driftTargetRef = useRef(0);

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

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Generate stars
    const stars: {
      x: number;
      y: number;
      size: number;
      baseOpacity: number;
      twinkleSpeed: number;
      twinklePhase: number;
    }[] = [];

    const constellations: number[][] = [];

    const starCount = Math.floor((canvas.width * canvas.height) / 4000);

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;

      const sizeRandom = Math.random();
      let size: number;
      if (sizeRandom < 0.65) {
        size = 0.3 + Math.random() * 0.5;
      } else if (sizeRandom < 0.85) {
        size = 0.6 + Math.random() * 0.6;
      } else if (sizeRandom < 0.96) {
        size = 1 + Math.random() * 0.6;
      } else {
        size = 1.4 + Math.random() * 0.8;
      }

      const baseOpacity = sizeRandom < 0.6
        ? 0.12 + Math.random() * 0.25
        : 0.35 + Math.random() * 0.45;

      stars.push({
        x, y, size, baseOpacity,
        twinkleSpeed: 0.3 + Math.random() * 2.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    const pickConstellation = () => {
      const points: number[] = [];
      const count = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        points.push(Math.floor(Math.random() * stars.length));
      }
      return points;
    };

    for (let i = 0; i < 12; i++) {
      constellations.push(pickConstellation());
    }

    const handleDrift = (e: Event) => {
      const detail = (e as CustomEvent).detail as { delta?: number };
      driftTargetRef.current += detail?.delta || 0;
    };
    window.addEventListener("starfield-drift", handleDrift as EventListener);

    let animId: number;
    const HOVER_RADIUS = 150; // Mouse influence radius

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      driftRef.current += (driftTargetRef.current - driftRef.current) * 0.08;

      for (const star of stars) {
        const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase);
        let opacity = star.baseOpacity + twinkle * 0.15;
        let currentSize = star.size;

        const driftY = driftRef.current;
        const sx = star.x;
        let sy = star.y + driftY;
        if (sy > canvas.height) sy -= canvas.height;
        if (sy < 0) sy += canvas.height;

        // Interactive hover — stars near cursor glow brighter and bigger
        const dx = sx - mx;
        const dy = sy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < HOVER_RADIUS) {
          const proximity = 1 - dist / HOVER_RADIUS; // 1 = on top, 0 = edge
          opacity = Math.min(1, opacity + proximity * 0.7);
          currentSize = star.size + proximity * 1.5;
        }

        const clampedOpacity = Math.max(0.05, Math.min(1, opacity));

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${clampedOpacity})`;
        ctx.arc(sx, sy, currentSize, 0, Math.PI * 2);
        ctx.fill();
      }

      const CONSTELLATION_RADIUS = 75;
      for (const group of constellations) {
        const visible: { x: number; y: number; size: number }[] = [];
        for (const idx of group) {
          const s = stars[idx];
          let sy = s.y + driftRef.current;
          if (sy > canvas.height) sy -= canvas.height;
          if (sy < 0) sy += canvas.height;
          const dx = s.x - mx;
          const dy = sy - my;
          if (Math.sqrt(dx * dx + dy * dy) < CONSTELLATION_RADIUS) {
            visible.push({ x: s.x, y: sy, size: s.size });
          }
        }

        if (visible.length < 2) continue;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        visible.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        for (const p of visible) {
          ctx.beginPath();
          ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
          ctx.arc(p.x, p.y, p.size + 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("starfield-drift", handleDrift as EventListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<SpinningCarouselHandle>(null);
  const heroLogoRef = useRef<HTMLDivElement>(null);
  const introLogoRef = useRef<HTMLDivElement>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const [hideHero, setHideHero] = useState(false);

  useGSAP(() => {
    const tl = gsap.timeline();
    const introLogo = introLogoRef.current;
    const heroLogo = heroLogoRef.current;

    // Calculate where the hero logo sits on screen
    const heroRect = heroLogo?.getBoundingClientRect();
    const introRect = introLogo?.getBoundingClientRect();

    // Offset from center to hero-logo position
    const dx = heroRect && introRect ? heroRect.left + heroRect.width / 2 - (introRect.left + introRect.width / 2) : 0;
    const dy = heroRect && introRect ? heroRect.top + heroRect.height / 2 - (introRect.top + introRect.height / 2) : 0;
    // Scale ratio: hero logo is 72px, intro logo is 180px
    const targetScale = 72 / 180;

    /* ── Phase 1: Midly logo + background appear first ── */
    tl.fromTo(".intro-overlay-logo",
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.7)" }
    )
    /* ── Phase 2: Hold for impact ── */
    .to({}, { duration: 0.4 })
    /* ── Phase 3: Overlay background fades to reveal starfield ── */
    .to(".intro-overlay", {
      backgroundColor: "transparent", duration: 0.6, ease: "power2.out"
    })
    /* ── Phase 4: Logo shrinks AND moves to hero-logo position (continuous motion) ── */
    .to(".intro-overlay-logo", {
      x: dx, y: dy, scale: targetScale,
      duration: 1.0, ease: "power3.inOut"
    }, "-=0.3")
    /* ── Phase 5: Hide overlay, show hero logo in its place ── */
    .call(() => {
      setIntroComplete(true);
      carouselRef.current?.triggerSpeedBurst(1500, 50);
    })
    .set(".intro-overlay", { display: "none", pointerEvents: "none" })
    /* ── Phase 6: Navbar slides in from top ── */
    .fromTo(".navbar-entrance",
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: "power4.out" },
      "-=0.1"
    )
    /* ── Phase 7: Headline fades in ── */
    .fromTo(".hero-title .line",
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" },
      "-=0.3"
    )
    /* ── Phase 8: Description fades in ── */
    .fromTo(".hero-desc",
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      "-=0.3"
    )
    /* ── Phase 9: Buttons fade in ── */
    .fromTo(".hero-btn",
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" },
      "-=0.2"
    )
    /* ── Phase 10: Carousel speed burst — moved earlier with logo settle ── */
    .call(() => {});

    /* Parallax layers */
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

      <StarField />

      {/* ===== CINEMATIC INTRO OVERLAY ===== */}
      <div className="intro-overlay fixed inset-0 z-[999] bg-[#030407] flex items-center justify-center">
        <div ref={introLogoRef} className="intro-overlay-logo">
          <Image
            src="/images/midly-logo-real.png"
            alt="Midly"
            width={180}
            height={180}
            priority
            className="drop-shadow-[0_0_40px_rgba(63,229,108,0.25)]"
          />
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <section
        id="hero"
        className={`relative w-full min-h-screen overflow-hidden pt-20 sm:pt-24 transition-opacity duration-500 ${
          hideHero ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >

        {/* Background ambient glows */}
        <div data-speed="-0.15" className="absolute top-0 right-0 w-[50vw] h-[80vh] bg-primary/5 blur-[180px] rounded-full pointer-events-none z-[1] translate-x-1/3 -translate-y-1/4" />
        <div data-speed="-0.25" className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-white/[0.02] blur-[120px] rounded-full pointer-events-none z-[1] -translate-x-1/2 translate-y-1/2" />

        {/* Text content */}
        <div className="relative z-20 flex flex-col items-center px-4 sm:px-6 lg:px-16 max-w-[1600px] mx-auto pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center mt-4 sm:mt-6">

            {/* Logo — hero position (intro logo lands here) */}
            <div ref={heroLogoRef} className="hero-logo mb-3 mt-4" style={{ opacity: introComplete ? 1 : 0 }}>
              <Image
                src="/images/midly-logo-real.png"
                alt="Midly Logo"
                width={72}
                height={72}
                priority
                className="drop-shadow-[0_0_30px_rgba(63,229,108,0.3)]"
              />
            </div>

            {/* Headline — true 2-liner */}
            <h1 className="hero-title text-center text-fluid-hero font-black tracking-tighter text-white mb-2 leading-[0.9] uppercase max-w-4xl">
              <div className="line block" style={{ perspective: 1000 }}>Safe Trades,</div>
              <div className="line block text-transparent bg-clip-text bg-gradient-to-r from-primary via-green-400 to-emerald-900 drop-shadow-[0_0_30px_rgba(63,229,108,0.2)]" style={{ perspective: 1000 }}>
                Zero Scams.
              </div>
            </h1>

            {/* Description — advisor-safe, minimal */}
            <p className="hero-desc text-center text-[11px] md:text-xs text-[#8892b0] max-w-sm mx-auto mb-3 leading-relaxed font-medium">
              Your trusted middleman for safe gaming trades.
            </p>

            {/* CTA Buttons — minimized */}
            <div className="flex flex-row items-center gap-2.5 justify-center mb-4">
              <Link href="/#how-it-works" className="hero-btn">
                <NeonButton variant="secondary" className="text-[10px] !py-2 !px-5 tracking-widest uppercase !min-h-[36px]">
                  How it Works
                </NeonButton>
              </Link>
              <Link href="/register" className="hero-btn">
                <NeonButton className="gap-1.5 text-[10px] !py-2 !px-5 tracking-widest uppercase shadow-[0_0_30px_-5px_rgba(63,229,108,0.3)] !min-h-[36px]">
                  Get Started <ArrowRight className="w-3 h-3" />
                </NeonButton>
              </Link>
            </div>
          </div>
        </div>

        {/* Spinning 3D Carousel — with entrance delay to sync with intro animation */}
        <SpinningCarousel ref={carouselRef} entranceDelay={1.8} />

        {/* Infinite logo marquee */}
        <InfiniteLogoMarquee />

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#030407] to-transparent z-30 pointer-events-none" />
      </section>

      {/* ===== SCROLL STORY SECTION ===== */}
      <ScrollStorySection onEnter={() => setHideHero(true)} onExit={() => setHideHero(false)} />

      {/* ===== FEATURE SLIDER SECTION ===== */}
      <FeatureSlider />

      {/* ===== HOW IT WORKS SECTION ===== */}
      <HowItWorks />

      {/* ===== SUPPORTED GAMES SECTION ===== */}
      <SupportedGames />

      {/* ===== READY TO TRADE BAND ===== */}
      <ReadyToTrade />

      {/* ===== FOOTER ===== */}
      <Footer />

    </div>
  );
}
