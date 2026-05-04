import React from 'react';
import { Skeleton } from './Skeleton';
import DynamicCard from './DynamicCard';

export function CardSkeleton() {
   return (
      <DynamicCard className="border border-dark-border bg-dark-panel p-6 flex flex-col justify-between">
         <div>
            {/* Top Row: Game Type & Price */}
            <div className="flex justify-between items-start mb-4">
               <Skeleton className="h-6 w-24 rounded-full" />
               <Skeleton className="h-8 w-32" />
            </div>
            
            {/* Item Name */}
            <Skeleton className="h-7 w-3/4 mb-4" />
            
            {/* Seller Info */}
            <div className="flex items-center gap-2 mb-6">
               <Skeleton className="w-6 h-6 rounded-full" />
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-5 w-16 ml-auto rounded" />
            </div>
         </div>
         
         {/* Button */}
         <Skeleton className="h-12 w-full rounded-xl" />
      </DynamicCard>
   );
}
