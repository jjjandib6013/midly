"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { ReactNode, MouseEvent } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DynamicCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  delay?: number;
}

export default function DynamicCard({
  children,
  className,
  hoverEffect = false,
  delay = 0,
}: DynamicCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: MouseEvent) {
    if (!hoverEffect) return;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: delay }}
      whileHover={
        hoverEffect
          ? {
            y: -8,
            transition: { duration: 0.2 },
          }
          : undefined
      }
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative rounded-3xl p-8 overflow-hidden transition-all duration-500",
        "bg-[#090b10] border border-white/5",
        className
      )}
    >
      {/* Background Hover Spotlight */}
      {hoverEffect && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                700px circle at ${mouseX}px ${mouseY}px,
                rgba(63, 229, 108, 0.05),
                transparent 80%
              )
            `,
          }}
        />
      )}
      {/* Border Spotlight */}
      {hoverEffect && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                400px circle at ${mouseX}px ${mouseY}px,
                rgba(63, 229, 108, 0.4),
                transparent 80%
              )
            `,
            maskImage: `linear-gradient(black, black)`,
            maskComposite: "exclude",
            WebkitMaskComposite: "destination-out",
            padding: "1px", // the border width essentially
          }}
        >
          <div className="bg-black w-full h-full rounded-[inherit] absolute inset-0 z-0" />
        </motion.div>
      )}

      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
