"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, History, X } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { API_URL } from "@/lib/api";

export default function Wallet() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const router = useRouter();
  const [balance, setBalance] = useState("0.00");
  const [isVerified, setIsVerified] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  // BUG-03: Separate state for each modal
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const modalDepositRef = useRef<HTMLDivElement>(null);
  const modalWithdrawRef = useRef<HTMLDivElement>(null);

  const fetchWallet = async () => {
    if (!token) return;

    try {
      const walletRes = await fetch(`${API_URL}/api/user/wallet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (walletRes.ok) {
        const data = await walletRes.json();
        const bal = data.available_balance ?? data.wallet_balance;
        if (bal !== undefined) setBalance(Number(bal).toFixed(2));
      }
    } catch (e) { console.error("Wallet fetch error:", e); }

    try {
      const profileRes = await fetch(`${API_URL}/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await profileRes.json();
      if (data.kyc?.status === 'verified') setIsVerified(true);
    } catch (e) { console.error("Profile fetch error:", e); }
  };

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/wallet/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.transactions || []);
      }
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (!token) return;
    fetchWallet();
    fetchHistory();
  }, [token]);

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

  // A11Y-03: Escape key handler for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDepositModalOpen) setIsDepositModalOpen(false);
        if (isWithdrawModalOpen) setIsWithdrawModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isDepositModalOpen, isWithdrawModalOpen]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/wallet/deposit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        // BUG-04: Send as number
        body: JSON.stringify({ amount: parseFloat(depositAmount) })
      });
      if (res.ok) {
        toast.success(`Successfully deposited ₱${depositAmount}`);
        setDepositAmount("");
        setIsDepositModalOpen(false);
        fetchWallet();
        fetchHistory();
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

    // EDGE-03: Client-side balance check
    if (parseFloat(withdrawAmount) > parseFloat(balance)) {
      toast.error("Insufficient balance for this withdrawal.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        // BUG-04: Send as number
        body: JSON.stringify({ amount: parseFloat(withdrawAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully withdrew ₱${withdrawAmount} to bank`);
        setWithdrawAmount("");
        setIsWithdrawModalOpen(false);
        fetchWallet();
        fetchHistory();
      } else { toast.error(data.error || "Withdrawal failed"); }
    } catch (e) { toast.error("Server error"); }
  };

  return (
    <div ref={containerRef} className="min-h-screen pt-4 sm:pt-8 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 w-full max-w-[1600px] mx-auto">
      
      <div className="wallet-header flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 lg:mb-16 gap-6 sm:gap-8 border-b border-dark-border pb-6 sm:pb-8">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-primary/10 rounded-3xl border border-primary/20 text-primary shrink-0 relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <WalletIcon className="w-10 h-10 relative z-10" />
            </div>
            <div>
               <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">
                  Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-900">Wallet</span>
               </h1>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        <div className="xl:col-span-8 flex flex-col gap-12">
          
          <DynamicCard hoverEffect={true} delay={0.1} className="wallet-card p-6 sm:p-10 md:p-12 lg:p-16 min-h-[280px] sm:min-h-[350px] md:min-h-[400px] flex flex-col justify-between overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.02] pointer-events-none md:translate-x-1/4 -translate-y-1/4">
               <WalletIcon className="w-full h-full -rotate-12" />
            </div>

            <div className="relative z-10">
              <h2 className="text-primary font-bold tracking-widest text-sm mb-6 uppercase flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 Available Balance
              </h2>
              <div className="wallet-balance text-fluid-balance font-black text-white tracking-tighter mb-8 sm:mb-12 md:mb-16 leading-none flex items-start">
                <span className="text-text-muted font-light mr-2 sm:mr-4 text-2xl sm:text-4xl md:text-6xl mt-1 sm:mt-2 block">₱</span>
                {Number(balance).toLocaleString().split('').map((char, index) => (
                    <span key={index} className="inline-block">{char}</span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-3/4">
                <NeonButton onClick={() => { setDepositAmount(""); setIsDepositModalOpen(true); }} className="flex-1 text-sm md:text-base !py-6 tracking-widest uppercase" aria-haspopup="dialog">
                  <ArrowDownLeft className="w-5 h-5 mr-3" /> Deposit Funds
                </NeonButton>
                <NeonButton 
                  onClick={() => {
                    if (!isVerified) {
                      toast.error("AML Verification Required.");
                      router.push("/kyc");
                    } else {
                      setWithdrawAmount("");
                      setIsWithdrawModalOpen(true);
                    }
                  }} 
                  variant="secondary" 
                  className="flex-1 text-sm md:text-base !py-6 tracking-widest uppercase hover:border-white"
                  aria-haspopup="dialog"
                >
                  <ArrowUpRight className="w-5 h-5 mr-3" /> Withdraw Funds
                </NeonButton>
              </div>
            </div>
          </DynamicCard>

          <div className="wallet-card bg-gradient-to-r from-primary/[0.05] to-transparent border border-primary/20 rounded-[2rem] p-10 flex flex-col md:flex-row items-start gap-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
            <div className="p-5 bg-primary/10 rounded-2xl border border-primary/20 text-primary shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl text-white font-black tracking-tight mb-3 uppercase">Bank-Grade Security</h3>
              <p className="text-text-muted leading-relaxed font-medium text-lg">
                Your funds are securely encrypted and protected by our advanced escrow protocol. We enforce strict compliance to prohibit unauthorized withdrawals.
              </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 h-full flex flex-col">
          <DynamicCard delay={0.2} className="wallet-card h-full flex flex-col p-10">
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-dark-border">
              <h3 className="text-sm font-black text-text-muted tracking-widest uppercase">Transaction History</h3>
              <History className="w-4 h-4 text-text-muted" />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mt-4 space-y-3" data-lenis-prevent>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40 h-full">
                   <div className="w-20 h-20 rounded-full border border-dashed border-text-muted flex items-center justify-center mb-6">
                      <History className="w-8 h-8 text-text-muted" />
                   </div>
                   <p className="text-text-muted font-bold uppercase tracking-widest text-sm mb-2">No Transactions Yet</p>
                   <p className="text-xs text-text-muted/60 text-center uppercase tracking-wider font-semibold max-w-[200px]">Your transaction history will be displayed here.</p>
                </div>
              ) : (
                history.map((tx: any) => {
                   const isPositive = Number(tx.amount) > 0;
                   return (
                      <div key={tx.id} className="p-4 bg-dark-bg border border-dark-border rounded-xl flex items-center justify-between group hover:border-primary/30 transition-colors">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isPositive ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-white/5 border-white/10 text-white'}`}>
                               {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                            </div>
                            <div>
                               <p className="text-white font-bold text-sm tracking-tight">{tx.description}</p>
                               <p className="text-xs text-text-muted mt-1">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className={`font-black tracking-tight ${isPositive ? 'text-primary' : 'text-white'}`}>
                               {isPositive ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-text-muted font-medium mt-1 uppercase tracking-widest">Bal: ₱{Number(tx.balance).toLocaleString()}</p>
                         </div>
                      </div>
                   );
                })
              )}
            </div>
          </DynamicCard>
        </div>
      </div>

      {/* Deposit Modal — A11Y-03: Escape + role + data-lenis-prevent */}
      {isDepositModalOpen && (
         <div ref={modalDepositRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Deposit Funds" data-lenis-prevent>
            <div className="absolute inset-0 bg-dark-bg/90 backdrop-blur-xl" onClick={() => setIsDepositModalOpen(false)} />
            <div className="bg-dark-panel border border-dark-border p-12 rounded-[2.5rem] max-w-lg shadow-2xl relative z-10 w-full transform will-change-transform" onClick={e => e.stopPropagation()}>
               <button className="absolute top-8 right-8 text-text-muted hover:text-white transition-colors bg-white/5 p-2 rounded-full" onClick={() => setIsDepositModalOpen(false)} aria-label="Close deposit modal">
                  <X className="w-5 h-5" />
               </button>
               <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Deposit Funds</h2>
               <p className="text-text-muted mb-10 font-medium">Add fiat capital into your Midly Wallet.</p>
               <form onSubmit={handleDeposit} className="space-y-8">
                  <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-white font-light">₱</span>
                  <input 
                     id="deposit-amount"
                     type="number" 
                     value={depositAmount} 
                     onChange={(e) => setDepositAmount(e.target.value)} 
                     required min="100" 
                     placeholder="0.00" 
                     autoFocus
                     className="w-full bg-dark-bg border border-dark-border rounded-3xl py-8 pl-20 pr-8 text-white focus:outline-none focus:border-primary/50 text-5xl font-black tracking-tighter transition-all shadow-inner" 
                  />
                  </div>
                  <NeonButton type="submit" className="w-full justify-center text-lg !py-6 tracking-widest uppercase">CONFIRM DEPOSIT</NeonButton>
               </form>
            </div>
         </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
         <div ref={modalWithdrawRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Withdraw Funds" data-lenis-prevent>
            <div className="absolute inset-0 bg-dark-bg/90 backdrop-blur-xl" onClick={() => setIsWithdrawModalOpen(false)} />
            <div className="bg-dark-panel border border-dark-border p-12 rounded-[2.5rem] max-w-lg shadow-2xl relative z-10 w-full transform will-change-transform" onClick={e => e.stopPropagation()}>
               <button className="absolute top-8 right-8 text-text-muted hover:text-white transition-colors bg-white/5 p-2 rounded-full" onClick={() => setIsWithdrawModalOpen(false)} aria-label="Close withdraw modal">
                  <X className="w-5 h-5" />
               </button>
               <h2 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Withdraw Funds</h2>
               
               <div className="flex justify-between items-center mb-10 bg-dark-bg p-5 rounded-2xl border border-dark-border">
                  <span className="text-text-muted text-xs uppercase font-bold tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Accessible Balance</span>
                  <span className="text-white font-black tracking-tight text-xl">₱{Number(balance).toLocaleString()}</span>
               </div>

               <form onSubmit={handleWithdraw} className="space-y-8">
                  <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-white font-light">₱</span>
                  <input 
                     id="withdraw-amount"
                     type="number" 
                     value={withdrawAmount} 
                     onChange={(e) => setWithdrawAmount(e.target.value)} 
                     required min="100"
                     max={parseFloat(balance)}
                     placeholder="0.00" 
                     autoFocus
                     className="w-full bg-dark-bg border border-dark-border rounded-3xl py-8 pl-20 pr-8 text-white focus:outline-none focus:border-white text-5xl font-black tracking-tighter transition-all shadow-inner" 
                  />
                  </div>
                  {parseFloat(withdrawAmount) > parseFloat(balance) && (
                    <p className="text-red-500 text-sm font-medium" role="alert">Insufficient balance</p>
                  )}
                  <NeonButton type="submit" variant="secondary" className="w-full justify-center text-lg !py-6 tracking-widest uppercase hover:border-white" disabled={parseFloat(withdrawAmount) > parseFloat(balance)}>PROCESS WITHDRAWAL</NeonButton>
               </form>
            </div>
         </div>
      )}
    </div>
  );
}
