"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
   PlusCircle, ShieldCheck, ArrowRight, Wallet, Clock,
   CheckCircle2, AlertTriangle, Send, Package, XCircle,
   Zap, Eye, ChevronRight
} from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";

type Trade = {
   transaction_id: number;
   item_type: string;
   item_name: string;
   game_type: string;
   agreed_price: string;
   total_amount: string;
   status: string;
   buyer_id: number;
   seller_id: number;
   created_at: string;
   updated_at: string;
   buyer: { email: string; first_name: string };
   seller: { email: string; first_name: string };
};

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
   pending_invite: { label: "Pending", color: "text-yellow-500", icon: Send },
   agreement: { label: "Agreement", color: "text-blue-400", icon: ShieldCheck },
   awaiting_payment: { label: "Awaiting Pay", color: "text-orange-400", icon: Wallet },
   active: { label: "Active", color: "text-primary", icon: Zap },
   verifying: { label: "Verifying", color: "text-purple-400", icon: Eye },
   completed: { label: "Completed", color: "text-emerald-400", icon: CheckCircle2 },
   disputed: { label: "Disputed", color: "text-red-500", icon: AlertTriangle },
   cancelled: { label: "Cancelled", color: "text-neutral-500", icon: XCircle },
   refunded: { label: "Refunded", color: "text-yellow-400", icon: Clock },
};

export default function Dashboard() {
   const [user, setUser] = useState<any>(null);
   const [trades, setTrades] = useState<Trade[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      const token = localStorage.getItem('token');
      if (!token) return;
      Promise.all([
         fetch("http://localhost:5000/api/user/profile", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
         fetch("http://localhost:5000/api/transactions", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]).then(([p, t]) => {
         setUser(p);
         if (t.trades) setTrades(t.trades);
         setIsLoading(false);
      }).catch(() => setIsLoading(false));
   }, []);

   const getMyUserId = () => { try { return JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).user_id; } catch { return 0; } };
   const getCounterparty = (t: Trade) => t.buyer_id === getMyUserId() ? t.seller?.first_name || t.seller?.email?.split('@')[0] : t.buyer?.first_name || t.buyer?.email?.split('@')[0];
   const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };

   const live = trades.filter(t => !['completed', 'cancelled', 'refunded'].includes(t.status));
   const sorted = [...trades].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

   if (isLoading) return <div className="flex-1 flex justify-center items-center"><div className="w-7 h-7 rounded-full border-[3px] border-primary border-t-transparent animate-spin" /></div>;

   return (
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-10">

         {/* Header */}
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-10">
            <div className="flex items-end justify-between">
               <div>
                  <h1 className="text-2xl font-semibold text-white tracking-tight">
                     {user?.first_name || 'Home'}
                  </h1>
                  <p className="text-sm text-text-muted mt-1">
                     {live.length > 0 ? `${live.length} active trade${live.length > 1 ? 's' : ''}` : 'No active trades'}
                  </p>
               </div>
               <Link href="/create-trade">
                  <NeonButton className="gap-2 !py-2.5 !px-5 !text-sm">
                     <PlusCircle className="w-4 h-4" /> New Escrow
                  </NeonButton>
               </Link>
            </div>
         </motion.div>

         {/* Metrics */}
         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-px bg-dark-border/50 rounded-xl overflow-hidden border border-dark-border mb-10">
            <Link href="/wallet" className="bg-dark-bg p-5 hover:bg-dark-panel/50 transition-colors group cursor-pointer">
               <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Balance</p>
               <p className="text-xl font-semibold text-white group-hover:text-primary transition-colors">₱{Number(user?.wallet_balance || 0).toLocaleString()}</p>
            </Link>
            <div className="bg-dark-bg p-5">
               <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">In Vault</p>
               <p className="text-xl font-semibold text-white">₱{trades.filter(t => ['active', 'verifying'].includes(t.status)).reduce((s, t) => s + Number(t.total_amount || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-dark-bg p-5">
               <p className="text-[11px] text-text-muted uppercase tracking-widest mb-1">Completed</p>
               <p className="text-xl font-semibold text-white">{trades.filter(t => t.status === 'completed').length}</p>
            </div>
         </motion.div>

         {/* Live Trades */}
         {live.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
               <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Live</h2>
               <div className="rounded-xl border border-dark-border overflow-hidden divide-y divide-dark-border/50">
                  {live.map(t => {
                     const s = STATUS[t.status] || STATUS.agreement;
                     const Icon = s.icon;
                     return (
                        <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="flex items-center justify-between px-5 py-3.5 bg-dark-bg hover:bg-dark-panel/40 transition-colors group">
                           <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`w-4 h-4 ${s.color} shrink-0`} />
                              <div className="min-w-0">
                                 <p className="text-sm text-white font-medium truncate max-w-[240px] group-hover:text-primary transition-colors">{t.item_name || t.game_type}</p>
                                 <p className="text-[11px] text-text-muted"><span className={`font-medium ${s.color}`}>{s.label}</span> · {getCounterparty(t)}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm text-white font-medium">₱{Number(t.agreed_price).toLocaleString()}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-dark-border group-hover:text-primary transition-colors" />
                           </div>
                        </Link>
                     );
                  })}
               </div>
            </motion.div>
         )}

         {/* Recent */}
         <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between mb-3">
               <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Recent</h2>
               <Link href="/transactions" className="text-[11px] text-text-muted hover:text-primary transition-colors font-medium">All trades <ArrowRight className="w-3 h-3 inline ml-0.5" /></Link>
            </div>

            {sorted.length === 0 ? (
               <div className="rounded-xl border border-dashed border-dark-border py-16 text-center">
                  <p className="text-text-muted text-sm mb-4">No trades yet</p>
                  <Link href="/create-trade">
                     <NeonButton className="mx-auto gap-2 !text-sm">
                        <PlusCircle className="w-4 h-4" /> Create Trade
                     </NeonButton>
                  </Link>
               </div>
            ) : (
               <div className="rounded-xl border border-dark-border overflow-hidden divide-y divide-dark-border/50">
                  {sorted.slice(0, 6).map(t => {
                     const s = STATUS[t.status] || STATUS.agreement;
                     const Icon = s.icon;
                     return (
                        <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="flex items-center justify-between px-5 py-3 bg-dark-bg hover:bg-dark-panel/40 transition-colors group">
                           <div className="flex items-center gap-3 min-w-0">
                              <Icon className={`w-3.5 h-3.5 ${s.color} shrink-0 opacity-60`} />
                              <p className="text-sm text-white/80 truncate max-w-[200px] group-hover:text-primary transition-colors">{t.item_name || t.item_type || t.game_type}</p>
                              <span className={`text-[10px] font-medium ${s.color} opacity-70`}>{s.label}</span>
                           </div>
                           <div className="flex items-center gap-4 shrink-0">
                              <span className="text-xs text-text-muted">{timeAgo(t.updated_at || t.created_at)}</span>
                              <span className="text-sm text-white/70 font-medium">₱{Number(t.agreed_price).toLocaleString()}</span>
                           </div>
                        </Link>
                     );
                  })}
               </div>
            )}
         </motion.div>
      </div>
   );
}
