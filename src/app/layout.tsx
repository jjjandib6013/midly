import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import SmoothScroll from "@/components/layout/SmoothScroll";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MIDLY | Secure Gaming Asset Escrow",
  description: "AI-Powered Automated Escrow and P2P Verification Platform for Secure Digital Gaming Asset Transactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen text-text-main bg-dark-bg flex flex-col antialiased">
        <Providers>
          <SmoothScroll>
            <Toaster position="top-right" toastOptions={{ style: { background: '#1c1c1f', color: '#fff', border: '1px solid #333' } }} />
            <Navbar />
            <main className="flex-1 flex flex-col pt-16 sm:pt-20 lg:pt-24">
              {children}
            </main>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
