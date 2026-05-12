import { ShieldCheck } from "lucide-react";

type TrustBadgeProps = {
  className?: string;
  style?: React.CSSProperties;
};

export default function TrustBadge({ className = '', style }: TrustBadgeProps) {
  return (
    <div 
      className={`absolute flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#3FE56C]/30 px-4 py-2 rounded-full shadow-[0_8px_32px_rgba(63,229,108,0.15)] pointer-events-none select-none ${className}`}
      style={style}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute w-2.5 h-2.5 bg-[#3FE56C] rounded-full animate-ping opacity-75" />
        <div className="relative w-1.5 h-1.5 bg-[#3FE56C] rounded-full" />
      </div>
      <ShieldCheck className="w-4 h-4 text-[#3FE56C]" />
      <span className="text-[11px] font-bold text-white tracking-widest uppercase mt-[1px]">
        $2M+ Secured
      </span>
    </div>
  );
}
