"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import {
   PlusCircle, ShieldCheck, ArrowRight, Wallet, Clock,
   CheckCircle2, AlertTriangle, Send, Package, XCircle,
   Zap, Eye, ChevronRight, Activity
} from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

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
   agreement: { label: "Agreement", color: "text-[#8892b0]", icon: ShieldCheck },
   awaiting_payment: { label: "Awaiting Pay", color: "text-orange-400", icon: Wallet },
   active: { label: "Active", color: "text-primary", icon: Zap },
   verifying: { label: "Verifying", color: "text-purple-400", icon: Eye },
   completed: { label: "Completed", color: "text-primary", icon: CheckCircle2 },
   disputed: { label: "Disputed", color: "text-red-500", icon: AlertTriangle },
   cancelled: { label: "Cancelled", color: "text-[#8892b0]", icon: XCircle },
   refunded: { label: "Refunded", color: "text-yellow-400", icon: Clock },
};

export default function Dashboard() {
   const [user, setUser] = useState<any>(null);
   const [trades, setTrades] = useState<Trade[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   
   const containerRef = useRef<HTMLDivElement>(null);

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

   useGSAP(() => {
      if (isLoading) return;
      
      const tl = gsap.timeline();
      tl.fromTo(".dash-header", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
        .fromTo(".dash-metric", { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.2)" }, "-=0.3")
        .fromTo(".dash-item", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, "-=0.2");
   }, { scope: containerRef, dependencies: [isLoading] });

   const getMyUserId = () => { try { return JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).user_id; } catch { return 0; } };
   const getCounterparty = (t: Trade) => t.buyer_id === getMyUserId() ? t.seller?.first_name || t.seller?.email?.split('@')[0] : t.buyer?.first_name || t.buyer?.email?.split('@')[0];
   const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };

   const live = trades.filter(t => !['completed', 'cancelled', 'refunded'].includes(t.status));
   const sorted = [...trades].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

   if (isLoading) return <div className="flex-1 flex justify-center items-center h-[50vh]"><div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" /></div>;

   return (
      <div ref={containerRef} className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-12 lg:px-16">
         
         {/* Top Header - Asymmetric Text Alignment */}
         <div className="dash-header flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-8 border-b border-white/[0.04] pb-8">
            <div>
               <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                 System<br/> <span className="text-[#8892b0]">Overview</span>
               </h1>
            </div>
             <div className="flex flex-col items-start md:items-end gap-6 border-l md:border-l-0 md:border-r-2 border-primary/50 pl-6 md:pl-0 md:pr-6">
                 <p className="text-sm font-bold text-[#8892b0] tracking-widest uppercase">
                    {user?.first_name ? `Welcome back, ${user.first_name}` : 'Welcome back'}
                 </p>
                <Link href="/create-trade">
                   <NeonButton className="gap-3 !py-4 w-full md:w-auto tracking-widest uppercase text-xs">
                      <PlusCircle className="w-4 h-4" /> Create Escrow Transaction
                   </NeonButton>
                </Link>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
            
            {/* Left Column (Main Architecture) */}
            <div className="xl:col-span-8 flex flex-col gap-12">
               
               {/* Metrics Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DynamicCard hoverEffect className="dash-metric p-8 flex flex-col justify-between">
                     <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-black text-[#8892b0] uppercase tracking-widest">Available Balance</span>
                        <Wallet className="w-5 h-5 text-primary" />
                     </div>
                     <p className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                        <span className="text-[#8892b0] text-xl lg:text-3xl pr-1">₱</span>
                        {Number(user?.wallet_balance || 0).toLocaleString()}
                     </p>
                  </DynamicCard>
                  
                  <DynamicCard hoverEffect className="dash-metric p-8 flex flex-col justify-between">
                     <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-black text-[#8892b0] uppercase tracking-widest">Secured In Vault</span>
                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                     </div>
                     <p className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                        <span className="text-[#8892b0] text-xl lg:text-3xl pr-1">₱</span>
                        {trades.filter(t => ['active', 'verifying'].includes(t.status)).reduce((s, t) => s + Number(t.total_amount || 0), 0).toLocaleString()}
                     </p>
                  </DynamicCard>

                  <DynamicCard hoverEffect className="dash-metric p-8 flex flex-col justify-between border-primary/20 bg-primary/[0.02]">
                     <div className="flex items-center justify-between mb-8">
                        <span className="text-xs font-black text-primary uppercase tracking-widest">Active Operations</span>
                        <Activity className="w-5 h-5 text-primary" />
                     </div>
                     <p className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                        {live.length}
                     </p>
                  </DynamicCard>
               </div>

               {/* Live Operations */}
               <div className="flex flex-col gap-6">
                  <h2 className="dash-header text-sm font-black text-white uppercase tracking-widest border-b border-white/[0.04] pb-4 flex justify-between items-center">
                     <span>Active Transactions</span>
                     {live.length > 0 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </h2>
                  
                  {live.length === 0 ? (
                      <div className="dash-header p-12 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                         <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mb-4">
                            <Send className="w-6 h-6 text-[#8892b0]" />
                         </div>
                         <p className="text-[#8892b0] font-medium mb-1">No active transactions right now.</p>
                         <p className="text-xs text-[#8892b0]/50 tracking-widest uppercase">History is clean.</p>
                      </div>
                  ) : (
                     <div className="flex flex-col gap-4">
                        {live.map((t, i) => {
                           const s = STATUS[t.status] || STATUS.agreement;
                           const Icon = s.icon;
                           return (
                              <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="dash-item block">
                                 <DynamicCard hoverEffect className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                                    <div className="flex items-center gap-6 min-w-0 flex-1">
                                       <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-white/5 bg-white/[0.02] group-hover:border-primary/30 transition-colors`}>
                                          <Icon className={`w-5 h-5 ${s.color}`} />
                                       </div>
                                       <div className="min-w-0">
                                          <h3 className="text-2xl font-black text-white tracking-tight truncate group-hover:text-primary transition-colors">{t.item_name || t.game_type}</h3>
                                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-bold uppercase tracking-widest text-[#8892b0]">
                                             <span className={`${s.color}`}>{s.label}</span>
                                             <span className="w-1 h-1 rounded-full bg-white/20" />
                                             <span>OP: {getCounterparty(t) || 'UNKNOWN'}</span>
                                             <span className="w-1 h-1 rounded-full bg-white/20" />
                                             <span>{t.game_type}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 md:min-w-[200px]">
                                       <span className="text-3xl font-black text-white tracking-tighter">₱{Number(t.agreed_price).toLocaleString()}</span>
                                       <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-dark-bg transition-all">
                                          <ArrowRight className="w-4 h-4" />
                                       </div>
                                    </div>
                                 </DynamicCard>
                              </Link>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>

            {/* Right Column (History & Logs) */}
            <div className="xl:col-span-4 flex flex-col gap-6 lg:pl-6 xl:border-l border-white/[0.04]">
               <div className="dash-header flex items-center justify-between border-b border-white/[0.04] pb-4">
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">System Logs</h2>
                  <Link href="/transactions" className="text-xs font-bold tracking-widest uppercase text-primary hover:brightness-110">Archive</Link>
               </div>

               {sorted.length === 0 ? (
                   <p className="text-center text-[#8892b0] text-sm py-10 font-medium">Log empty.</p>
               ) : (
                  <div className="flex flex-col gap-4">
                     {sorted.slice(0, 7).map((t, i) => {
                        const s = STATUS[t.status] || STATUS.agreement;
                        const Icon = s.icon;
                        return (
                           <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="dash-item flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 group">
                              <div className="flex items-center gap-4 min-w-0">
                                 <Icon className={`w-4 h-4 ${s.color} shrink-0 opacity-80`} />
                                 <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{t.item_name || t.item_type || t.game_type}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${s.color} opacity-80 mt-0.5`}>{s.label}</p>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                 <span className="text-sm font-black text-white">₱{Number(t.agreed_price).toLocaleString()}</span>
                                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#8892b0]">{timeAgo(t.updated_at || t.created_at)}</span>
                              </div>
                           </Link>
                        );
                     })}
                  </div>
               )}
            </div>
            
         </div>
      </div>
   );
}
