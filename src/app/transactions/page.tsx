"use client";
import { useSession } from 'next-auth/react';

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ListFilter, Search, ArrowRight, ShieldCheck, XCircle } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { API_URL } from "@/lib/api";

export default function Transactions() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;

  const [filter, setFilter] = useState("ALL");
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}//api/transactions`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
         if (data.trades) {
           // Map DB fields to UI fields
           const mappedTrades = data.trades.map((t: any) => ({
             id: t.transaction_id.toString(),
             item: t.item_type || "Unknown Item",
             price: `₱ ${Number(t.total_amount).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
             role: "BUY", // Mocking Role slightly since we need to check buyer_id === current user
             status: t.status === "active" ? "ACTIVE" : t.status === "completed" ? "COMPLETED" : "CANCELLED",
             step: t.status === "active" ? "Payment Locked" : "Escrow Finished",
             date: new Date(t.created_at).toLocaleDateString()
           }));
           setTrades(mappedTrades);
         }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token]);

  const filtered = filter === "ALL" ? trades : trades.filter(t => t.status === filter);

  useGSAP(() => {
      if (!isLoading && filtered.length > 0) {
         gsap.fromTo(".trade-row", { opacity: 0, y: 15 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.4, ease: "power2.out" });
      }
  }, [isLoading, filtered]);

  useGSAP(() => {
     gsap.fromTo(".page-header", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.8, ease: "power4.out" });
  }, [token]);

  return (
    <div ref={containerRef} className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-12">
      <div className="page-header mb-12 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 pb-8 border-b border-white/[0.04]">
         <div>
           <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 leading-none">Trade <span className="text-primary opacity-80">Ledger</span></h1>
           <p className="text-[#8892b0] text-lg font-medium max-w-2xl">Monitor your active escrows, review completed transactions, and audit canceled contracts across the protocol.</p>
         </div>
        
         <div className="flex gap-2 bg-[#050608] p-2 rounded-2xl border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
           {["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].map(f => (
              <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-6 py-3 rounded-xl text-xs uppercase tracking-widest font-bold transition-all ${filter === f ? "bg-primary text-black shadow-[0_0_15px_rgba(63,229,108,0.3)]" : "text-[#8892b0] hover:text-white hover:bg-white/5"}`}
              >
                 {f}
              </button>
           ))}
         </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
         <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8892b0]"/>
            <input type="text" placeholder="Search by Contract ID or Matrix Item..." className="w-full bg-[#050608] border border-white/10 py-4 pl-12 pr-4 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors font-medium tracking-wide" />
         </div>
         <NeonButton variant="secondary" className="!px-6 !py-4 rounded-xl gap-2 text-sm text-[#8892b0] uppercase tracking-widest font-bold hover:border-white">
            <ListFilter className="w-5 h-5"/> Deep Filter
         </NeonButton>
      </div>

      <DynamicCard hoverEffect={false} className="p-0 border border-white/5 bg-[#0a0d14]/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/5 text-xs font-black text-[#8892b0] uppercase tracking-widest bg-[#030407]/50">
                     <th className="py-6 px-8">Contract ID</th>
                     <th className="py-6 px-8">Asset Matrix</th>
                     <th className="py-6 px-8">Protocol Role</th>
                     <th className="py-6 px-8">Locked Value</th>
                     <th className="py-6 px-8">Telemetry State</th>
                     <th className="py-6 px-8 text-right">Action Interface</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02] text-sm">
                  {filtered.map((trade) => (
                     <tr 
                        key={trade.id}
                        className="trade-row group hover:bg-white/[0.02] transition-colors"
                     >
                        <td className="py-6 px-8 font-mono text-[#8892b0] text-sm tracking-widest">#{trade.id}</td>
                        <td className="py-6 px-8 font-black text-white text-base tracking-wide">{trade.item}</td>
                        <td className="py-6 px-8">
                           <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md ${trade.role === "BUY" ? "bg-primary/10 text-primary border border-primary/20" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"}`}>
                             {trade.role}
                           </span>
                        </td>
                        <td className="py-6 px-8 font-black text-white text-lg tracking-tight">{trade.price}</td>
                        <td className="py-6 px-8">
                           <div className="flex flex-col gap-1.5">
                              {trade.status === "ACTIVE" && <span className="text-[10px] font-black tracking-widest text-primary flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/> ACTIVE ESCROW</span>}
                              {trade.status === "COMPLETED" && <span className="text-[10px] font-black tracking-widest text-emerald-500 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5"/> CONTRACT ENDED</span>}
                              {trade.status === "CANCELLED" && <span className="text-[10px] font-black tracking-widest text-red-500 flex items-center gap-2"><XCircle className="w-3.5 h-3.5"/> TERMINATED</span>}
                              <span className="text-[10px] tracking-widest uppercase font-bold text-[#8892b0]">{trade.step}</span>
                           </div>
                        </td>
                        <td className="py-6 px-8 text-right">
                          {trade.status === "ACTIVE" ? (
                             <Link href={`/trade/${trade.id}`}>
                                <NeonButton variant="primary" className="!px-4 !py-2.5 text-[10px] rounded gap-2 inline-flex border border-primary/50 shadow-[0_0_10px_rgba(63,229,108,0.2)] hover:shadow-[0_0_20px_rgba(63,229,108,0.5)]">
                                   Access Hub <ArrowRight className="w-3 h-3"/>
                                </NeonButton>
                             </Link>
                          ) : (
                             <NeonButton variant="secondary" className="!px-4 !py-2.5 text-[10px] rounded hover:border-[#8892b0] text-[#8892b0] inline-flex opacity-50 cursor-not-allowed" disabled>
                                Audit Receipt
                             </NeonButton>
                          )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {isLoading && (
            <div className="py-20 text-center flex flex-col items-center justify-center">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
               <p className="text-sm font-bold tracking-widest uppercase text-[#8892b0]">Syncing Ledger Data...</p>
            </div>
         )}
         {!isLoading && filtered.length === 0 && (
            <div className="py-32 text-center flex flex-col items-center justify-center grayscale opacity-50">
               <div className="w-20 h-20 border border-dashed border-[#8892b0] rounded-full flex items-center justify-center mb-6">
                  <ListFilter className="w-8 h-8 text-[#8892b0]" />
               </div>
               <p className="text-sm font-black tracking-widest uppercase text-[#8892b0]">Zero Matrices Found</p>
               <p className="text-xs font-semibold uppercase tracking-wider text-[#8892b0] mt-2">Adjust your parameters.</p>
            </div>
         )}
      </DynamicCard>
    </div>
  );
}
