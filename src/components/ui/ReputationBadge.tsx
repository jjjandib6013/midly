import React from 'react';

export default function ReputationBadge({ score, showScore = false, className }: { score: number, showScore?: boolean, className?: string }) {
   if (score === 0) {
      return (
         <div className="flex items-center gap-1.5">
            <span className={`text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-medium tracking-wide uppercase ${className || ''}`}>NEW</span>
            {showScore && <span className="text-xs text-yellow-500 font-bold">★ 0.0</span>}
         </div>
      );
   }

   const getTierInfo = () => {
      if (score >= 90) return { label: 'GOLD', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      if (score >= 50) return { label: 'SILVER', classes: 'bg-zinc-300/10 text-zinc-300 border-zinc-400/20' };
      return { label: 'BRONZE', classes: 'bg-orange-700/10 text-orange-600 border-orange-700/20' };
   };

   const tier = getTierInfo();

   return (
      <div className="flex items-center gap-1.5">
         <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold tracking-wide ${tier.classes} ${className || ''}`}>
            {tier.label}
         </span>
         {showScore && (
            <span className="text-xs text-yellow-500 font-bold">★ {score.toFixed(1)}</span>
         )}
      </div>
   );
}
