"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Ensure ScrollTrigger is registered
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only enable Lenis smooth-scrolling on the landing page
    // Authenticated app pages use native browser scrolling
    if (pathname !== "/") {
      // Clean up any lingering Lenis instance when navigating away
      if ((window as any).lenis) {
        (window as any).lenis.destroy();
        (window as any).lenis = null;
      }
      lenisRef.current = null;
      return;
    }

    // Initialize Lenis for the landing page
    const lenis = new Lenis({
        duration: 1.2,
        lerp: 0.1,
        smoothWheel: true,
    });

    lenisRef.current = lenis;
    (window as any).lenis = lenis;

    // Sync Lenis scroll with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Sync GSAP's internal ticker with Lenis's requestAnimationFrame
    const rafCallback = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(rafCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(rafCallback);
      (window as any).lenis = null;
      lenisRef.current = null;
    };
  }, [pathname]);

  return <>{children}</>;
}
