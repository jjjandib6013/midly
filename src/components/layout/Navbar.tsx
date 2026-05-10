"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { User, Menu, Bell, Wallet, LayoutDashboard, X, LogOut, ArrowRight, Store, ShieldCheck, CheckCircle2 } from "lucide-react";
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
    }).then(res => res.json()).then(data => {
      if (data.notifications) {
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

    // On homepage, entrance is controlled by the page GSAP timeline via .navbar-entrance class
    // On other pages, run standalone entrance animation
    if (navRef.current && pathname !== '/') {
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

  // Unauthenticated nav links — matches prototype
  const publicNavLinks: any[] = [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "About", href: "/#about" },
    { name: "Contact", href: "/#contact" },
  ];

  // Authenticated nav links (shown inline in navbar on desktop)
  const authNavLinks: { name: string; href: string; icon: any; showBadge?: boolean }[] = [
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallet", href: "/wallet", icon: Wallet },
    ...(!isKycVerified ? [{ name: "Verify", href: "/kyc", icon: ShieldCheck }] : []),
  ];

  if (isAdmin) {
    authNavLinks.push({ name: "Admin", href: "/admin", icon: ShieldCheck });
  }

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
      {/* Glassmorphism Floating Navbar — matching prototype */}
      <div
        ref={navRef}
        className="fixed top-0 left-0 w-full z-50 flex justify-center px-4 sm:px-6 pt-4 navbar-entrance"
      >
        <div
          className="w-full max-w-[1200px] px-5 sm:px-8 h-14 sm:h-16 flex items-center justify-between rounded-2xl"
          style={{
            background: 'rgba(10, 15, 20, 0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Logo — SVG shield icon */}
          <Link href="/#hero" className="flex items-center gap-2.5 group relative">
            <div className="absolute -inset-4 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <Image
              src="/images/midly-logo-real.png"
              alt="Midly Logo"
              width={30}
              height={30}
              className="relative z-10 drop-shadow-[0_0_12px_rgba(63,229,108,0.3)]"
            />
            <span className="relative z-10 text-lg font-black tracking-tight text-white uppercase translate-y-[1px]">MIDLY</span>
          </Link>

          {/* Desktop Nav Links - Authenticated */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {authNavLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-[10px] lg:text-xs font-bold tracking-widest uppercase transition-all duration-300
                      ${isActive
                        ? "text-primary bg-primary/10 border border-primary/20"
                        : "text-[#8892b0] hover:text-white hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    <link.icon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : ""}`} />
                    {link.name}
                    {link.showBadge && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-1" />}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Desktop Nav Links - Unauthenticated (prototype style) */}
          {!isAuthenticated && (
            <div className="hidden md:flex items-center gap-8">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-all duration-300 ${
                    pathname === link.href
                      ? "text-white"
                      : "text-[#8892b0] hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 lg:gap-5">
            {isAuthenticated ? (
              <>
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

                <Link
                  href="/profile"
                  className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8892b0] hover:text-white transition-colors"
                  aria-label="Profile"
                >
                  <User className="w-5 h-5" />
                  {isKycVerified && <CheckCircle2 className="absolute top-1 right-1 w-3 h-3 text-primary bg-[#030407] rounded-full" />}
                </Link>

              </>
            ) : (
              <div className="hidden md:flex items-center">
                <Link href="/register">
                  <button
                    className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-2 cursor-pointer"
                    style={{
                      background: 'rgba(63, 229, 108, 0.15)',
                      color: '#b8f5cb',
                      border: '1px solid rgba(63, 229, 108, 0.25)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(63, 229, 108, 0.25)';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(63, 229, 108, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(63, 229, 108, 0.15)';
                      e.currentTarget.style.color = '#b8f5cb';
                      e.currentTarget.style.borderColor = 'rgba(63, 229, 108, 0.25)';
                    }}
                  >
                    Get started <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
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
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setIsMobileMenuOpen(false)}>
            <Image
              src="/images/midly-logo-real.png"
              alt="Midly Logo"
              width={30}
              height={30}
            />
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
