"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShieldCheck, LayoutDashboard, Wallet, User, Store } from "lucide-react";
import { useState, useEffect } from "react";

export default function Sidebar() {
   const { data: session, status } = useSession();
   const pathname = usePathname();
   const [isAdmin, setIsAdmin] = useState(false);

   useEffect(() => {
      const token = (session as any)?.accessToken;
      if (token) {
         try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role === 'admin') setIsAdmin(true);
         } catch (e) {}
      }
   }, [session]);

   if (status !== "authenticated" || pathname === "/") return null;

   const navLinks = [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Marketplace", href: "/marketplace", icon: Store },
      { name: "Wallet", href: "/wallet", icon: Wallet },
      { name: "Profile", href: "/profile", icon: User },
      { name: "Verify", href: "/kyc", icon: ShieldCheck },
   ];

   if (isAdmin) {
      navLinks.push({ name: "Admin", href: "/admin", icon: ShieldCheck });
   }

   return (
      <>
         {/* Mobile Bottom Navigation Only */}
         <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#030407]/90 backdrop-blur-xl border-t border-white/[0.04] z-50 flex items-center justify-around px-2 pb-safe">
            {navLinks.slice(0, 5).map((link) => {
               const isActive = pathname.startsWith(link.href);
               return (
                  <Link
                     key={link.name}
                     href={link.href}
                     className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors
                        ${isActive ? "text-primary" : "text-[#8892b0] hover:text-white"}
                     `}
                  >
                     <link.icon className={`w-5 h-5 ${isActive ? "text-primary drop-shadow-[0_0_8px_rgba(63,229,108,0.5)]" : ""}`} />
                     <span className="text-[9px] font-bold uppercase tracking-widest">{link.name}</span>
                  </Link>
               );
            })}
         </nav>
      </>
   );
}
