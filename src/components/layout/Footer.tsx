"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-white/[0.04] bg-[#030407] pt-16 pb-8 overflow-hidden z-20">
      {/* Background Subtle Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image 
                src="/images/midly-logo-real.png" 
                alt="Midly Logo" 
                width={28} 
                height={28} 
                className="drop-shadow-[0_0_10px_rgba(63,229,108,0.3)] grayscale-[20%]"
              />
              <span className="text-xl font-black tracking-tighter text-white uppercase">MIDLY</span>
            </Link>
            <p className="text-sm text-[#8892b0] max-w-sm leading-relaxed font-medium">
              The world's first fully-autonomous, zero-trust escrow protocol for gaming assets. Safe trades. Zero scams.
            </p>
          </div>

          {/* Links Column 1 */}
          <div>
            <h4 className="text-xs font-black tracking-widest uppercase text-white mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/#about" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">About Midly</Link></li>
              <li><Link href="/#features" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">Features</Link></li>
              <li><Link href="/#how-it-works" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">How it Works</Link></li>
              <li><Link href="/#faq" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">FAQs</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div>
            <h4 className="text-xs font-black tracking-widest uppercase text-white mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="/terms" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link href="/kyc-policy" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">KYC Policy</Link></li>
              <li><Link href="mailto:support@midly.com" className="text-sm text-[#8892b0] hover:text-primary transition-colors font-medium">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/[0.04]">
          <p className="text-xs text-[#8892b0] font-medium tracking-wide">
            &copy; {currentYear} Midly Escrow Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <span className="text-xs text-[#8892b0] uppercase tracking-widest font-black flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(63,229,108,0.8)]" />
              Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
