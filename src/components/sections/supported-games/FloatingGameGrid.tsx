"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GameCard from "./GameCard";

gsap.registerPlugin(ScrollTrigger);

/* ──────────────────────────────────────────────────────────────
 * FLOATING GAME CARDS — scaffold + accents + cards
 *
 *  Three layers inside a transparent container:
 *    1. SCAFFOLD — solid 3D grey blocks, packed tightly around the
 *                  card clusters so each card has grey peeking out
 *                  behind/beside it (like the Google Play reference).
 *    2. YELLOW ACCENTS — small 3D yellow squares at scaffold seams.
 *    3. GAME CARDS — the only animated layer, ±floatRange vertical drift.
 *
 *  Starfield behind the section shows through every gap.
 * ────────────────────────────────────────────────────────────── */

// ── SCAFFOLD BLOCKS ───────────────────────────────────────────
// Each block has a top face (visible lighter grey) and carries its
// own left-side + bottom-face via the render code below (consistent
// with GameCard's 3D block treatment).
type ScaffoldBlock = {
  w: number;
  h: number;
  x: string;
  y: string;
  z: number;
};

/*
 * Blocks are positioned to SIT BEHIND AND AROUND the card slots,
 * peeking out on edges. Card slots for reference:
 *
 *   Valorant    x:4%   y:8%   115×160
 *   M. Legends  x:34%  y:3%   115×160
 *   CODM        x:65%  y:10%  115×160
 *   Genshin     x:4%   y:42%  230×135
 *   Crossfire   x:65%  y:40%  115×160
 *   Roblox      x:4%   y:72%  130×130
 *   CoC         x:34%  y:75%  230×135
 */
const SCAFFOLD_BLOCKS: ScaffoldBlock[] = [
  // ── Around Valorant (card at x:4%  y:8%) ──
  { w: 140, h:  90, x:  "0%", y:  "1%", z: 2 },   // peeks above
  { w:  90, h: 150, x: "14%", y: "12%", z: 2 },   // peeks right

  // ── Around Mobile Legends (card at x:34% y:3%) ──
  { w: 130, h: 110, x: "28%", y:  "0%", z: 2 },   // behind
  { w: 110, h: 140, x: "42%", y: "10%", z: 2 },   // peeks right-down

  // ── Around CODM (card at x:65% y:10%) ──
  { w: 100, h: 120, x: "58%", y:  "2%", z: 2 },   // peeks above-left
  { w: 140, h: 150, x: "76%", y: "12%", z: 2 },   // peeks right

  // ── Bridge between top and middle rows (connect the cluster) ──
  { w: 110, h: 100, x: "18%", y: "28%", z: 2 },
  { w: 110, h: 100, x: "50%", y: "28%", z: 2 },

  // ── Around Genshin landscape (card at x:4% y:42%) ──
  { w: 130, h: 110, x:  "0%", y: "36%", z: 2 },   // peeks top-left
  { w: 110, h: 130, x: "24%", y: "46%", z: 2 },   // peeks right-down

  // ── Around Crossfire (card at x:65% y:40%) ──
  { w: 110, h: 110, x: "56%", y: "34%", z: 2 },   // peeks top-left
  { w: 130, h: 150, x: "75%", y: "42%", z: 2 },   // peeks right-down

  // ── Bridge between middle and bottom rows ──
  { w: 120, h:  90, x: "10%", y: "60%", z: 2 },
  { w: 120, h:  90, x: "44%", y: "62%", z: 2 },

  // ── Around Roblox (card at x:4% y:72%) ──
  { w: 140, h: 120, x:  "0%", y: "64%", z: 2 },   // peeks top
  { w: 110, h: 130, x: "16%", y: "76%", z: 2 },   // peeks right-down

  // ── Around Clash of Clans (card at x:34% y:75%) ──
  { w: 130, h: 110, x: "30%", y: "66%", z: 2 },   // peeks top
  { w: 120, h: 130, x: "58%", y: "74%", z: 2 },   // peeks right-down
];

// ── YELLOW ACCENTS ────────────────────────────────────────────
// Small, sharp, opaque squares placed at scaffold seams.
type YellowAccent = {
  w: number;
  h: number;
  x: string;
  y: string;
  z: number;
};

const YELLOW_ACCENTS: YellowAccent[] = [
  { w: 12, h: 12, x: "13%", y: "16%", z: 8 },
  { w: 16, h: 12, x: "42%", y:  "2%", z: 8 },
  { w: 10, h: 18, x: "57%", y: "22%", z: 8 },
  { w: 14, h: 14, x: "22%", y: "52%", z: 8 },
  { w: 18, h: 12, x: "52%", y: "60%", z: 8 },
  { w: 10, h: 16, x: "73%", y: "52%", z: 8 },
  { w: 14, h: 14, x: "15%", y: "84%", z: 8 },
  { w: 12, h: 14, x: "54%", y: "90%", z: 8 },
];

