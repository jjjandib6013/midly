"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, Info, Calculator, ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from 'react-hot-toast';

export default function CreateTrade() {
  const router = useRouter();
  const [role, setRole] = useState<"BUY" | "SELL">("BUY");
  const [category, setCategory] = useState("VALORANT");
  const [item, setItem] = useState("Immortal Rank Account");
  const [amount, setAmount] = useState("10000");
  const [email, setEmail] = useState("maria@seller.com");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const categories = ["VALORANT", "ROBLOX", "GENSHIN IMPACT", "MOBILE LEGENDS", "CS2", "CUSTOM"];
  
  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isBuyer = role === "BUY";
  
  // Fee logic: Midly explicitly charges 5%. Usually Buyer puts up funds + fee.
  const serviceFee = parsedAmount * 0.05;
  const buyerTotal = parsedAmount + serviceFee;
  const sellerReceives = parsedAmount; // Seller gets what they asked for, buyer covers system tax. Or vice versa. Here we assume 5% is standard.

  const handleCreate = async () => {
    setIsProcessing(true);
    setError("");
    
    try {
       const res = await fetch("http://localhost:5000/api/transactions", {
          method: "POST",
          headers: { 
             "Content-Type": "application/json",
             "Authorization": `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
             role,
             itemCategory: category,
             itemDescription: item,
             agreedPrice: parsedAmount,
             sellerEmail: email
          })
       });

       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Failed to create escrow contract.");
       
       // Success! Route to Dashboard and notify
       toast.success(`Escrow Invitation sent to ${email}. Waiting for their approval.`);
       router.push(`/dashboard`);
    } catch (err: any) {
       setError(err.message);
       setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          New Secure Trade
          <ShieldCheck className="w-6 h-6 text-primary glow-icon" />
        </h1>
        <p className="text-text-muted mt-2">Initialize a smart escrow contract. Funds will be held safely until both parties confirm delivery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-6">
            <h2 className="text-xl font-bold text-white mb-6">Trade Details</h2>
            
            {error && (
               <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4"/> {error}
               </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-text-muted mb-3 block">My Role in this Trade</label>
                <div className="flex bg-dark-bg p-1 rounded-xl border border-dark-border">
                  <button
                    onClick={() => setRole("BUY")}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${role === "BUY" ? "bg-primary text-black glow-icon" : "text-text-muted hover:text-white"}`}
                  >
                    I am the BUYER
                  </button>
                  <button
                    onClick={() => setRole("SELL")}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${role === "SELL" ? "bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]" : "text-text-muted hover:text-white"}`}
                  >
                    I am the SELLER
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">Counterparty Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`Enter the ${isBuyer ? 'seller' : 'buyer'}'s registered Midly email`}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" /> They must have a verified Midly account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div>
                   <label className="text-sm font-medium text-text-muted mb-2 block">Game / Category</label>
                   <select 
                     value={category}
                     onChange={(e) => setCategory(e.target.value)}
                     className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none appearance-none"
                   >
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-sm font-medium text-text-muted mb-2 block">Item Name</label>
                   <input 
                     type="text" 
                     value={item}
                     onChange={e => setItem(e.target.value)}
                     placeholder="e.g. Vandal Skin"
                     className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                   />
                 </div>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted mb-2 block">Agreed Base Price (PHP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-text-muted">₱</span>
                  <input 
                    type="text" 
                    value={amount}
                    onChange={(e) => {
                       // simple numeric filter
                       const val = e.target.value.replace(/[^0-9.]/g, '');
                       setAmount(val);
                    }}
                    placeholder="0.00"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl pl-10 pr-4 py-4 text-2xl font-bold text-white focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </DynamicCard>
        </div>

        <div className="md:col-span-1">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg/60 sticky top-24">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Cost Breakdown
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">Base Item Price</span>
                <span className="text-white font-medium">₱ {parsedAmount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted flex flex-col">
                  Midly Protection Fee (5%)
                  <span className="text-xs text-primary">Fully refundable if canceled</span>
                </span>
                <span className="text-white font-medium">₱ {serviceFee.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
            
            <div className="border-t border-dark-border pt-4 mb-8">
               <div className="flex justify-between items-end">
                 <span className="text-sm font-bold text-text-muted uppercase tracking-wider">
                    {isBuyer ? "You will pay" : "You will receive"}
                 </span>
                 <span className={`text-2xl font-bold ${isBuyer ? "text-primary glow-icon" : "text-yellow-500"}`}>
                    ₱ {(isBuyer ? buyerTotal : sellerReceives).toLocaleString('en-US', {minimumFractionDigits: 2})}
                 </span>
               </div>
            </div>

            <NeonButton 
              className="w-full justify-center !py-4 text-sm gap-2 uppercase tracking-wide font-bold" 
              onClick={handleCreate}
              isLoading={isProcessing}
              disabled={parsedAmount <= 0 || !email}
            >
               Create Escrow Room <ArrowRight className="w-4 h-4" />
            </NeonButton>
            
            <p className="text-xs text-center text-text-muted mt-4">
              By creating this room, an email notification will be automatically dispatched to <span className="text-white font-medium">{email || "the counterparty"}</span> to join and verify.
            </p>
          </DynamicCard>
        </div>
      </div>
    </div>
  );
}
