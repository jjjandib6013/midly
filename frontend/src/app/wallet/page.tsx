"use client";

import { motion } from "framer-motion";
import { Wallet, ShieldCheck, ArrowDownToLine, ArrowUpFromLine, RefreshCcw, Lock } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function WalletPage() {
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          MIDLY Vault
          <ShieldCheck className="w-8 h-8 text-primary glow-icon" />
        </h1>
        <p className="text-text-muted mt-2">Manage your balances and view funds secured in active smart escrows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {/* Available Balance */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <DynamicCard hoverEffect={false} className="border-t-2 border-t-primary bg-primary/5 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold mb-4">
                <Wallet className="w-5 h-5"/> Available Balance
              </div>
              <h2 className="text-5xl font-bold text-white mt-2 mb-1 glow-icon drop-shadow-[0_0_15px_rgba(63,229,108,0.2)]">₱ 18,450.00</h2>
              <p className="text-sm text-text-muted">Ready to withdraw or use for trades.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-8">
               <NeonButton className="w-full rounded text-sm gap-2">
                 <ArrowUpFromLine className="w-4 h-4"/> Deposit
               </NeonButton>
               <NeonButton variant="secondary" className="w-full rounded text-sm gap-2 hover:border-primary hover:text-primary transition-all glow-icon">
                 <ArrowDownToLine className="w-4 h-4"/> Withdraw
               </NeonButton>
            </div>
          </DynamicCard>
        </motion.div>

        {/* Funds in Escrow (Locked) */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel h-full flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 border-l border-b border-dark-border rounded-bl-[100px] bg-dark-bg/50">
              <Lock className="w-12 h-12 text-text-muted/20" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-text-muted font-bold mb-4">
                <Lock className="w-5 h-5"/> Locked in Escrow
              </div>
              <h2 className="text-4xl font-bold text-text-main mt-2 mb-1">₱ 12,500.00</h2>
              <p className="text-sm text-text-muted">Secured in 1 active "BUY" transaction.</p>
            </div>
            <div className="mt-8">
              <p className="text-xs text-text-muted leading-relaxed">
                These funds cannot be withdrawn until the associated transaction (#1095) is either completed or canceled through dispute resolution.
              </p>
            </div>
          </DynamicCard>
        </motion.div>

        {/* Incoming Escrow (Waiting) */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel h-full flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 border-l border-b border-dark-border rounded-bl-[100px] bg-dark-bg/50">
              <RefreshCcw className="w-12 h-12 text-yellow-500/10" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-yellow-500 font-bold mb-4">
                <RefreshCcw className="w-5 h-5"/> Expected Incoming
              </div>
              <h2 className="text-4xl font-bold text-text-main mt-2 mb-1 text-yellow-500">₱ 3,800.00</h2>
              <p className="text-sm text-text-muted">From 1 active "SELL" transaction.</p>
            </div>
            <div className="mt-8">
               <p className="text-xs text-text-muted leading-relaxed">
                This amount will be directly deposited to your available balance once the buyer approves the received asset. Note: 5% fee is already deducted.
              </p>
            </div>
          </DynamicCard>
        </motion.div>
      </div>

      <h2 className="text-xl font-bold text-white mb-6">Recent Vault Activity</h2>
      <DynamicCard hoverEffect={false} className="p-0 border border-dark-border bg-dark-bg/30">
        <div className="divide-y divide-dark-border/50 text-sm">
           <div className="p-4 flex items-center gap-4 hover:bg-dark-panel/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><ArrowDownToLine className="w-4 h-4"/></div>
              <div className="flex-1">
                 <p className="font-bold text-white">Escrow Payment Locked (Trade #1095)</p>
                 <p className="text-xs text-text-muted">Oct 24, 2026 • 10:05 AM</p>
              </div>
              <p className="font-bold text-white">- ₱ 12,500.00</p>
           </div>
           
           <div className="p-4 flex items-center gap-4 hover:bg-dark-panel/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ArrowUpFromLine className="w-4 h-4"/></div>
              <div className="flex-1">
                 <p className="font-bold text-white">Deposit via GCash/PayMaya</p>
                 <p className="text-xs text-text-muted">Oct 24, 2026 • 09:30 AM</p>
              </div>
              <p className="font-bold text-emerald-500">+ ₱ 12,500.00</p>
           </div>
           
           <div className="p-4 flex items-center gap-4 hover:bg-dark-panel/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary glow-icon"><ShieldCheck className="w-4 h-4"/></div>
              <div className="flex-1">
                 <p className="font-bold text-white">Funds Released (Trade #1002)</p>
                 <p className="text-xs text-text-muted">Oct 15, 2026 • 15:45 PM</p>
              </div>
              <p className="font-bold text-primary">+ ₱ 2,375.00</p>
           </div>
        </div>
      </DynamicCard>
    </div>
  );
}
