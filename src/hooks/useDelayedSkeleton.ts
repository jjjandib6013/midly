import { useState, useEffect } from 'react';

/**
 * useDelayedSkeleton ensures skeletons do not flash on screen for fast requests.
 * It waits for a delay (default 200ms) before returning true.
 * If the data loads before the delay, the skeleton is never shown.
 */
export function useDelayedSkeleton(isLoading: boolean, delayMs: number = 200) {
   const [showSkeleton, setShowSkeleton] = useState(false);

   useEffect(() => {
      let timeout: NodeJS.Timeout;
      
      if (isLoading) {
         timeout = setTimeout(() => setShowSkeleton(true), delayMs);
      } else {
         setShowSkeleton(false);
      }

      return () => clearTimeout(timeout);
   }, [isLoading, delayMs]);

   return showSkeleton;
}
