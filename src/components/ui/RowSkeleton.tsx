import React from 'react';
import { Skeleton } from './Skeleton';

export function RowSkeleton({ className }: { className?: string }) {
   return (
      <div className={`dash-item bg-dark-panel border border-white/[0.04] p-5 sm:p-6 rounded-2xl sm:rounded-3xl hover:bg-white/[0.02] transition-colors relative overflow-hidden group ${className || ''}`}>
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5">
               <Skeleton className="w-12 h-12 rounded-xl sm:rounded-2xl shrink-0" />
               <div className="space-y-2">
                  <Skeleton className="h-5 w-32 sm:w-48" />
                  <div className="flex items-center gap-2 sm:gap-3">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="h-4 w-16" />
                  </div>
               </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/[0.04] sm:border-t-0">
               <Skeleton className="h-6 w-24" />
               <Skeleton className="h-4 w-20" />
            </div>
         </div>
      </div>
   );
}
