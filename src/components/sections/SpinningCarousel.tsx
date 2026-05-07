"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { ShieldCheck, Lock, Zap, Eye, Scale, Fingerprint, Cpu, Globe } from "lucide-react";

const CARDS = [
  { icon: ShieldCheck, title: "Hardware KYC", description: "Biometric identity enforcement", accent: "#3FE56C" },
  { icon: Lock, title: "Escrow Vault", description: "Funds frozen until confirmed", accent: "#A855F7" },
  { icon: Zap, title: "Instant Release", description: "Verified trades in 3 seconds", accent: "#3B82F6" },
  { icon: Eye, title: "Dispute Engine", description: "AI-powered resolution", accent: "#F59E0B" },
  { icon: Scale, title: "Fair Pricing", description: "Transparent fees always", accent: "#EC4899" },
  { icon: Fingerprint, title: "Trust Score", description: "Verified reputation", accent: "#06B6D4" },
  { icon: Cpu, title: "AI Moderation", description: "Real-time risk flagging", accent: "#8B5CF6" },
  { icon: Globe, title: "Multi-Game", description: "Dota 2, Valorant, CS2+", accent: "#10B981" },
];

export default function SpinningCarousel() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const angleRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const dragStartAngle = useRef(0);
  const velocityRef = useRef(50.0); // Start with a fast spin on load
  const lastX = useRef(0);
  const lastTime = useRef(0);
  const [mounted, setMounted] = useState(false);

  const cardCount = CARDS.length;
  const angleStep = 360 / cardCount;

  useEffect(() => { setMounted(true); }, []);

  const entranceYRef = useRef(150);
  const entranceOpacityRef = useRef(0);

  const renderCards = useCallback(() => {
    cardsRef.current.forEach((card, idx) => {
      if (!card) return;

      const cardAngle = angleRef.current + idx * angleStep;
      const rad = (cardAngle * Math.PI) / 180;

      const radius = 315;
      const x = Math.sin(rad) * radius;
      const z = Math.cos(rad) * radius;

      // 0 = back, 1 = front
      const depthNorm = (z + radius) / (2 * radius);
      const scale = 0.6 + depthNorm * 0.4;
      const baseOpacity = 0.08 + depthNorm * 0.92;
      const blur = depthNorm < 0.25 ? 4 : depthNorm < 0.45 ? 1.5 : 0;

      card.style.transform = `translateX(${x}px) translateZ(${z}px) translateY(${entranceYRef.current}px) rotateY(${-cardAngle}deg) scale(${scale})`;
      card.style.opacity = `${baseOpacity * entranceOpacityRef.current}`;
      card.style.zIndex = `${Math.round(depthNorm * 100)}`;
      card.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
    });
  }, [angleStep]);


  const startSpin = useCallback(() => {
    const animate = () => {
      if (!isDragging.current) {
        if (Math.abs(velocityRef.current) > 0.01) {
          angleRef.current += velocityRef.current;
          velocityRef.current *= 0.97;
        } else {
          angleRef.current += 0.1;
          velocityRef.current = 0;
        }
      }
      renderCards();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [renderCards]);

  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Seamless entrance animation
  useEffect(() => {
    if (!mounted) return;

    // Start spinning immediately so the 3D engine is running
    startSpin();

    // Tween the shared entrance refs so the rAF loop smoothly brings them into position
    gsap.to(entranceYRef, { current: 0, duration: 2, ease: "power3.out", delay: 0.2 });
    gsap.to(entranceOpacityRef, { current: 1, duration: 1.5, ease: "power2.inOut", delay: 0.2 });

  }, [mounted, startSpin]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    dragStartAngle.current = angleRef.current;
    lastX.current = e.clientX;
    lastTime.current = Date.now();
    velocityRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - startX.current;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) velocityRef.current = ((e.clientX - lastX.current) / dt) * 1.5;
    lastX.current = e.clientX;
    lastTime.current = now;
    angleRef.current = dragStartAngle.current + dx * 0.2;
  };

  const handlePointerUp = () => { isDragging.current = false; };

  if (!mounted) return <div style={{ height: "32vh" }} />;

  return (
    <div
      className="relative w-screen left-1/2 -translate-x-1/2 select-none cursor-grab active:cursor-grabbing"
      style={{ height: "32vh", perspective: "1200px" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Particles */}
      <div className="absolute top-[8%] left-[22%] w-1 h-1 bg-white/20 rounded-full" />
      <div className="absolute top-[4%] left-[68%] w-1.5 h-1.5 bg-white/15 rounded-full" />
      <div className="absolute top-[12%] left-[82%] w-1 h-1 bg-white/10 rounded-full" />
      <div className="absolute top-[6%] left-[42%] w-0.5 h-0.5 bg-white/25 rounded-full" />

      {/* 3D Scene — centered anchor point, cards transform from here */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: "50%",
          transformStyle: "preserve-3d",
          transform: "translateX(-50%) rotateX(-8deg)",
          width: 0,
          height: 0,
        }}
      >
        {CARDS.map((card, idx) => {
          const Icon = card.icon;
          const cardW = "clamp(165px, 13.5vw, 255px)";
          const cardH = "clamp(225px, 19vw, 330px)";

          return (
            <div
              key={idx}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="absolute rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center"
              style={{
                width: cardW,
                height: cardH,
                marginLeft: `calc(-1 * ${cardW} / 2)`,
                marginTop: `calc(-1 * ${cardH} / 2)`,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                willChange: "transform, opacity",
                background: "linear-gradient(165deg, rgba(16,16,16,0.95) 0%, rgba(6,6,6,0.98) 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {/* Top accent glow */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent 15%, ${card.accent}50 50%, transparent 85%)` }}
              />

              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border"
                style={{
                  backgroundColor: `${card.accent}10`,
                  borderColor: `${card.accent}18`,
                  boxShadow: `0 0 50px ${card.accent}10, 0 8px 32px rgba(0,0,0,0.4)`,
                }}
              >
                <Icon className="w-10 h-10" style={{ color: card.accent }} />
              </div>

              <h4 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight px-6">{card.title}</h4>
              <p className="text-xs sm:text-sm text-[#8892b0] font-medium max-w-[220px] px-4">{card.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
