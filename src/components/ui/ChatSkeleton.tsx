import React from 'react';
import { Skeleton } from './Skeleton';

export function ChatSkeleton() {
   return (
      <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
         {/* System Message Skeleton */}
         <div className="flex justify-center my-4">
            <Skeleton className="h-6 w-3/4 max-w-md rounded-lg" />
         </div>

         {/* Left Bubble Skeleton */}
         <div className="flex justify-start">
            <div className="bg-dark-panel border border-white/[0.04] p-4 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] space-y-3">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-5 w-48 sm:w-64" />
               <Skeleton className="h-3 w-16" />
            </div>
         </div>

         {/* Right Bubble Skeleton */}
         <div className="flex justify-end">
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] space-y-3">
               <div className="flex justify-end"><Skeleton className="h-4 w-20" /></div>
               <div className="flex justify-end"><Skeleton className="h-5 w-56 sm:w-72" /></div>
               <div className="flex justify-end"><Skeleton className="h-3 w-16" /></div>
            </div>
         </div>

         {/* Left Bubble Skeleton */}
         <div className="flex justify-start">
            <div className="bg-dark-panel border border-white/[0.04] p-4 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] space-y-3">
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-5 w-32" />
               <Skeleton className="h-3 w-16" />
            </div>
         </div>
      </div>
   );
}