// ── FOREGROUND GAME CARDS ─────────────────────────────────────
type CardDef = {
  game: string;
  image: string;
  w: number;
  h: number;
  x: string;
  y: string;
  z: number;
  rotate: number;
  floatRange: number;
};

const GAME_CARDS: CardDef[] = [
  // Row 1 — staggered Y
  { game: "Valorant",       image: "/images/games/imageValorant.png",      w: 115, h: 160, x: "4%",  y: "8%",  z: 25, rotate: -2,   floatRange: 12 },
  { game: "Mobile Legends", image: "/images/games/imageMobileLegends.png", w: 115, h: 160, x: "34%", y: "3%",  z: 30, rotate:  1.5, floatRange: 14 },
  { game: "CODM",           image: "/images/games/imageCODM.png",          w: 115, h: 160, x: "65%", y: "10%", z: 25, rotate: -1,   floatRange: 12 },

  // Row 2 — Genshin landscape left, Crossfire portrait right
  { game: "Genshin",        image: "/images/games/imageGenshin.png",       w: 230, h: 135, x: "4%",  y: "42%", z: 35, rotate:  1,   floatRange: 13 },
  { game: "Crossfire",      image: "/images/games/imageCrossfire.png",     w: 115, h: 160, x: "65%", y: "40%", z: 30, rotate: -1.5, floatRange: 13 },

  // Row 3 — Roblox square left, Clash of Clans landscape mid
  { game: "Roblox",         image: "/images/games/imageRoblox.png",        w: 130, h: 130, x: "4%",  y: "72%", z: 25, rotate:  1.5, floatRange: 12 },
  { game: "Clash of Clans", image: "/images/games/imageCOC.png",           w: 230, h: 135, x: "34%", y: "75%", z: 30, rotate: -1,   floatRange: 14 },
];

export default function FloatingGameGrid() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;

    GAME_CARDS.forEach((card, i) => {
      const el = containerRef.current!.querySelector<HTMLDivElement>(
        `[data-card-index="${i}"]`
      );
      if (!el) return;

      gsap.set(el, { y: -card.floatRange });

      gsap.to(el, {
        y: `+=${card.floatRange * 2}`,
        yoyo: true,
        repeat: -1,
        duration: gsap.utils.random(4, 7),
        ease: "sine.inOut",
        delay: gsap.utils.random(0, 2),
      });
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] sm:h-[700px] md:h-[760px] select-none overflow-visible perspective-1000"
    >
      {/* ── Layer 1: SCAFFOLD — 3D grey blocks ── */}
      <div className="absolute inset-0 pointer-events-none">
        {SCAFFOLD_BLOCKS.map((block, i) => (
          <div
            key={`scaffold-${i}`}
            className="absolute"
            style={{
              left: block.x,
              top: block.y,
              width: `${block.w}px`,
              height: `${block.h}px`,
              zIndex: block.z,
            }}
          >
            {/* Left side face (lighter plate offset left/down) */}
            <div
              className="absolute inset-0"
              style={{
                transform: "translate(-6px, 3px)",
                background:
                  "linear-gradient(135deg, #46464b 0%, #323236 60%, #1f1f24 100%)",
              }}
            />
            {/* Top face — solid lighter grey, clearly visible on black bg */}
            <div
              className="relative w-full h-full"
              style={{
                background: "#3a3a3e",
                boxShadow: [
                  "0 6px 0 -1px #111114",        // dark bottom face
                  "0 14px 20px -6px rgba(0,0,0,0.8)" // ambient shadow
                ].join(", "),
              }}
            >
              {/* Top-left specular highlight */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Layer 2: YELLOW ACCENTS ── */}
      <div className="absolute inset-0 pointer-events-none">
        {YELLOW_ACCENTS.map((acc, i) => (
          <div
            key={`acc-${i}`}
            className="absolute"
            style={{
              left: acc.x,
              top: acc.y,
              width: `${acc.w}px`,
              height: `${acc.h}px`,
              zIndex: acc.z,
              background: "#eab308",
              boxShadow: "0 3px 0 -1px #713f12",
            }}
          />
        ))}
      </div>

      {/* ── Layer 3: GAME CARDS (only animated layer) ── */}
      <div className="absolute inset-0">
        {GAME_CARDS.map((card, i) => (
          <div
            key={`card-wrap-${i}`}
            data-card-index={i}
            className="game-card-float absolute will-change-transform"
            style={{
              left: card.x,
              top: card.y,
              zIndex: card.z
            }}
          >
            <GameCard
              game={card.game}
              imageUrl={card.image}
              width={card.w}
              height={card.h}
              rotate={card.rotate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
