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
         {/* Navbar: user-facing app only. Admin has its own in-sidebar user menu. */}
         {!isAdminRoute && <Navbar />}
         <Sidebar />

         {/* Main Content Area — no Navbar top padding on /admin since Navbar isn't rendered. */}
         <main className={`flex-1 flex flex-col pb-16 md:pb-0 ${pathname === '/' || isAdminRoute ? '' : 'pt-16 sm:pt-20 lg:pt-24'} ${isApp ? 'md:pl-20' : ''}`}>
            {children}
         </main>
      </div>
   );
}
