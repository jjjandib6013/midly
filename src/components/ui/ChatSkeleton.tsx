import React from 'react';
import { Skeleton } from './Skeleton';

export function ChatSkeleton() {
   return (
      <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300">
         {/* System Message Skeleton (Red Border) */}
         <div className="flex justify-center my-2">
            <div className="w-full max-w-2xl bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
               <Skeleton className="w-4 h-4 rounded-full shrink-0 mt-1" />
               <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[60%]" />
               </div>
            </div>
         </div>

         {/* System Message Skeleton (Red Border) */}
         <div className="flex justify-center my-2">
            <div className="w-full max-w-2xl bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
               <Skeleton className="w-4 h-4 rounded-full shrink-0 mt-1" />
               <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[40%]" />
               </div>
            </div>
         </div>

         {/* Left Bubble Skeleton */}
         <div className="flex justify-start mt-4">
            <div className="bg-dark-panel border border-white/[0.04] p-4 rounded-2xl rounded-tl-sm max-w-[85%] sm:max-w-[75%] space-y-3 w-64">
               <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
               </div>
               <Skeleton className="h-5 w-48" />
            </div>
         </div>

         {/* Right Bubble Skeleton */}
         <div className="flex justify-end mt-2">
            <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] space-y-3 w-64">
               <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
               </div>
               <Skeleton className="h-5 w-48" />
            </div>
         </div>
      </div>
   );
}
