"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ListFilter, Search, ArrowRight, ShieldCheck, XCircle } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Transactions() {
  const [filter, setFilter] = useState("ALL");
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/transactions", {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
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
  }, []);

  const filtered = filter === "ALL" ? trades : trades.filter(t => t.status === filter);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Trade History</h1>
          <p className="text-text-muted mt-2">Manage all your active, completed, and canceled smart escrows.</p>
        </div>
        
        <div className="flex gap-2 bg-dark-panel p-1 rounded-xl border border-dark-border">
          {["ALL", "ACTIVE", "COMPLETED", "CANCELLED"].map(f => (
             <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? "bg-primary text-black glow-icon" : "text-text-muted hover:text-white"}`}
             >
                {f}
             </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted text-sm"/>
            <input type="text" placeholder="Search by ID or Item..." className="w-full bg-dark-panel border border-dark-border py-2.5 pl-10 pr-4 rounded-xl text-white focus:outline-none focus:border-primary/50 transition-colors" />
         </div>
         <NeonButton variant="secondary" className="!px-4 !py-2.5 rounded-xl gap-2 text-sm text-text-muted">
            <ListFilter className="w-4 h-4"/> Filter
         </NeonButton>
      </div>

      <DynamicCard hoverEffect={false} className="p-0 border border-dark-border bg-dark-bg/50">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-dark-border text-sm font-medium text-text-muted bg-dark-panel/30">
                     <th className="py-4 px-6 font-medium">Trade ID</th>
                     <th className="py-4 px-6 font-medium">Item Name</th>
                     <th className="py-4 px-6 font-medium">Role</th>
                     <th className="py-4 px-6 font-medium">Amount</th>
                     <th className="py-4 px-6 font-medium">Status / Step</th>
                     <th className="py-4 px-6 font-medium">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-dark-border/50 text-sm">
                  <AnimatePresence>
                    {filtered.map((trade) => (
                       <motion.tr 
                          key={trade.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="group hover:bg-dark-panel/50 transition-colors"
                       >
                          <td className="py-4 px-6 font-mono text-text-muted">#{trade.id}</td>
                          <td className="py-4 px-6 font-bold text-white">{trade.item}</td>
                          <td className="py-4 px-6">
                             <span className={`text-xs font-bold px-2 py-1 rounded ${trade.role === "BUY" ? "bg-primary/10 text-primary border border-primary/30" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"}`}>
                               {trade.role}
                             </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-text-main">{trade.price}</td>
                          <td className="py-4 px-6">
                             <div className="flex flex-col gap-1">
                                {trade.status === "ACTIVE" && <span className="text-xs font-bold text-primary flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary animate-pulse"/> ACTIVE</span>}
                                {trade.status === "COMPLETED" && <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> COMPLETED</span>}
                                {trade.status === "CANCELLED" && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> CANCELLED</span>}
                                <span className="text-xs text-text-muted">{trade.step}</span>
                             </div>
                          </td>
                          <td className="py-4 px-6">
                            {trade.status === "ACTIVE" ? (
                               <Link href={`/trade/${trade.id}`}>
                                  <NeonButton variant="primary" className="!px-3 !py-1.5 text-xs rounded gap-1 flex glow-icon">
                                     Open Hub <ArrowRight className="w-3 h-3"/>
                                  </NeonButton>
                               </Link>
                            ) : (
                               <NeonButton variant="secondary" className="!px-3 !py-1.5 text-xs rounded hover:border-text-muted text-text-muted" disabled>
                                  View Receipt
                               </NeonButton>
                            )}
                          </td>
                       </motion.tr>
                    ))}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>
         {isLoading && (
            <div className="p-10 text-center text-text-muted">
               Loading trades...
            </div>
         )}
         {!isLoading && filtered.length === 0 && (
            <div className="p-10 text-center text-text-muted">
               No transactions found matching the current filter.
            </div>
         )}
      </DynamicCard>
    </div>
  );
}
