"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, List, AlertTriangle, ArrowUpRight, Activity, CheckCircle2, RefreshCcw } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Dashboard() {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const notifications = [
    { id: 1, type: "alert", text: "AI detected suspicious log-in attempts blocked.", time: "2h ago" },
    { id: 2, type: "success", text: "Transaction #1094 completed. ₱4,500 released.", time: "1d ago" },
    { id: 3, type: "update", text: "Buyer uploaded payment for MLBB Mythical Glory Acc.", time: "2d ago" },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Welcome back, Trader
            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider glow-icon">
              Verified
            </div>
          </h1>
          <p className="text-text-muted mt-1">Here's your current secure trading overview.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link href="/transactions">
            <NeonButton variant="ghost" className="gap-2">
              <List className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">My Trades</span>
            </NeonButton>
          </Link>
          <Link href="/create-trade">
            <NeonButton className="gap-2 glow-icon shadow-[0_0_15px_rgba(63,229,108,0.2)]">
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              <span>New Escrow</span>
            </NeonButton>
          </Link>
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        {/* Stat Cards */}
        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-primary/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Active Transactions</p>
                <h3 className="text-4xl font-bold text-white">3</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <RefreshCcw className="w-6 h-6 text-primary glow-icon" />
              </div>
            </div>
            <p className="text-sm text-primary mt-4 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-4 h-4" /> 2 pending your action
            </p>
          </DynamicCard>
        </motion.div>

        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-blue-500/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Total Trades</p>
                <h3 className="text-4xl font-bold text-white">42</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-blue-500 glow-icon" />
              </div>
            </div>
            <p className="text-sm text-text-muted mt-4 font-medium">
              Lifetime volume: ₱125,000
            </p>
          </DynamicCard>
        </motion.div>

        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-emerald-500/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Completed (100% Secure)</p>
                <h3 className="text-4xl font-bold text-white">39</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 glow-icon" />
              </div>
            </div>
            <p className="text-sm text-emerald-500 flex items-center gap-1 mt-4 font-medium">
              0 scam attempts lost
            </p>
          </DynamicCard>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-1 lg:col-span-2 space-y-4"
        >
          <h2 className="text-xl font-bold text-white flex items-center justify-between">
            Recent Active Trades
            <Link href="/transactions" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
              View All
            </Link>
          </h2>
          
          <DynamicCard hoverEffect={false} className="p-0 border-dark-border bg-dark-bg/30">
            <div className="divide-y divide-dark-border/50">
              {/* Mock Trade Row */}
              <Link href="/trade/1095" className="px-6 py-4 flex items-center justify-between hover:bg-dark-panel/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50 text-xs font-bold text-primary group-hover:neon-glow transition-all">
                    BUY
                  </div>
                  <div>
                    <h4 className="text-white font-medium group-hover:text-primary transition-colors">Valorant ASIA - Immortal Rank</h4>
                    <p className="text-xs text-text-muted">Escrow Status: <span className="text-primary font-medium">Payment Locked</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">₱12,500</p>
                  <p className="text-xs text-text-muted">ID: #1095</p>
                </div>
              </Link>

              {/* Mock Trade Row */}
              <Link href="/trade/1096" className="px-6 py-4 flex items-center justify-between hover:bg-dark-panel/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/30 text-xs font-bold text-yellow-500">
                    SELL
                  </div>
                  <div>
                    <h4 className="text-white font-medium group-hover:text-yellow-500 transition-colors">CODM Legendary Account</h4>
                    <p className="text-xs text-text-muted">Escrow Status: <span className="text-yellow-500 font-medium">Waiting for Buyer</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">₱4,000</p>
                  <p className="text-xs text-text-muted">ID: #1096</p>
                </div>
              </Link>
            </div>
          </DynamicCard>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Notifications & Alerts</h2>
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg/30">
            <div className="space-y-4">
              {notifications.map((notif) => (
                <div key={notif.id} className="flex gap-3">
                  <div className="mt-0.5">
                    {notif.type === "alert" && <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {notif.type === "success" && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    {notif.type === "update" && <Activity className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-sm text-text-main leading-snug">{notif.text}</p>
                    <p className="text-xs text-text-muted mt-1 font-medium">{notif.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-sm text-text-muted hover:text-white border-t border-dark-border transition-colors">
              Mark all as read
            </button>
          </DynamicCard>
        </motion.div>
      </div>
    </div>
  );
}
