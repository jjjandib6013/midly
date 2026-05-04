import React from 'react';

/**
 * Base skeleton primitive using Tailwind's pulse animation.
 * Includes a prefers-reduced-motion fallback for low-end devices.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-dark-border/50 motion-reduce:animate-none motion-reduce:bg-dark-border ${className || ''}`}
      {...props}
    />
  );
}
