"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
   const { status } = useSession();
   const pathname = usePathname();
   const isAdminRoute = pathname.startsWith('/admin');
   const isApp = status === "authenticated" && pathname !== '/' && !isAdminRoute;

   return (
      <div className="flex flex-col min-h-screen">
         <Navbar />
         <Sidebar />
         
         {/* Main Content Area — no left padding on /admin (admin has its own layout) */}
         <main className={`flex-1 flex flex-col pb-16 md:pb-0 ${pathname === '/' ? '' : 'pt-16 sm:pt-20 lg:pt-24'} ${isApp ? 'md:pl-20' : ''}`}>
            {children}
         </main>
      </div>
   );
}
