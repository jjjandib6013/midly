import React from 'react';
import { Skeleton } from './Skeleton';

export function TableSkeleton() {
   return (
      <div className="w-full bg-dark-panel border border-dark-border rounded-xl overflow-hidden shadow-xl animate-in fade-in duration-300">
         {/* Table Header */}
         <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-dark-border bg-dark-bg/50">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24 justify-self-end" />
         </div>

         {/* Table Rows */}
         <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
               <div key={i} className="grid grid-cols-5 gap-4 px-6 py-5 border-b border-dark-border/50 items-center">
                  {/* ID / Date */}
                  <div>
                     <Skeleton className="h-4 w-16 mb-2" />
                     <Skeleton className="h-3 w-24" />
                  </div>
                  
                  {/* Entity / User */}
                  <div className="flex items-center gap-3">
                     <Skeleton className="w-8 h-8 rounded-full" />
                     <div>
                        <Skeleton className="h-4 w-24 mb-1.5" />
                        <Skeleton className="h-3 w-32" />
                     </div>
                  </div>
                  
                  {/* Status / Role */}
                  <div>
                     <Skeleton className="h-6 w-20 rounded-md" />
                  </div>

                  {/* Additional Info */}
                  <div>
                     <Skeleton className="h-4 w-16" />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                     <Skeleton className="h-8 w-8 rounded-lg" />
                     <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}
