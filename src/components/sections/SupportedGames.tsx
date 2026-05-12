"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import FloatingGameGrid from "./supported-games/FloatingGameGrid";

export default function SupportedGames() {
  return (
    <section className="relative w-full py-24 sm:py-32 overflow-hidden z-20">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-16">
        <div className="flex flex-col-reverse md:flex-row items-center gap-12 lg:gap-20">

          {/* Left Side: Floating Cards (no scaffold) */}
          <div className="w-full md:w-[55%] relative">
            <FloatingGameGrid />
          </div>

          {/* Right Side: Text Content */}
          <div className="w-full md:w-[45%] flex flex-col items-start text-left z-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tighter mb-6 max-w-2xl">
              Supported Games &amp; Products
            </h2>

            <p className="text-sm md:text-base text-[#8892b0] font-medium leading-relaxed mb-10 max-w-lg">
              We only middleman games our AI has mastered. By focusing on specific
              titles, our automation ensures every trade follows the rules — keeping
              your assets 100% secure.
            </p>

            <Link href="/register">
              <NeonButton className="gap-2 !py-3.5 !px-8 text-xs tracking-widest uppercase shadow-[0_0_30px_-5px_rgba(63,229,108,0.3)]">
                Get Started on Android <Download className="w-4 h-4" />
              </NeonButton>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
