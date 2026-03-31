"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Lock, ScanLine, ArrowRight } from "lucide-react";
import Link from "next/link";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const features = [
    {
      icon: <ScanLine className="w-8 h-8 text-primary" />,
      title: "AI-Powered KYC",
      description: "Mandatory identity verification eliminates fake profiles, ghosting, and scam artists instantly.",
    },
    {
      icon: <Lock className="w-8 h-8 text-primary" />,
      title: "Automated Escrow",
      description: "Funds are locked safely in a neutral digital vault until both parties confirm delivery.",
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
      title: "Conflict Resolution",
      description: "Neutral 3rd-party mediation with structured data logging for fail-safe dispute settling.",
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "5% Flat Service Fee",
      description: "A small premium for guaranteed safety vs. the 10-20% charged by traditional escrow platforms.",
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen pb-20">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-primary/10 via-dark-bg to-dark-bg -z-10 pointer-events-none" />

      {/* Hero Section */}
      <motion.section 
        className="w-full max-w-7xl mx-auto px-6 pt-32 pb-20 text-center flex flex-col items-center justify-center relative"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary glow-icon mb-8 font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>The "User-to-User" verified safety pipeline.</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          Where Trading Meets <span className="text-primary glow-icon drop-shadow-[0_0_15px_rgba(63,229,108,0.3)]">Trust.</span>
        </h1>
        
        <p className="text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
          The ultimate verification and automated escrow platform designed for gamers and niche traders. Turn blind trust into strict, risk-free P2P transactions.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/register">
            <NeonButton className="text-lg w-full sm:w-auto glow-icon">
              Start Trading Securely <ArrowRight className="w-5 h-5 ml-2" />
            </NeonButton>
          </Link>
          <Link href="/login">
            <NeonButton variant="ghost" className="text-lg w-full sm:w-auto">
              Login to Vault
            </NeonButton>
          </Link>
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section 
        className="w-full max-w-7xl mx-auto px-6 py-20"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Bulletproof Your Trades</h2>
          <p className="text-text-muted max-w-2xl mx-auto text-lg">
            Say goodbye to fake payment screenshots, "hand-to-hand" cash meeting risks, and high-value gaming asset scams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div key={idx} variants={item}>
              <DynamicCard hoverEffect className="h-full flex flex-col border border-dark-border/50 bg-dark-panel/40">
                <div className="w-16 h-16 rounded-2xl bg-dark-bg border border-dark-border flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(63,229,108,0.1)] glow-icon">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-text-muted leading-relaxed flex-1">
                  {feature.description}
                </p>
              </DynamicCard>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Escrow Process Preview */}
      <motion.section 
        className="w-full max-w-5xl mx-auto px-6 py-20 mt-10 rounded-3xl glass-panel relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {/* Glow behind */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[300px] bg-primary/5 blur-[120px] rounded-full z-0" />

        <div className="relative z-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">The 5-Step Secure Method</h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative text-sm font-medium text-text-muted">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-dark-border bg-dark-bg flex items-center justify-center text-primary glow-icon">1</div>
              Agreement
            </div>
            <div className="hidden md:block flex-1 h-[2px] bg-dark-border"/>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-primary/50 bg-primary/10 flex items-center justify-center text-primary glow-icon drop-shadow-[0_0_8px_rgba(63,229,108,0.5)]">2</div>
              Payment Locked
            </div>
            <div className="hidden md:block flex-1 h-[2px] bg-dark-border"/>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-dark-border bg-dark-bg flex items-center justify-center">3</div>
              Item Handover
            </div>
            <div className="hidden md:block flex-1 h-[2px] bg-dark-border"/>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-dark-border bg-dark-bg flex items-center justify-center">4</div>
              Buyer Approves
            </div>
            <div className="hidden md:block flex-1 h-[2px] bg-dark-border"/>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-dark-border bg-dark-bg flex items-center justify-center">5</div>
              Funds Released
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
