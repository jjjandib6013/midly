"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, User, Menu, Bell, Wallet, Users, LayoutDashboard, Store } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasNewNotifs, setHasNewNotifs] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifs = () => {
    fetch("http://localhost:5000/api/notifications", {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(data => {
       if (data.notifications) {
           setNotifications(data.notifications);
           setHasNewNotifs(data.notifications.some((n: any) => !n.is_read));
       }
    }).catch(console.error);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    if (token) {
        try {
           const payload = JSON.parse(atob(token.split('.')[1]));
           if (payload.role === 'admin') setIsAdmin(true);
        } catch(e) {}
        fetchNotifs(); 
    }
  }, [pathname]);

  const handleAcceptInvite = async (tradeId: number) => {
     try {
        const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/accept-invite`, {
           method: "PUT",
           headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
           window.location.href = `/trade/${tradeId}`;
        }
     } catch(e) {}
  };

  const handleLogout = () => {
     localStorage.removeItem("token");
     document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
     setIsAuthenticated(false);
     router.push("/");
  };

  const navLinks: { name: string, href: string, icon?: any }[] = isAuthenticated ? [
    ...(isAdmin ? [{ name: "Command Center", href: "/admin", icon: ShieldCheck }] : []),
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Identity Verification", href: "/kyc", icon: ShieldCheck }
  ] : [
    { name: "Home", href: "/" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <ShieldCheck className="h-8 w-8 text-primary glow-icon transition-all rounded-full" />
              <span className="text-2xl font-bold tracking-tight text-white uppercase">Midly</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 ${
                    pathname === link.href ? "text-primary" : "text-text-muted"
                  }`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
               <>
                 <Link href="/wallet" className="hidden md:flex items-center gap-2 text-sm font-medium text-text-muted hover:text-white transition-colors border-r border-dark-border pr-4">
                   <Wallet className="w-4 h-4" /> Wallet
                 </Link>
                 
                 <div className="relative">
                    <button 
                       onClick={() => setShowNotifs(!showNotifs)}
                       className="relative p-2 text-text-muted hover:text-primary transition-colors"
                    >
                       <Bell className="w-5 h-5" />
                       {hasNewNotifs && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)]" />}
                    </button>
                    {showNotifs && (
                       <div className="absolute right-0 mt-2 w-80 bg-dark-panel border border-dark-border shadow-2xl rounded-xl overflow-hidden z-50">
                          <div className="p-3 border-b border-dark-border bg-dark-bg flex justify-between items-center">
                             <h4 className="text-sm font-bold text-white">Notifications</h4>
                             <button className="text-xs text-primary hover:underline">Mark read</button>
                          </div>
                          <div className="max-h-80 overflow-y-auto custom-scrollbar">
                             {notifications.length === 0 ? (
                                <p className="p-4 text-sm text-text-muted text-center">No new notifications.</p>
                             ) : (
                                notifications.map(notif => (
                                   <div key={notif.notification_id} className={`p-4 border-b border-dark-border last:border-b-0 ${notif.is_read ? 'bg-dark-panel' : 'bg-dark-bg/50'}`}>
                                      <p className="text-sm text-white">{notif.message}</p>
                                      <p className="text-xs text-text-muted mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                                      {notif.type === 'escrow_invite' && notif.reference_id && (
                                         <NeonButton className="mt-2 text-xs !py-1 !px-3" onClick={() => handleAcceptInvite(notif.reference_id)}>
                                            Accept Escrow
                                         </NeonButton>
                                      )}
                                   </div>
                                ))
                             )}
                          </div>
                       </div>
                    )}
                 </div>

                 <Link
                   href="/profile"
                   className="flex items-center justify-center p-2 rounded-full border border-dark-border hover:border-primary/50 transition-all group bg-dark-panel ml-2"
                 >
                   <User className="h-5 w-5 text-text-main group-hover:text-primary transition-colors" />
                 </Link>
               </>
            ) : (
               <div className="hidden md:flex items-center gap-4">
                  <Link href="/login" className="text-sm font-medium text-text-muted hover:text-white transition-colors">Log In</Link>
                  <Link href="/register"><NeonButton className="!py-2 !px-4 text-sm">Sign Up</NeonButton></Link>
               </div>
            )}
            
            <button className="md:hidden p-2 text-text-main hover:text-primary">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
