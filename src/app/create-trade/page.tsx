"use client";
import { useSession } from 'next-auth/react';
import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, Mail, Info, Calculator, ArrowRight, ShieldAlert, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { API_URL } from "@/lib/api";
import { CreateTradeSchema } from "@/lib/validations";

export default function CreateTrade() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;
   const sessionEmail = (session as any)?.user?.email;

  const router = useRouter();
  const [role, setRole] = useState<"BUY" | "SELL">("BUY");
  const [tradeType, setTradeType] = useState("Game Account");
  const [category, setCategory] = useState("VALORANT");
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  // KYC Lock State
  const [isVerified, setIsVerified] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/user/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        setIsVerified(data.kyc?.status === 'verified');
        setIsLoadingProfile(false);
    })
    .catch(() => setIsLoadingProfile(false));
  }, [token]);

  useGSAP(() => {
    if (!isLoadingProfile && isVerified) {
       gsap.fromTo(containerRef.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
    }
    if (!isLoadingProfile && !isVerified) {
       gsap.fromTo(lockRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.2)" });
    }
  }, [isLoadingProfile, isVerified]);

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

    // EDGE-02: Prevent self-trade
    if (sessionEmail && email.toLowerCase() === sessionEmail.toLowerCase()) {
      setError("You cannot create a trade with yourself.");
      toast.error("You cannot create a trade with yourself.");
      setIsProcessing(false);
      return;
    }

    // SEC-01: Zod validation
    const validation = CreateTradeSchema.safeParse({
      role, tradeType, category, item, amount: parsedAmount, email
    });
    if (!validation.success) {
      const firstError = validation.error?.issues?.[0]?.message || "Invalid input";
      toast.error(firstError);
      setError(firstError);
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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
    } finally {
      // BUG-02: Always re-enable button
      setIsProcessing(false);
    }
  };

  if (isLoadingProfile) {
      return (
          <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
              <div className="w-10 h-10 rounded-full border-4 border-dark-border border-t-primary animate-spin" role="status" aria-label="Loading"/>
          </div>
      );
  }

  if (!isVerified) {
      return (
         <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
            <div ref={lockRef} className="max-w-md w-full bg-dark-panel border border-dark-border rounded-3xl p-8 shadow-2xl text-center" role="alert">
                <div className="w-20 h-20 bg-dark-border rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted">
                    <LockKeyhole className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold font-sans text-white mb-4">Verification Required</h2>
                <p className="text-text-muted mb-8">
                   To protect the integrity of the escrow network and comply with anti-fraud regulations, you must verify your identity before creating a trade.
                </p>
                <button 
                  onClick={() => router.push('/kyc')}
                  className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 transition-all"
                >
                   Verify Identity Now
                </button>
            </div>
         </div>
      );
  }

  return (
    <div ref={containerRef} className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-12 font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">
          Initialize Transfer
        </h1>
        <p className="text-text-muted text-base max-w-xl">Create a secure escrow contract bridging two parties. Funds will be mathematically secured until trade terms are physically verified.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-dark-panel border border-dark-border rounded-3xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">Contract Specifications</h2>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm flex items-center gap-3 font-medium" role="alert">
                <ShieldAlert className="w-5 h-5" /> {error}
              </div>
            )}

            <div className="space-y-8">
              <fieldset>
                <legend className="text-sm font-medium text-text-muted mb-3 block">Your Position</legend>
                <div className="flex bg-dark-bg p-1.5 rounded-xl border border-white/5 shadow-inner" role="radiogroup" aria-label="Trade position">
                  <button
                    onClick={() => setRole("BUY")}
                    role="radio"
                    aria-checked={role === "BUY"}
                    className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${role === "BUY" ? "bg-dark-border text-white shadow-sm" : "text-text-muted hover:text-white"}`}
                  >
                    I AM BUYING
                  </button>
                  <button
                    onClick={() => setRole("SELL")}
                    role="radio"
                    aria-checked={role === "SELL"}
                    className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${role === "SELL" ? "bg-dark-border text-white shadow-sm" : "text-text-muted hover:text-white"}`}
                  >
                    I AM SELLING
                  </button>
                </div>
              </fieldset>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="trade-type" className="text-sm font-medium text-text-muted block">Asset Classification</label>
                  <select
                    id="trade-type"
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    className="w-full bg-dark-bg shadow-inner border border-dark-border text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {tradeTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="trade-category" className="text-sm font-medium text-text-muted block">Platform</label>
                  <select
                    id="trade-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-dark-bg shadow-inner border border-dark-border text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="trade-description" className="text-sm font-medium text-text-muted block">Asset Description</label>
                <textarea
                  id="trade-description"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="E.g., Radiant Account with Protocol Bundle"
                  className="w-full bg-dark-bg border border-white/10 text-white rounded-xl px-4 py-4 focus:outline-none focus:border-primary/50 transition-colors resize-none h-28 shadow-inner"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="trade-amount" className="text-sm font-medium text-text-muted block">Agreed Valuation (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold tracking-wider">₱</span>
                    <input
                      id="trade-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      max="1000000"
                      className="w-full bg-dark-bg border border-white/10 text-white rounded-xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="trade-email" className="text-sm font-medium text-text-muted block">Counterparty Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                      id="trade-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      className="w-full bg-dark-bg border border-white/10 text-white rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                      required
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-dark-panel border border-dark-border rounded-3xl p-8 sticky top-24">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center justify-between">
              Order Summary
              <Calculator className="w-5 h-5 text-text-muted" />
            </h3>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Asset Valuation</span>
                <span className="text-white font-medium">₱{parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted flex items-center gap-1">
                  Escrow Fee (5%)
                  <Info className="w-3 h-3" />
                </span>
                <span className="text-white font-medium">₱{serviceFee.toFixed(2)}</span>
              </div>
              
              <div className="pt-4 border-t border-dark-border">
                {isBuyer ? (
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Total Debit</span>
                    <span className="text-2xl font-bold text-primary">₱{buyerTotal.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-white font-semibold">Net Payout</span>
                    <span className="text-2xl font-bold text-primary">₱{sellerReceives.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <button
               onClick={handleCreate}
               disabled={isProcessing || parsedAmount <= 0 || !email || !item.trim()}
               aria-busy={isProcessing}
               className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
               {isProcessing ? (
                   <span className="flex items-center gap-2">
                       <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" role="status" aria-label="Processing"/> Processing...
                   </span>
               ) : (
                   <>
                       Execute Contract <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </>
               )}
            </button>
            <p className="text-center text-xs text-text-muted mt-4 flex items-center justify-center gap-1.5">
               <ShieldCheck className="w-3.5 h-3.5" /> Secured by Midly Protocol
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}