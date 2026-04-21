"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
   const { status } = useSession();
   const pathname = usePathname();

   return (
      <div className="flex flex-col min-h-screen">
         <Navbar />
         <Sidebar />
         
         {/* Main Content Area — no sidebar padding needed */}
         <main className="flex-1 flex flex-col pt-16 sm:pt-20 lg:pt-24 pb-16 md:pb-0">
            {children}
         </main>
      </div>
   );
}
