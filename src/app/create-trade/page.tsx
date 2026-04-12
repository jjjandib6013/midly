"use client";

import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, Mail, Info, Calculator, ArrowRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from 'react-hot-toast';

export default function CreateTrade() {
  const router = useRouter();
  const [role, setRole] = useState<"BUY" | "SELL">("BUY");
  const [tradeType, setTradeType] = useState("Game Account");
  const [category, setCategory] = useState("VALORANT");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(containerRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
  }, { scope: containerRef });

  const categories = ["VALORANT", "ROBLOX", "GENSHIN IMPACT", "MOBILE LEGENDS", "CS2", "CUSTOM"];
  const tradeTypes = ["Game Account", "In-Game Item", "Currency", "Service/Boosting"];

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const isBuyer = role === "BUY";
  const serviceFee = parsedAmount * 0.05;
  const buyerTotal = parsedAmount + serviceFee;
  const sellerReceives = parsedAmount;

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
          tradeCategory: tradeType,
          agreedPrice: parsedAmount,
          sellerEmail: email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create escrow contract.");

      toast.success(`Escrow Invitation sent to ${email}. Waiting for their approval.`);
      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-12">
      <div className="mb-12 border-b border-white/[0.04] pb-8">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 flex items-center gap-4">
          Establish <span className="text-primary">Hub</span>
        </h1>
        <p className="text-[#8892b0] text-lg font-medium max-w-2xl">Initialize a smart escrow contract matrix. Funds will be held safely until both parties verify execution.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-8">
          <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8">Contract Matrix Parameters</h2>

            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 font-semibold">
                <ShieldAlert className="w-5 h-5" /> {error}
              </div>
            )}

            <div className="space-y-8">
              <div>
                <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">My Intended Role</label>
                <div className="flex bg-[#050608] p-2 rounded-2xl border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                  <button
                    onClick={() => setRole("BUY")}
                    className={`flex-1 py-4 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${role === "BUY" ? "bg-primary text-black shadow-[0_0_20px_rgba(63,229,108,0.3)]" : "text-[#8892b0] hover:text-white"}`}
                  >
                    Asset Buyer
                  </button>
                  <button
                    onClick={() => setRole("SELL")}
                    className={`flex-1 py-4 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${role === "SELL" ? "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "text-[#8892b0] hover:text-white"}`}
                  >
                    Asset Vector (Seller)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">Counterparty Identification Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#8892b0]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`Enter the ${isBuyer ? 'seller' : 'buyer'}'s registered Midly address`}
                    className="w-full bg-[#030407] border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white font-medium focus:border-primary/50 focus:outline-none transition-colors text-lg focus:shadow-[0_0_20px_rgba(63,229,108,0.1)]"
                  />
                </div>
                <p className="text-xs text-[#8892b0] font-bold uppercase tracking-widest mt-3 flex items-center gap-2 pl-1">
                  <Info className="w-4 h-4" /> Identity must be compiled into Midly database.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">Digital Index</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#030407] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:border-primary/50 focus:outline-none appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">Matrix Type</label>
                  <select
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="w-full bg-[#030407] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:border-primary/50 focus:outline-none appearance-none"
                  >
                    {tradeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">Identifier Name</label>
                  <input
                    type="text"
                    value={item}
                    onChange={e => setItem(e.target.value)}
                    placeholder="e.g. Vandal Skin Vector"
                    className="w-full bg-[#030407] border border-white/10 rounded-2xl px-5 py-4 text-white font-medium focus:border-primary/50 focus:outline-none placeholder:text-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest pl-1 mb-3 block">Agreed Consensus Value (PHP)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-[#8892b0]">₱</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(val);
                    }}
                    placeholder="0.00"
                    className="w-full bg-[#030407] border border-white/10 rounded-[2rem] pl-16 pr-8 py-6 text-4xl md:text-5xl font-black tracking-tighter text-white focus:border-primary/50 focus:outline-none focus:shadow-[0_0_30px_rgba(63,229,108,0.1)] transition-all"
                  />
                </div>
              </div>
            </div>
          </DynamicCard>
        </div>

        <div className="md:col-span-1">
          <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#050608] sticky top-32 p-8 md:p-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
              <Calculator className="w-6 h-6 text-primary" /> Cost Ledger
            </h3>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center bg-[#030407] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8892b0] font-bold text-xs uppercase tracking-widest">Base Item Node</span>
                <span className="text-white font-black">₱ {parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-[#030407] border border-white/5 p-4 rounded-xl">
                <span className="text-[#8892b0] font-bold text-xs uppercase tracking-widest flex flex-col gap-1">
                  Midly Guard Layer (5%)
                  <span className="text-[10px] text-primary">Fully refundable if canceled</span>
                </span>
                <span className="text-white font-black">₱ {serviceFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-8 mb-10">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black text-[#8892b0] uppercase tracking-widest">
                  {isBuyer ? "Total Liability" : "Expected Income"}
                </span>
                <span className={`text-4xl font-black tracking-tighter ${isBuyer ? "text-primary" : "text-yellow-500"}`}>
                  ₱ {(isBuyer ? buyerTotal : sellerReceives).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <NeonButton
              className="w-full justify-center !py-6 text-sm uppercase tracking-widest font-black"
              onClick={handleCreate}
              isLoading={isProcessing}
              disabled={parsedAmount <= 0 || !email}
            >
              Deploy Smart Contract <ArrowRight className="w-5 h-5 ml-2" />
            </NeonButton>

            <p className="text-xs text-center text-[#8892b0] font-bold uppercase tracking-widest mt-6">
              Contract signal dispatched to <span className="text-white mx-1">{email || "Counterparty"}</span> upon deployment.
            </p>
          </DynamicCard>
        </div>
      </div>
    </div>
  );
}