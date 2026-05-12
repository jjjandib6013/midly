"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Midly Admin — shared UI primitives
//
// A small, tightly-scoped design system for the admin panel. Goals:
//   • Single source of truth for cards, buttons, badges, inputs, modals,
//     section headers, empty states, and skeletons.
//   • Consistent spacing, radius, and color language across every tab.
//   • No behavior coupling — these are presentational building blocks only.
// ─────────────────────────────────────────────────────────────────────────────

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const toneStyles: Record<Tone, { bg: string; text: string; border: string; dot: string }> = {
   neutral: { bg: "bg-zinc-800/60", text: "text-zinc-300", border: "border-zinc-700/60", dot: "bg-zinc-400" },
   success: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
   warning: { bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-400" },
   danger:  { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
   info:    { bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30", dot: "bg-blue-400" },
   accent:  { bg: "bg-[color:var(--color-primary)]/10", text: "text-[color:var(--color-primary)]", border: "border-[color:var(--color-primary)]/30", dot: "bg-[color:var(--color-primary)]" },
};

// ─── Section header ─────────────────────────────────────────────────────────

export function SectionHeader({
   title,
   description,
   action,
}: {
   title: string;
   description?: string;
   action?: React.ReactNode;
}) {
   return (
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
            <h1 className="text-2xl font-semibold text-zinc-100 mb-1 tracking-tight">{title}</h1>
            {description && <p className="text-sm text-zinc-400">{description}</p>}
         </div>
         {action}
      </header>
   );
}

// ─── Card ───────────────────────────────────────────────────────────────────

export function Card({
   children,
   className = "",
   interactive = false,
   tone,
}: {
   children: React.ReactNode;
   className?: string;
   interactive?: boolean;
   tone?: Tone;
}) {
   const toneBorder = tone ? toneStyles[tone].border : "border-zinc-800";
   const toneBg = tone ? `${toneStyles[tone].bg}` : "bg-zinc-900/50";
   return (
      <div
         className={`rounded-xl border ${toneBorder} ${toneBg} ${
            interactive ? "transition-all hover:border-zinc-700 hover:bg-zinc-900/70" : ""
         } ${className}`}
      >
         {children}
      </div>
   );
}

// ─── Metric card ────────────────────────────────────────────────────────────

export function MetricCard({
   label,
   value,
   sublabel,
   icon,
   tone = "neutral",
}: {
   label: string;
   value: React.ReactNode;
   sublabel?: string;
   icon?: React.ReactNode;
   tone?: Tone;
}) {
   const t = toneStyles[tone];
   const valueColor = tone === "neutral" ? "text-zinc-100" : t.text;
   return (
      <Card className="p-5 flex flex-col">
         <div className="flex justify-between items-start mb-3">
            <h3 className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{label}</h3>
            {icon && <span className={`shrink-0 ${tone === "neutral" ? "text-zinc-500" : t.text}`}>{icon}</span>}
         </div>
         <p className={`text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
         {sublabel && <span className="text-[10px] text-zinc-500 mt-1">{sublabel}</span>}
      </Card>
   );
}

// ─── Status badge (pill) ────────────────────────────────────────────────────

export function StatusBadge({
   label,
   tone = "neutral",
   icon,
   size = "sm",
}: {
   label: string;
   tone?: Tone;
   icon?: React.ReactNode;
   size?: "xs" | "sm";
}) {
   const t = toneStyles[tone];
   const sizeClass = size === "xs" ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1";
   return (
      <span className={`inline-flex items-center gap-1 ${sizeClass} rounded-full border ${t.bg} ${t.text} ${t.border} font-bold uppercase tracking-wider`}>
         {icon}
         {label}
      </span>
   );
}

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md";

export function Button({
   variant = "secondary",
   size = "md",
   loading = false,
   disabled,
   children,
   leftIcon,
   rightIcon,
   className = "",
   ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
   variant?: ButtonVariant;
   size?: ButtonSize;
   loading?: boolean;
   leftIcon?: React.ReactNode;
   rightIcon?: React.ReactNode;
}) {
   const base = "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
   const sizes: Record<ButtonSize, string> = {
      sm: "text-xs px-3 py-1.5",
      md: "text-sm px-4 py-2",
   };
   const variants: Record<ButtonVariant, string> = {
      primary: "bg-zinc-100 text-zinc-900 hover:bg-white",
      secondary: "bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700",
      ghost: "text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100",
      danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20",
      success: "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
   };
   return (
      <button
         {...rest}
         disabled={disabled || loading}
         className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      >
         {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : leftIcon}
         {children}
         {!loading && rightIcon}
      </button>
   );
}

// ─── Input ──────────────────────────────────────────────────────────────────

export function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
   const { icon, className = "", ...rest } = props;
   return (
      <div className={`relative ${icon ? "pl-0" : ""}`}>
         {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">{icon}</span>}
         <input
            {...rest}
            className={`w-full bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors ${icon ? "pl-9 pr-3 py-2" : "px-3 py-2"} ${className}`}
         />
      </div>
   );
}

// ─── Select ─────────────────────────────────────────────────────────────────

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
   const { className = "", ...rest } = props;
   return (
      <select
         {...rest}
         className={`bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors ${className}`}
      />
   );
}

// ─── Modal shell ────────────────────────────────────────────────────────────

export function Modal({
   open,
   onClose,
   title,
   description,
   icon,
   children,
   footer,
   maxWidth = "max-w-md",
}: {
   open: boolean;
   onClose: () => void;
   title: string;
   description?: string;
   icon?: React.ReactNode;
   children?: React.ReactNode;
   footer?: React.ReactNode;
   maxWidth?: string;
}) {
   if (!open) return null;
   return (
      <div
         className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
         onClick={onClose}
         role="dialog"
         aria-modal="true"
         aria-label={title}
      >
         <div
            className={`bg-zinc-900 border border-zinc-800 rounded-2xl w-full ${maxWidth} overflow-hidden shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
         >
            <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
               <h3 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                  {icon}
                  {title}
               </h3>
               {description && <p className="text-zinc-400 text-sm mt-2">{description}</p>}
            </div>
            {children && <div className="p-6">{children}</div>}
            {footer && <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">{footer}</div>}
         </div>
      </div>
   );
}

// ─── Empty state ────────────────────────────────────────────────────────────

export function EmptyState({
   icon,
   title,
   description,
   action,
}: {
   icon?: React.ReactNode;
   title: string;
   description?: string;
   action?: React.ReactNode;
}) {
   return (
      <div className="text-center py-16 border border-zinc-800 rounded-xl flex flex-col items-center bg-zinc-900/10">
         {icon && <div className="mb-3 text-zinc-600">{icon}</div>}
         <h3 className="text-zinc-200 font-medium text-sm">{title}</h3>
         {description && <p className="text-xs text-zinc-500 mt-1 max-w-sm">{description}</p>}
         {action && <div className="mt-4">{action}</div>}
      </div>
   );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
   return <div className={`animate-pulse bg-zinc-800/60 rounded ${className}`} />;
}

// ─── Key / value row (for metadata blocks inside modals) ───────────────────

export function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
   return (
      <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
         <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">{k}</p>
         <div className="text-zinc-100 font-medium">{v}</div>
      </div>
   );
}
