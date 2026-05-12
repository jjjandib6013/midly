"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
 * FEATURE SLIDER
 *
 *  Each slide's card image and section background use the SAME PNG.
 *  Background is rendered very transparent so the starfield behind
 *  the page shows through.
 *
 *  Title animation: fixed clip-mask, text reels vertically (not fade).
 *  Description animation: fade in place.
 *  Button and nav: static, stays in position.
 * ────────────────────────────────────────────────────────────── */

const GREEN = "#3FE56C";
const GREEN_SOFT = "#A7D4B0";
const GREEN_MUTED = "#8ED8A0";

export const defaultSlides = [
  {
    id: 1,
    title: "Identity Verification",
    description:
      "We require strict KYC identity checks before any transaction begins. This ensures you are trading with a real, accountable person—not a disposable burner account.",
    image: "/images/features/Hardware.png",
  },
  {
    id: 2,
    title: "Secure Escrow Wallet",
    description:
      "Buyers deposit funds directly into a secure Midly Escrow Wallet. The money is locked and visible to both parties, guaranteeing the buyer has the funds and the seller gets paid.",
    image: "/images/features/Algo.png",
  },
  {
    id: 3,
    title: "Dedicated Trade Rooms",
    description:
      "Manage the entire transaction in a private, encrypted trade room. Chat securely, upload transfer proof, and release funds only when you are completely satisfied.",
    image: "/images/features/Resolution.png",
  },
  {
    id: 4,
    title: "Dispute Resolution",
    description:
      "If something goes wrong during the handover, our specialized support team steps into the trade room to review evidence and resolve disputes fairly.",
    image: "/images/features/ZeroTrust.png",
  },
];

export default function FeatureSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const slideCount = defaultSlides.length;

  const paginate = useCallback(
    (newDirection: number) => {
      setCurrentIndex((prev) => (prev + newDirection + slideCount) % slideCount);
    },
    [slideCount]
  );

  // Auto-play every 4s
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, paginate]);

  // Pause on interaction for 10s
  const handleInteraction = (dir?: number) => {
    if (dir !== undefined) paginate(dir);
    setIsPaused(true);
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 10000);
  };

  const currentSlide = defaultSlides[currentIndex];

  return (
    <section
      id="features"
      className="relative w-full h-[800px] overflow-hidden bg-transparent py-24"
    >
      {/* ── Background crossfade (same PNG as card, low opacity so starfield shows through) ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute inset-0 z-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentSlide.image}
            alt=""
            aria-hidden
            className="w-full h-full object-cover opacity-[0.08]"
            draggable={false}
          />
          {/* Radial vignette — image visible only in center, corners/edges blend fully into page bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 65% 70% at 50% 50%, rgba(3,4,7,0) 0%, rgba(3,4,7,0.5) 55%, rgba(3,4,7,0.95) 85%, #030407 100%)",
            }}
          />
          {/* Subtle left-side readability dim (no hard edge) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, rgba(3,4,7,0.5) 0%, rgba(3,4,7,0) 50%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 w-full h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center h-full">

          {/* ── LEFT TEXT SIDE ── */}
          <div className="lg:col-span-5 flex flex-col h-full justify-center">

            {/* Title — fixed clip-mask reel (content scrolls inside) */}
            <div className="relative h-[104px] sm:h-[128px] lg:h-[144px] overflow-hidden mb-6">
              <motion.div
                className="flex flex-col"
                animate={{ y: `-${currentIndex * (100 / slideCount)}%` }}
                transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {defaultSlides.map((slide) => (
                  <div
                    key={slide.id}
                    className="h-[104px] sm:h-[128px] lg:h-[144px] shrink-0 flex items-center"
                  >
                    <h3
                      className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-white"
                      style={{
                        textShadow: "0 4px 20px rgba(0,0,0,0.4)",
                      }}
                    >
                      {slide.title}
                    </h3>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Description — fade in place, same position for every slide */}
            <div className="relative h-[180px] lg:h-[200px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0 text-lg lg:text-xl text-white/90 font-normal leading-relaxed max-w-md border-l-4 pl-6"
                  style={{
                    borderColor: GREEN,
                  }}
                >
                  {currentSlide.description}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Navigation dots — original white style */}
            <div className="flex items-center gap-4 mt-2 z-20">
              {defaultSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (idx !== currentIndex) {
                      setCurrentIndex(idx);
                      handleInteraction();
                    }
                  }}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    idx === currentIndex
                      ? "w-12 bg-white"
                      : "w-4 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Nav arrows — original translucent white style */}
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => handleInteraction(-1)}
                className="w-12 h-12 rounded-full border border-white/20 bg-white/[0.02] hover:bg-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleInteraction(1)}
                className="w-12 h-12 rounded-full border border-white/20 bg-white/[0.02] hover:bg-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── RIGHT CAROUSEL SIDE (unchanged horizontal slider) ── */}
          <div className="lg:col-span-7 h-full flex items-center overflow-hidden -mr-[50vw] pl-10 py-10">
            <div
              className="flex items-center gap-6"
              style={{
                transform: `translateX(${-currentIndex * 324}px)`,
                transition: "transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)",
              }}
            >
              {defaultSlides.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <div
                    key={slide.id}
                    className="relative shrink-0 w-[300px] aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer"
                    style={{
                      transform: isActive ? "scale(1)" : "scale(0.9)",
                      opacity: isActive ? 1 : 0.4,
                      transition:
                        "all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)",
                      border: isActive
                        ? `2px solid ${GREEN}`
                        : "1px solid rgba(63,229,108,0.12)",
                      boxShadow: isActive
                        ? `0 0 40px ${GREEN}30`
                        : "none",
                    }}
                    onClick={() => {
                      if (!isActive) {
                        setCurrentIndex(idx);
                        handleInteraction();
                      }
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <span
                        className="text-xs font-black tracking-widest uppercase mb-2 block"
                        style={{ color: GREEN }}
                      >
                        0{idx + 1}
                      </span>
                      <h4 className="text-xl font-bold text-white leading-tight">
                        {slide.title}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
