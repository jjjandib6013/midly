import React from 'react';
import { Skeleton } from './Skeleton';

export function DisputeCardSkeleton() {
   return (
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden mb-6 animate-in fade-in duration-300">
         {/* Header */}
         <div className="p-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
               </div>
               <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <div className="flex flex-col items-end">
               <Skeleton className="h-3 w-20 mb-1" />
               <Skeleton className="h-6 w-24" />
            </div>
         </div>
         
         {/* Body (Split View) */}
         <div className="p-5 flex gap-6 flex-col lg:flex-row">
            {/* Left Column: Activity Logs */}
            <div className="lg:w-2/3 border border-zinc-800 rounded-lg bg-zinc-950 p-4 flex flex-col h-72">
               <Skeleton className="h-4 w-32 mb-4" />
               <div className="space-y-4 flex-1">
                  {/* System Msg */}
                  <Skeleton className="h-12 w-3/4 mx-auto" />
                  {/* Left Msg */}
                  <div className="mr-8">
                     <Skeleton className="h-10 w-1/2" />
                  </div>
                  {/* Right Msg */}
                  <div className="ml-8 flex justify-end">
                     <Skeleton className="h-10 w-2/3" />
                  </div>
               </div>
            </div>
            
            {/* Right Column: Resolution Actions */}
            <div className="lg:w-1/3 flex flex-col justify-center">
               <Skeleton className="h-5 w-32 mb-3" />
               <Skeleton className="h-10 w-full mb-6" />
               
               <Skeleton className="h-12 w-full rounded-md mb-4" />
               <div className="flex justify-center items-center gap-2 mb-4">
                  <Skeleton className="h-[1px] flex-1" />
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-[1px] flex-1" />
               </div>
               <Skeleton className="h-12 w-full rounded-md" />
            </div>
         </div>

         {/* Footer: Submitted Evidence */}
         <div className="p-5 border-t border-zinc-800 bg-zinc-900/30">
            <Skeleton className="h-4 w-40 mb-3" />
            <Skeleton className="h-4 w-48" />
         </div>
      </div>
   );
}
