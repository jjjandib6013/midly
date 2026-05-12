"use client";

import Link from "next/link";
import { ArrowRight, ArrowUp } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";

/**
 * Ready-to-trade band — sits between FAQ and Footer.
 *
 * Centered layout (matches user prototype):
 *
 *              Ready to trade?           ← "trade?" accented in primary
 *
 *         [ Get Started → ]  [ Back to top ↑ ]
 *
 * Notes:
 *   • No top border / background — the section must blend seamlessly
 *     into the surrounding dark surface so it doesn't read as a divided band.
 *   • Uses the project's existing palette + typography (no new fonts/colors).
 */
export default function ReadyToTrade() {
  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. Tell any section-level scroll-locks (e.g. ScrollStorySection) to
    //    stand down for the duration of this animation. Without this, the
    //    story section's scroll handler re-captures the page as soon as its
    //    top crosses the viewport, trapping the user mid-scroll.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("midly:scroll-bypass", { detail: { ms: 2200 } }));
    }

    // 2. Release any scroll locks that may already be active
    //    (story section sets document.body.style.overflow = 'hidden').
    if (typeof document !== "undefined" && document.body) {
      document.body.style.overflow = "";
    }

    // 3. Prefer Lenis for smooth scroll; fall back to native behavior.
    const lenis = (typeof window !== "undefined" && (window as any).lenis) || null;

    if (lenis && typeof lenis.scrollTo === "function") {
      if (typeof lenis.start === "function") lenis.start();
      lenis.scrollTo(0, {
        duration: 1.6,
        lock: true,
        force: true,
      });
    } else {
      const hero = document.getElementById("hero");
      if (hero) {
        hero.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    // 4. Nudge ScrollTrigger to recalc so pinned sections release cleanly.
    setTimeout(() => {
      try {
        import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
          ScrollTrigger.refresh();
        });
      } catch {}
    }, 50);
  };

  return (
    <section className="relative w-full z-10">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16 py-20 sm:py-28">
        <div className="flex flex-col items-center text-center gap-10">

          {/* Headline — "trade?" accented in primary green */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[1]">
            Ready to <span className="text-primary">trade?</span>
          </h2>

          {/* Action row */}
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <NeonButton className="gap-2 !py-3.5 !px-8 text-xs tracking-widest uppercase shadow-[0_0_40px_-8px_rgba(63,229,108,0.45)]">
                Get Started <ArrowRight className="w-4 h-4" />
              </NeonButton>
            </Link>

            <button
              type="button"
              onClick={handleBackToTop}
              aria-label="Back to top"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] hover:border-primary/40 hover:text-primary hover:bg-primary/[0.06] text-white/80 text-xs tracking-widest uppercase font-semibold py-3.5 px-8 min-h-[44px] backdrop-blur-md transition-colors duration-300"
            >
              Back to top <ArrowUp className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
