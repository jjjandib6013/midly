"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-white/[0.04] bg-[#030407] pt-16 pb-10 overflow-hidden z-20">
      {/* Background subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        {/* ── Main row: left = 3-column content block, right = giant sandy wordmark ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-8">

          {/* LEFT — three aligned columns: MIDLY+desc | Platform | Legal */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-8">
              {/* Col 1 — Logo + description */}
              <div className="flex flex-col">
                <Link href="/" className="flex items-center gap-3 mb-5">
                  <Image
                    src="/images/midly-logo-real.png"
                    alt="Midly Logo"
                    width={28}
                    height={28}
                    className="drop-shadow-[0_0_10px_rgba(63,229,108,0.3)]"
                  />
                  <span className="text-xl font-black tracking-tighter text-white uppercase">
                    MIDLY
                  </span>
                </Link>
                <p className="text-sm text-[#8892b0] leading-relaxed font-medium">
                  The world&apos;s first fully-autonomous, zero-trust escrow protocol for
                  gaming assets. Safe trades. Zero scams.
                </p>
              </div>

              {/* Col 2 — Platform */}
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-white mb-5">
                  Platform
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link href="/#about" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      About Midly
                    </Link>
                  </li>
                  <li>
                    <Link href="/#features" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/#how-it-works" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      How it Works
                    </Link>
                  </li>
                  <li>
                    <Link href="/#faq" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      FAQs
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Col 3 — Legal */}
              <div>
                <h4 className="text-xs font-black tracking-widest uppercase text-white mb-5">
                  Legal
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link href="/terms" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/kyc-policy" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      KYC Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="mailto:support@midly.com" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">
                      Contact Support
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT — big sandy MIDLY wordmark, inline with the content columns */}
          <div className="lg:col-span-5 flex items-center justify-center lg:justify-end">
            <GrainyWordmark text="MIDLY" />
          </div>
        </div>

        {/* ── Copyright row — single line, no Systems Operational ── */}
        <div className="pt-6 border-t border-white/[0.04]">
          <p className="text-xs text-[#8892b0] font-medium tracking-wide">
            &copy; {currentYear} Midly Escrow Protocol. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Renders a massive, right-aligned wordmark with a fractal-noise filter
 * overlay to produce the "sandy/grainy" texture seen in Google Play Games.
 *
 * Technique:
 *   • Inline SVG feTurbulence creates the grain.
 *   • feComposite(in="SourceGraphic", operator="in") clips the noise
 *     to only the filled pixels of the text, so only the letters
 *     carry the grain, background stays clean.
 */
function GrainyWordmark({ text }: { text: string }) {
  const filterId = "midly-grain";

  return (
    <div className="relative w-full max-w-[560px] select-none pointer-events-none">
      <svg
        viewBox="0 0 1000 260"
        preserveAspectRatio="xMaxYMid meet"
        className="w-full h-auto block"
        aria-hidden
      >
        <defs>
          <filter id={filterId}>
            {/* Fractal noise map */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              stitchTiles="stitch"
              result="noise"
            />
            {/* Lift mid-tones so the grain reads as sandy dust rather than pure random static */}
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 0 1
                      0 0 0 1 -0.15"
              result="lightNoise"
            />
            {/* Clip noise to the shape of the source graphic (the text fill) */}
            <feComposite in="lightNoise" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* The base filled text — faint grey so the grain rides on top of a visible form */}
        <text
          x="1000"
          y="215"
          textAnchor="end"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontSize="260"
          fontWeight="900"
          letterSpacing="-8"
          fill="#2a2a30"
        >
          {text}
        </text>

        {/* Same text, grained via the filter — overlaid for the sandy texture */}
        <text
          x="1000"
          y="215"
          textAnchor="end"
          fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          fontSize="260"
          fontWeight="900"
          letterSpacing="-8"
          fill="#3a3a42"
          filter={`url(#${filterId})`}
          opacity="0.9"
        >
          {text}
        </text>
      </svg>
    </div>
  );
}
