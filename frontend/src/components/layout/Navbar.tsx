"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, User, Menu } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Trade", href: "/create-trade" },
    { name: "Transactions", href: "/transactions" },
    { name: "Wallet", href: "/wallet" },
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
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === link.href ? "text-primary" : "text-text-muted"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="hidden md:flex items-center gap-2 text-sm font-medium text-text-muted hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="flex items-center justify-center p-2 rounded-full border border-dark-border hover:border-primary/50 transition-all group bg-dark-panel"
            >
              <User className="h-5 w-5 text-text-main group-hover:text-primary transition-colors" />
            </Link>
            <button className="md:hidden p-2 text-text-main hover:text-primary">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
