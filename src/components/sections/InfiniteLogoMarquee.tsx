"use client";

import React from "react";

const LOGOS = [
  "/images/games/Crossfire.png",
  "/images/games/Valorant.png",
  "/images/games/Coc.png",
  "/images/games/Roblox.png",
  "/images/games/callOfDuty.png",
  "/images/games/Dota2.png",
  "/images/games/MobileLegends.png",
];

export default function InfiniteLogoMarquee() {
  const items = [...LOGOS, ...LOGOS, ...LOGOS];

  return (
    <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-16 mt-16 sm:mt-20">
      <div className="relative w-full overflow-hidden">
        <div className="relative marquee py-7 sm:py-8">
          <div className="marquee-track gap-8 sm:gap-10">
            {items.map((logo, idx) => (
              <div key={`${logo}-${idx}`} className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo}
                  alt=""
                  className="h-8 sm:h-9 object-contain opacity-100 drop-shadow-[0_0_16px_rgba(63,229,108,0.22)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
