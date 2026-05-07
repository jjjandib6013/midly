"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export const defaultSlides = [
  {
    id: 1,
    title: "Hardware Enforcement",
    description: "Strict hardware-enforced KYC eliminates fraud before it even touches the ecosystem.",
    backgroundImage: "/images/features/slide1-bg.jpg",
    cardImage: "/images/features/slide1-card.jpg",
    accentColor: "#3FE56C", // Midly Green
  },
  {
    id: 2,
    title: "Algorithmic Vault",
    description: "Funds are verified and instantly frozen in the global ledger using our automated state engine.",
    backgroundImage: "/images/features/slide2-bg.jpg",
    cardImage: "/images/features/slide2-card.jpg",
    accentColor: "#A855F7", // Purple
  },
  {
    id: 3,
    title: "Zero-Trust Guarantee",
    description: "The protocol guarantees neither party can manipulate the transaction flow. Assets only move when verified.",
    backgroundImage: "/images/features/slide3-bg.jpg",
    cardImage: "/images/features/slide3-card.jpg",
    accentColor: "#3B82F6", // Blue
  }
];

const transition: any = { ease: [0.25, 0.1, 0.25, 1], duration: 0.8 };

const textVariants: Variants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition
  },
  exit: (direction: number) => ({
    y: direction > 0 ? -80 : 80,
    opacity: 0,
    transition
  })
};

export default function FeatureSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const slideCount = defaultSlides.length;

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => (prev + newDirection + slideCount) % slideCount);
  }, [slideCount]);

  // Handle auto-play
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 4000); // Auto-play every 4 seconds
    return () => clearInterval(interval);
  }, [isPaused, paginate]);

  // Pause on interaction for 10 seconds
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
    <section id="features" className="relative w-full h-[800px] overflow-hidden bg-transparent py-24">
      {/* Background Crossfade */}
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
            src={currentSlide.backgroundImage}
            alt="Background"
            className="w-full h-full object-cover opacity-40 grayscale-[20%]"
            draggable={false}
          />
          {/* Dark overlay to ensure text legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030407] via-[#030407]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#030407] via-transparent to-[#030407]" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 w-full h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center h-full">
          
          {/* Left Text Side */}
          <div className="lg:col-span-5 flex flex-col h-full justify-center">
             <div className="h-[300px] flex flex-col justify-center relative">
               <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={textVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                     <h3 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05] mb-6" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                        {currentSlide.title}
                     </h3>
                     <p className="text-lg lg:text-xl text-[#a1a1aa] font-normal leading-relaxed max-w-md border-l-4 pl-6" style={{ borderColor: currentSlide.accentColor }}>
                        {currentSlide.description}
                     </p>
                     
                     <div className="mt-10">
                        <motion.button 
                           whileHover={{ scale: 1.02, y: -2 }}
                           whileTap={{ scale: 0.98 }}
                           className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-3.5 font-semibold text-white transition-all shadow-lg"
                           style={{ backgroundColor: currentSlide.accentColor, boxShadow: `0 8px 30px ${currentSlide.accentColor}40` }}
                        >
                           Explore Feature <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </motion.button>
                     </div>
                  </motion.div>
               </AnimatePresence>
             </div>

             {/* Navigation Dots */}
             <div className="flex items-center gap-4 mt-12 z-20">
                {defaultSlides.map((_, idx) => (
                   <button
                     key={idx}
                     onClick={() => {
                        const dir = idx > currentIndex ? 1 : -1;
                        if (idx !== currentIndex) {
                           setDirection(dir);
                           setCurrentIndex(idx);
                           handleInteraction();
                        }
                     }}
                     className={`h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-12 bg-white' : 'w-4 bg-white/20 hover:bg-white/40'}`}
                     aria-label={`Go to slide ${idx + 1}`}
                   />
                ))}
             </div>
             
             {/* Nav Arrows */}
             <div className="flex items-center gap-2 mt-6">
                 <button onClick={() => handleInteraction(-1)} className="w-12 h-12 rounded-full border border-white/20 bg-white/[0.02] hover:bg-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-md">
                    <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button onClick={() => handleInteraction(1)} className="w-12 h-12 rounded-full border border-white/20 bg-white/[0.02] hover:bg-white/10 flex items-center justify-center text-white transition-colors backdrop-blur-md">
                    <ChevronRight className="w-5 h-5" />
                 </button>
             </div>
          </div>

          {/* Right Carousel Side */}
          <div className="lg:col-span-7 h-full flex items-center overflow-hidden -mr-[50vw] pl-10 py-10">
             <div className="flex items-center gap-6" style={{ transform: `translateX(${-currentIndex * 324}px)`, transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
                {defaultSlides.map((slide, idx) => {
                   const isActive = idx === currentIndex;
                   return (
                     <div 
                        key={slide.id} 
                        className="relative shrink-0 w-[300px] aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer"
                        style={{
                           transform: isActive ? 'scale(1)' : 'scale(0.9)',
                           opacity: isActive ? 1 : 0.4,
                           transition: 'all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
                           border: isActive ? `2px solid ${slide.accentColor}` : '1px solid rgba(255,255,255,0.1)',
                           boxShadow: isActive ? `0 0 40px ${slide.accentColor}30` : 'none'
                        }}
                        onClick={() => {
                           if (!isActive) {
                              setDirection(idx > currentIndex ? 1 : -1);
                              setCurrentIndex(idx);
                              handleInteraction();
                           }
                        }}
                     >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                           src={slide.cardImage} 
                           alt={slide.title} 
                           className="w-full h-full object-cover"
                           draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6">
                           <span className="text-xs font-black tracking-widest uppercase mb-2 block" style={{ color: slide.accentColor }}>0{idx + 1}</span>
                           <h4 className="text-xl font-bold text-white leading-tight">{slide.title}</h4>
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
