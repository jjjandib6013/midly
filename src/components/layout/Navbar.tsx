"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, User, Menu, Bell, Wallet, LayoutDashboard, X, LogOut, ArrowRight } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const token = (session as any)?.accessToken;

  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasNewNotifs, setHasNewNotifs] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: navRef });

  const fetchNotifs = () => {
    if (!token) return;
    fetch("http://localhost:5000/api/notifications", {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(res => res.json()).then(data => {
      if (data.notifications) {
        setNotifications(data.notifications);
        setHasNewNotifs(data.notifications.some((n: any) => !n.is_read));
      }
    }).catch(console.error);
  };

  useEffect(() => {
    setIsAuthenticated(status === "authenticated");

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') setIsAdmin(true);
      } catch (e) { }
      fetchNotifs();
    }

    // Initial entrance animation
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power4.out", delay: 0.2 }
    );
  }, [pathname, status, token]);

  const handleAcceptInvite = async (tradeId: number) => {
    try {
      const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/accept-invite`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        window.location.href = `/trade/${tradeId}`;
      }
    } catch (e) { }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const navLinks: any[] = isAuthenticated ? [
    ...(isAdmin ? [{ name: "Admin Panel", href: "/admin", icon: ShieldCheck }] : []),
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Identity Verification", href: "/kyc", icon: ShieldCheck }
  ] : [
    { name: "Platform", href: "/" },
  ];

  // GSAP animations for mobile menu
  useEffect(() => {
    if (!mobileMenuRef.current || !menuLinksRef.current) return;

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      gsap.to(mobileMenuRef.current, { y: "0%", duration: 0.6, ease: "power4.inOut" });
      gsap.fromTo(
        menuLinksRef.current.children,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.3, ease: "back.out(1.2)" }
      );
    } else {
      document.body.style.overflow = '';
      gsap.to(mobileMenuRef.current, { y: "-100%", duration: 0.5, ease: "power4.inOut" });
    }
  }, [isMobileMenuOpen]);

  // GSAP for notification menu
  useEffect(() => {
    if (!notifMenuRef.current) return;
    if (showNotifs) {
      notifMenuRef.current.style.display = 'block';
      gsap.fromTo(notifMenuRef.current,
        { opacity: 0, y: 10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out" }
      );
    } else {
      gsap.to(notifMenuRef.current, {
        opacity: 0, y: -10, scale: 0.95, duration: 0.2, ease: "power3.in",
        onComplete: () => { if (notifMenuRef.current) notifMenuRef.current.style.display = 'none'; }
      });
    }
  }, [showNotifs]);

  return (
    <>
      {/* High-End Absolute Glass Header */}
      <div
        ref={navRef}
        className="fixed top-0 left-0 w-full z-50 bg-[#030407]/80 backdrop-blur-2xl border-b border-white/[0.04]"
      >
        <div className="w-full px-6 lg:px-12 h-24 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3 group relative">
              <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <ShieldCheck className="relative z-10 h-8 w-8 text-primary drop-shadow-[0_0_15px_rgba(63,229,108,0.3)]" />
              <span className="relative z-10 text-2xl font-black tracking-tighter text-white uppercase translate-y-[1px]">MIDLY</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 pl-8 border-l border-white/[0.04] h-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${pathname === link.href ? "text-primary" : "text-[#8892b0] hover:text-white"
                    }`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            {isAuthenticated ? (
              <>
                <Link href="/wallet" className="hidden md:flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-[#8892b0] hover:text-primary transition-colors">
                  <Wallet className="w-4 h-4" /> Wallet
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="relative p-2 text-[#8892b0] hover:text-white transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {hasNewNotifs && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />}
                  </button>

                  <div
                    ref={notifMenuRef}
                    className="hidden absolute right-0 mt-6 w-96 bg-[#090b10] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden z-50"
                  >
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#050608]">
                      <h4 className="text-xs font-black text-[#8892b0] tracking-widest uppercase">NOTIFICATIONS</h4>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar bg-[#090b10]">
                      {notifications.length === 0 ? (
                        <p className="p-8 text-sm text-[#8892b0] text-center font-medium">All caught up.</p>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.notification_id} className={`p-5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors ${notif.is_read ? '' : 'bg-primary/[0.02]'}`}>
                            <p className="text-sm text-white font-medium leading-relaxed">{notif.message}</p>
                            <p className="text-xs text-[#8892b0] mt-3 font-semibold uppercase tracking-wider">{new Date(notif.created_at).toLocaleDateString()}</p>
                            {notif.type === 'escrow_invite' && notif.reference_id && (
                              <button className="mt-4 text-xs bg-primary text-dark-bg hover:brightness-110 px-5 py-2.5 rounded-full font-bold transition-all w-full flex items-center justify-center gap-2" onClick={() => handleAcceptInvite(notif.reference_id)}>
                                ACCEPT ESCROW <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  className="hidden md:block"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary hover:text-dark-bg transition-colors duration-300">
                    <User className="h-4 w-4" />
                  </div>
                </Link>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-6">
                <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-[#8892b0] hover:text-white transition-colors">Log In</Link>
                <Link href="/register"><NeonButton className="!py-2.5 !px-8 text-xs tracking-widest uppercase">Launch App</NeonButton></Link>
              </div>
            )}

            <button
              className="md:hidden p-2 text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* GSAP Full Screen Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className="fixed inset-0 z-[100] bg-[#030407] flex flex-col p-8 transform -translate-y-full will-change-transform"
      >
        <div className="flex justify-between items-center mb-16 mt-4">
          <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-black tracking-tighter text-white uppercase pt-1">MIDLY</span>
          </Link>
          <button
            className="p-3 text-[#8892b0] hover:text-white rounded-full bg-white/5 transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div ref={menuLinksRef} className="flex flex-col gap-8 flex-1 justify-center pl-4">
          {navLinks.map((link) => (
            <div key={link.name} className="overflow-hidden">
              <Link
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-5xl font-black tracking-tighter text-white hover:text-primary transition-colors flex items-center gap-4"
              >
                {link.name}
              </Link>
            </div>
          ))}

          {isAuthenticated && (
            <div className="overflow-hidden mt-8">
              <Link
                href="/wallet"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-5xl font-black tracking-tighter text-white hover:text-primary transition-colors flex items-center gap-4"
              >
                Wallet
              </Link>
            </div>
          )}
          {isAuthenticated && (
            <div className="overflow-hidden">
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-5xl font-black tracking-tighter text-white hover:text-primary transition-colors flex items-center gap-4"
              >
                Profile
              </Link>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <div className="mt-auto pt-10 pb-4 flex justify-between items-center border-t border-white/[0.04]">
            <span className="text-sm font-bold text-[#8892b0] uppercase tracking-widest">SECURE SESSION</span>
            <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 text-[#8892b0] hover:text-red-500 font-bold uppercase tracking-widest text-xs transition-colors">
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </div>
        ) : (
          <div className="mt-auto flex flex-col gap-4 pb-4">
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-center py-5 text-sm font-bold tracking-widest uppercase text-white bg-white/5 rounded-full">Log In</Link>
            <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}><NeonButton className="w-full !py-5 text-sm tracking-widest uppercase">Register</NeonButton></Link>
          </div>
        )}
      </div>
    </>
  );
}
