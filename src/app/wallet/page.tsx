"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, History, X } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function Wallet() {
  const router = useRouter();
  const [balance, setBalance] = useState("0.00");
  const [isVerified, setIsVerified] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const modalDepositRef = useRef<HTMLDivElement>(null);
  const modalWithdrawRef = useRef<HTMLDivElement>(null);

  const fetchWallet = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const walletRes = await fetch(`http://localhost:5000/api/user/wallet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (walletRes.ok) {
        const data = await walletRes.json();
        const bal = data.available_balance ?? data.wallet_balance;
        if (bal !== undefined) setBalance(Number(bal).toFixed(2));
      }
    } catch (e) { console.error("Wallet fetch error:", e); }

    try {
      const profileRes = await fetch(`http://localhost:5000/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await profileRes.json();
      if (data.kyc?.status === 'verified') setIsVerified(true);
    } catch (e) { console.error("Profile fetch error:", e); }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(".wallet-header", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.8, ease: "power4.out" })
      .fromTo(".wallet-card", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }, "-=0.5")
      .fromTo(".wallet-balance span", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "back.out(1.5)" }, "-=0.3");
  }, { scope: containerRef });

  useEffect(() => {
     if (isDepositModalOpen && modalDepositRef.current) {
        gsap.fromTo(modalDepositRef.current.children, 
            { scale: 0.9, y: 20, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
        );
     }
  }, [isDepositModalOpen]);

  useEffect(() => {
     if (isWithdrawModalOpen && modalWithdrawRef.current) {
        gsap.fromTo(modalWithdrawRef.current.children, 
            { scale: 0.9, y: 20, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.5)" }
        );
     }
  }, [isWithdrawModalOpen]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/wallet/deposit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        toast.success(`Successfully deposited ₱${amount}`);
        setAmount("");
        setIsDepositModalOpen(false);
        fetchWallet();
      } else { toast.error("Deposit failed"); }
    } catch (e) { toast.error("Server error"); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error("AML Law: Identity Verification Required to withdraw funds.");
      router.push("/kyc");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully withdrew ₱${amount} to bank`);
        setAmount("");
        setIsWithdrawModalOpen(false);
        fetchWallet();
      } else { toast.error(data.error || "Withdrawal failed"); }
    } catch (e) { toast.error("Server error"); }
  };

  return (
    <div ref={containerRef} className="min-h-screen pt-8 pb-16 px-4 sm:px-8 w-full max-w-[1600px] mx-auto">
      
      <div className="wallet-header flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-white/[0.04] pb-8">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20 text-primary shrink-0 relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <WalletIcon className="w-10 h-10 relative z-10" />
            </div>
            <div>
               <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none">
                  Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-900 drop-shadow-[0_0_20px_rgba(63,229,108,0.2)]">Vault</span>
               </h1>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Main Wallet Architecture */}
        <div className="xl:col-span-8 flex flex-col gap-12">
          
          <DynamicCard hoverEffect={true} delay={0.1} className="wallet-card p-12 md:p-16 min-h-[400px] flex flex-col justify-between overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.02] pointer-events-none md:translate-x-1/4 -translate-y-1/4">
               <WalletIcon className="w-full h-full -rotate-12" />
            </div>

            <div className="relative z-10">
              <h2 className="text-primary font-bold tracking-widest text-sm mb-6 uppercase flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 Global Ledger Balance
              </h2>
              <div className="wallet-balance text-6xl sm:text-8xl md:text-[8rem] font-black text-white tracking-tighter mb-16 leading-none flex items-start">
                <span className="text-[#8892b0] font-light mr-4 text-4xl sm:text-6xl mt-2 block">₱</span>
                {Number(balance).toLocaleString().split('').map((char, index) => (
                    <span key={index} className="inline-block">{char}</span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-3/4">
                <NeonButton onClick={() => setIsDepositModalOpen(true)} className="flex-1 text-sm md:text-base !py-6 tracking-widest uppercase shadow-[0_0_30px_-5px_rgba(63,229,108,0.2)]">
                  <ArrowDownLeft className="w-5 h-5 mr-3" /> Initiate Deposit
                </NeonButton>
                <NeonButton 
                  onClick={() => {
                    if (!isVerified) {
                      toast.error("AML Verification Required.");
                      router.push("/kyc");
                    } else {
                      setIsWithdrawModalOpen(true);
                    }
                  }} 
                  variant="secondary" 
                  className="flex-1 text-sm md:text-base !py-6 tracking-widest uppercase hover:border-white"
                >
                  <ArrowUpRight className="w-5 h-5 mr-3" /> Execute Payout
                </NeonButton>
              </div>
            </div>
          </DynamicCard>

          {/* Security Architecture */}
          <div className="wallet-card bg-gradient-to-r from-primary/[0.05] to-transparent border border-primary/20 rounded-[2rem] p-10 flex flex-col md:flex-row items-start gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
            <div className="p-5 bg-primary/10 rounded-2xl border border-primary/20 text-primary shrink-0 shadow-[inset_0_0_20px_rgba(63,229,108,0.2)]">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl text-white font-black tracking-tight mb-3 uppercase">Hardware Encrypted Vault Layer</h3>
              <p className="text-[#8892b0] leading-relaxed font-medium text-lg">
                Your capital is immutably mapped to your hardware-verified identity. Our protocol mathematically enforces zero money laundering constraints and prohibits fraudulent manual withdrawals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Ledger */}
        <div className="xl:col-span-4 h-full flex flex-col">
          <DynamicCard delay={0.2} className="wallet-card h-full flex flex-col p-10 bg-[#07090d]">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/[0.04]">
              <h3 className="text-sm font-black text-[#8892b0] tracking-widest uppercase">Transaction Ledger</h3>
              <History className="w-4 h-4 text-[#8892b0]" />
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-20 grayscale opacity-40">
               <div className="w-20 h-20 rounded-full border border-dashed border-[#8892b0] flex items-center justify-center mb-6">
                  <History className="w-8 h-8 text-[#8892b0]" />
               </div>
               <p className="text-[#8892b0] font-bold uppercase tracking-widest text-sm mb-2">Immutable Log Empty</p>
               <p className="text-xs text-[#8892b0]/60 text-center uppercase tracking-wider font-semibold max-w-[200px]">Network history will index here post-transaction.</p>
            </div>
          </DynamicCard>
        </div>
      </div>

      {/* GSAP Managed Modals */}
      {isDepositModalOpen && (
         <div ref={modalDepositRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#030407]/90 backdrop-blur-xl" onClick={() => setIsDepositModalOpen(false)} />
            <div className="bg-[#090b10] border border-white/10 p-12 rounded-[2.5rem] w-full max-w-lg shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative z-10 w-full transform will-change-transform" onClick={e => e.stopPropagation()}>
               <button className="absolute top-8 right-8 text-[#8892b0] hover:text-white transition-colors bg-white/5 p-2 rounded-full" onClick={() => setIsDepositModalOpen(false)}>
                  <X className="w-5 h-5" />
               </button>
               <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Deposit Funds</h2>
               <p className="text-[#8892b0] mb-10 font-medium">Add fiat capital into the Midly Protocol Vault.</p>
               <form onSubmit={handleDeposit} className="space-y-8">
                  <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-white font-light">₱</span>
                  <input 
                     type="number" 
                     value={amount} 
                     onChange={(e) => setAmount(e.target.value)} 
                     required min="100" 
                     placeholder="0.00" 
                     className="w-full bg-[#050608] border border-white/10 rounded-3xl py-8 pl-20 pr-8 text-white focus:outline-none focus:border-primary focus:shadow-[0_0_20px_rgba(63,229,108,0.1)] text-5xl font-black tracking-tighter transition-all" 
                  />
                  </div>
                  <NeonButton type="submit" className="w-full justify-center text-lg !py-6 tracking-widest uppercase">CONFIRM INJECTION</NeonButton>
               </form>
            </div>
         </div>
      )}

      {isWithdrawModalOpen && (
         <div ref={modalWithdrawRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#030407]/90 backdrop-blur-xl" onClick={() => setIsWithdrawModalOpen(false)} />
            <div className="bg-[#090b10] border border-white/10 p-12 rounded-[2.5rem] w-full max-w-lg shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative z-10 w-full transform will-change-transform" onClick={e => e.stopPropagation()}>
               <button className="absolute top-8 right-8 text-[#8892b0] hover:text-white transition-colors bg-white/5 p-2 rounded-full" onClick={() => setIsWithdrawModalOpen(false)}>
                  <X className="w-5 h-5" />
               </button>
               <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Execute Payout</h2>
               
               <div className="flex justify-between items-center mb-10 bg-[#030407] p-5 rounded-2xl border border-white/5">
                  <span className="text-[#8892b0] text-xs uppercase font-bold tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Accessible Balance</span>
                  <span className="text-white font-black tracking-tight text-xl">₱{Number(balance).toLocaleString()}</span>
               </div>

               <form onSubmit={handleWithdraw} className="space-y-8">
                  <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-white font-light">₱</span>
                  <input 
                     type="number" 
                     value={amount} 
                     onChange={(e) => setAmount(e.target.value)} 
                     required min="100" 
                     placeholder="0.00" 
                     className="w-full bg-[#050608] border border-white/10 rounded-3xl py-8 pl-20 pr-8 text-white focus:outline-none focus:border-white text-5xl font-black tracking-tighter transition-all" 
                  />
                  </div>
                  <NeonButton type="submit" variant="secondary" className="w-full justify-center text-lg !py-6 tracking-widest uppercase hover:border-white">PROCESS WITHDRAWAL</NeonButton>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
