"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      whileHover={
        hoverEffect
          ? {
              y: -5,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={cn(
        "glass-panel rounded-xl p-6 relative overflow-hidden group transition-all duration-300",
        hoverEffect && "hover:border-primary/30",
        className
      )}
    >
      {/* Decorative gradient blob that appears on hover */}
      {hoverEffect && (
        <div className="absolute -top-[100px] -right-[100px] w-[200px] h-[200px] rounded-full bg-primary/5 blur-[80px] group-hover:bg-primary/20 transition-all duration-500 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
