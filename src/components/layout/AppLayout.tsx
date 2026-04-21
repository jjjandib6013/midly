"use client";

import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
   const { status } = useSession();
   const isAuthenticated = status === "authenticated";

   return (
      <div className="flex flex-col min-h-screen">
         <Navbar />
         <Sidebar />
         
         {/* Main Content Area */}
         <main className={`flex-1 flex flex-col pt-16 sm:pt-20 lg:pt-24 pb-16 md:pb-0 transition-all duration-300 ${isAuthenticated ? 'md:pl-64' : ''}`}>
            {children}
         </main>
      </div>
   );
}
