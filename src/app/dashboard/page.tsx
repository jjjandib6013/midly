"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PlusCircle, List, AlertTriangle, ArrowUpRight, Activity, CheckCircle2, RefreshCcw } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Dashboard() {
  const [stats, setStats] = useState({ active: 0, total: 0, completed: 0 });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/transactions", {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
         if (data.trades) {
            setRecentTrades(data.trades.slice(0, 3));
            setStats({
               active: data.trades.filter((t: any) => t.status === 'active').length,
               completed: data.trades.filter((t: any) => t.status === 'completed').length,
               total: data.trades.length
            });
         }
      })
      .catch(console.error);
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };


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
        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-primary/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Active Transactions</p>
                <h3 className="text-4xl font-bold text-white">{stats.active}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <RefreshCcw className="w-6 h-6 text-primary glow-icon" />
              </div>
            </div>
            <p className="text-sm text-primary mt-4 flex items-center gap-1 font-medium">
              <ArrowUpRight className="w-4 h-4" /> Live now
            </p>
          </DynamicCard>
        </motion.div>

        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-blue-500/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Total Trades</p>
                <h3 className="text-4xl font-bold text-white">{stats.total}</h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-blue-500 glow-icon" />
              </div>
            </div>
            <p className="text-sm text-text-muted mt-4 font-medium">
              Across all items
            </p>
          </DynamicCard>
        </motion.div>

        <motion.div variants={item}>
          <DynamicCard hoverEffect className="border-t-2 border-t-emerald-500/50 bg-dark-bg/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted mb-1">Completed (100% Secure)</p>
                <h3 className="text-4xl font-bold text-white">{stats.completed}</h3>
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
              {recentTrades.map((t) => (
                <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="px-6 py-4 flex items-center justify-between hover:bg-dark-panel/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border text-xs font-bold transition-all ${t.status === 'active' ? 'bg-primary/20 border-primary/50 text-primary group-hover:neon-glow' : 'bg-dark-panel border-dark-border text-text-muted'}`}>
                      {t.status === 'active' ? 'LIVE' : t.status === 'completed' ? 'DONE' : 'CANC'}
                    </div>
                    <div>
                      <h4 className="text-white font-medium group-hover:text-primary transition-colors">{t.item_type}</h4>
                      <p className="text-xs text-text-muted">Status: <span className="text-primary font-medium">{t.status.toUpperCase()}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">₱ {Number(t.total_amount).toLocaleString()}</p>
                    <p className="text-xs text-text-muted">ID: #{t.transaction_id}</p>
                  </div>
                </Link>
              ))}

              {recentTrades.length === 0 && (
                <div className="px-6 py-10 text-center text-text-muted">No recent trades found.</div>
              )}
            </div>
          </DynamicCard>
        </motion.div>
      </div>
    </div>
  );
}
