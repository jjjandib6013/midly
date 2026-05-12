import React from 'react';
import Image from 'next/image';

type GameCardProps = {
  game: string;
  imageUrl: string;
  width: number;
  height: number;
  /** Optional slight rotation in degrees to create the Google-Play mosaic feel */
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * A chunky 3D "block" card inspired by Google Play Games.
 *
 *  • Left side face  → lighter grey plate, offset left/down (light catches the side)
 *  • Top face        → the cover art; box-shadow carries the dark bottom face
 *  • Non-interactive → no hover, no cursor change. Purely decorative.
 */
export default function GameCard({
  game,
  imageUrl,
  width,
  height,
  rotate = 0,
  className = '',
  style
}: GameCardProps) {
  return (
    <div
      className={`absolute select-none pointer-events-none ${className}`}
      style={{
        ...style,
        width: `${width}px`,
        height: `${height}px`
      }}
      aria-hidden
    >
      <div className="relative w-full h-full">
        <div
          className="relative w-full h-full"
          style={{ transform: `rotate(${rotate}deg)` }}
        >
          {/* ── LEFT SIDE FACE ─────────────────────────────── */}
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              transform: 'translate(-7px, 3px)',
              background:
                'linear-gradient(135deg, #36363b 0%, #26262c 55%, #16161a 100%)'
            }}
          />

          {/* ── TOP FACE (image) + dark bottom face via box-shadow ── */}
          <div
            className="relative w-full h-full rounded-xl overflow-hidden ring-1 ring-white/10"
            style={{
              transform:
                'perspective(1000px) rotateX(2deg) rotateY(-2deg) translateZ(10px)',
              transformStyle: 'preserve-3d',
              boxShadow: [
                '0 9px 0 -1px #0a0a0c',
                '0 14px 20px -4px rgba(0,0,0,0.75)',
                '0 28px 48px -12px rgba(0,0,0,0.65)'
              ].join(', ')
            }}
          >
            <Image
              src={imageUrl}
              alt={game}
              fill
              className="object-cover pointer-events-none select-none"
              sizes={`${width}px`}
            />

            {/* top-left specular highlight */}
            <div
              className="pointer-events-none absolute inset-0 rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 35%)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
