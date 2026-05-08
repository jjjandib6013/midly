"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, User, Menu, Bell, Wallet, LayoutDashboard, X, LogOut, ArrowRight, Store, CheckCircle2 } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useSession, signOut } from "next-auth/react";
import { API_URL } from "@/lib/api";
import { io } from "socket.io-client";

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
  const [isKycVerified, setIsKycVerified] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const menuLinksRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: navRef });

  const fetchNotifs = () => {
    if (!token) return;
    fetch(`${API_URL}/api/notifications`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          signOut({ callbackUrl: '/login' });
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.notifications) {
          setNotifications(data.notifications);
          setHasNewNotifs(data.notifications.some((n: any) => !n.is_read));
        }
      }).catch(console.error);
  };

  let globalSocket: any = null;

  useEffect(() => {
    setIsAuthenticated(status === "authenticated");

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') setIsAdmin(true);
        const userId = payload.user_id;

        if (!globalSocket) {
          globalSocket = io(API_URL, { transports: ['websocket', 'polling'], withCredentials: true });
          globalSocket.emit("join_user", userId);
        }

        globalSocket.on("new_notification", () => {
          fetchNotifs();
        });
      } catch (e) { }
      fetchNotifs();
      fetch(`${API_URL}/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { if (data.kyc?.status === 'verified') setIsKycVerified(true); })
        .catch(console.error);
    }

    // Initial entrance animation
    if (navRef.current) {
      gsap.fromTo(navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power4.out", delay: 0.2 }
      );
    }

    return () => {
      if (globalSocket) {
        globalSocket.off("new_notification");
      }
    }
  }, [pathname, status, token]);

  const handleAcceptInvite = async (tradeId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/transactions/${tradeId}/accept-invite`, {
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

  // Unauthenticated nav links (landing page)
  const publicNavLinks: any[] = [
    { name: "Features", href: "/#features" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "FAQs", href: "/#faq" },
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

  // REG-03: Close notification panel on click outside
  useEffect(() => {
    if (!showNotifs) return;

    if (hasNewNotifs) {
      fetch(`${API_URL}/api/notifications/mark-read`, {
        method: 'PUT',
        headers: { "Authorization": `Bearer ${token}` }
      });
      setHasNewNotifs(false);
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

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
        onComplete: () => {
          if (notifMenuRef.current) notifMenuRef.current.style.display = 'none';
          setNotifications([]); // Clear history once closed
        }
      });
    }
  }, [showNotifs]);

  return (
    <>
      {/* High-End Absolute Glass Header */}
      <div
        ref={navRef}
        className={`fixed z-50 transition-all duration-300 ${pathname === '/'
          ? 'top-4 left-4 right-4 mx-auto max-w-[1200px] rounded-full bg-[#030407]/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
          : 'top-0 left-0 w-full bg-[#030407]/80 backdrop-blur-2xl border-b border-white/[0.04]'
          }`}
      >
        <div className={`w-full flex items-center justify-between ${pathname === '/'
          ? 'px-6 sm:px-8 lg:px-10 h-16 sm:h-20'
          : 'px-4 sm:px-6 lg:px-12 h-16 sm:h-20 lg:h-24'
          }`}>
          <div className="flex items-center gap-8 lg:gap-12">
            <Link href="/" className="flex items-center gap-3 group relative">
              <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <ShieldCheck className="relative z-10 h-8 w-8 text-primary drop-shadow-[0_0_15px_rgba(63,229,108,0.3)]" />
              <span className="relative z-10 text-2xl font-black tracking-tighter text-white uppercase translate-y-[1px]">MIDLY</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-6 lg:gap-8 h-8">
              {pathname === '/' && (
                publicNavLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href.replace('/', '')}
                    onClick={(e) => {
                      e.preventDefault();
                      const id = link.href.split('#')[1];
                      const lenis = (window as any).lenis;
                      if (lenis) {
                        lenis.scrollTo(`#${id}`);
                      } else {
                        const el = document.getElementById(id);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="text-xs font-bold tracking-widest uppercase text-[#8892b0] hover:text-white transition-colors"
                  >
                    {link.name}
                  </a>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 lg:gap-6 relative z-10">
            {isAuthenticated ? (
              <>
                {pathname !== '/' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifs(!showNotifs)}
                      className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors"
                      aria-label="Notifications"
                      aria-haspopup="true"
                      aria-expanded={showNotifs}
                    >
                      <Bell className="w-5 h-5" />
                      {hasNewNotifs && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />}
                    </button>

                    <div
                      ref={notifMenuRef}
                      className="hidden absolute right-0 mt-6 w-[calc(100vw-2rem)] sm:w-96 max-w-[400px] bg-[#090b10] border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-2xl sm:rounded-3xl overflow-hidden z-50"
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
                )}

                {pathname !== '/' && (
                  <Link
                    href="/profile"
                    className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8892b0] hover:text-white transition-colors"
                    aria-label="Profile"
                  >
                    <User className="w-5 h-5" />
                    {isKycVerified && <CheckCircle2 className="absolute top-1 right-1 w-3 h-3 text-primary bg-[#030407] rounded-full" />}
                  </Link>
                )}

                {pathname === '/' && (
                  <div className="hidden md:block">
                    <Link href="/dashboard">
                      <NeonButton className="!py-2.5 !px-6 text-xs tracking-widest uppercase gap-2 flex items-center">
                        Dashboard <ArrowRight className="w-3.5 h-3.5" />
                      </NeonButton>
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="hidden md:flex items-center gap-6">
                <Link href="/login" className="text-xs font-bold uppercase tracking-widest text-[#8892b0] hover:text-white transition-colors">Sign Up</Link>
                <Link href="/register"><NeonButton className="!py-2.5 !px-8 text-xs tracking-widest uppercase">Log in</NeonButton></Link>
              </div>
            )}

            {!isAuthenticated && (
              <button
                className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white touch-manipulation"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={isMobileMenuOpen}
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GSAP Full Screen Mobile Menu (unauthenticated only) */}
      <div
        ref={mobileMenuRef}
        className="fixed inset-0 z-[100] bg-[#030407] flex flex-col p-6 sm:p-8 transform -translate-y-full will-change-transform"
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
          {publicNavLinks.map((link) => (
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
        </div>

        <div className="mt-auto flex flex-col gap-4 pb-4">
          <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="text-center py-5 text-sm font-bold tracking-widest uppercase text-white bg-white/5 rounded-full">Log In</Link>
          <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}><NeonButton className="w-full !py-5 text-sm tracking-widest uppercase">Register</NeonButton></Link>
        </div>
      </div>
    </>
  );
}
