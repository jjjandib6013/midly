"use client";
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, Mail, Info, Calculator, ArrowRight, ArrowLeft, ShieldAlert, LockKeyhole, Search, CheckCircle2, UserCircle2, Box, Zap, Coins, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { API_URL } from "@/lib/api";

type TradeCategory = "Game Account" | "In-Game Item" | "Service/Boosting" | "Currency";

export default function CreateTradeWizard() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const sessionEmail = (session as any)?.user?.email;

  const router = useRouter();
  
  // Wizard State
  const [step, setStep] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Form State
  const [role, setRole] = useState<"BUY" | "SELL">("BUY");
  const [tradeCategory, setTradeCategory] = useState<TradeCategory>("Game Account");
  const [gameType, setGameType] = useState("Valorant");
  const [itemDescription, setItemDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  
  // Dynamic Asset Metadata State
  const [assetMetadata, setAssetMetadata] = useState<Record<string, any>>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  
  // KYC State
  const [isVerified, setIsVerified] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
    if (containerRef.current) {
        gsap.fromTo(containerRef.current, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" });
    }
  }, [step]);

  const games = ['Valorant', 'CS2', 'Dota 2', 'Mobile Legends', 'Roblox', 'Clash of Clans', 'Call of Duty Mobile', 'Crossfire', 'Steam Account'];
  
  const categoryIcons: Record<TradeCategory, any> = {
      "Game Account": UserCircle2,
      "In-Game Item": Box,
      "Service/Boosting": Zap,
      "Currency": Coins
  };

  const blockedItemGames = ['Valorant', 'Mobile Legends', 'CS2', 'Dota 2', 'Steam Account'];
  const categories: TradeCategory[] = (["Game Account", "In-Game Item", "Service/Boosting", "Currency"] as TradeCategory[]).filter(c => {
      if (c === "In-Game Item" && blockedItemGames.includes(gameType)) return false;
      return true;
  });

  useEffect(() => {
      if (tradeCategory === "In-Game Item" && blockedItemGames.includes(gameType)) {
          setTradeCategory("Game Account");
      }
  }, [gameType, tradeCategory]);

  const parsedAmount = parseFloat(amount.replace(/,/g, '')) || 0;
  const serviceFee = parsedAmount * 0.05;
  const buyerTotal = parsedAmount + serviceFee;
  const sellerReceives = parsedAmount;

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  // AIL Intelligent Checks
  const hasCriticalRisk = () => {
     const text = (itemDescription + " " + JSON.stringify(assetMetadata)).toLowerCase();
     return ['hacked', 'cracked', 'stolen', 'pulled', 'carded'].some(kw => text.includes(kw));
  };

  const hasHighRisk = () => {
     if (tradeCategory === 'Game Account') {
         const emailStatus = assetMetadata.linked_email_status || '';
         if (emailStatus !== 'Original' && emailStatus !== 'Original (OGE)') return true;
     }
     return false;
  };

  const executeContract = async () => {
    setIsProcessing(true);
    setError("");

    if (sessionEmail && email.toLowerCase() === sessionEmail.toLowerCase()) {
      setError("You cannot create a trade with yourself.");
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
          itemCategory: gameType,
          itemDescription: itemDescription,
          tradeCategory,
          agreedPrice: parsedAmount,
          sellerEmail: email,
          assetMetadata
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create escrow contract.");

      toast.success(`Escrow Invitation sent to ${email}.`);
      router.push(`/dashboard`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingProfile) {
      return (
          <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
              <div className="w-10 h-10 border-4 border-dark-border border-t-primary rounded-full animate-spin" />
          </div>
      );
  }

  if (!isVerified) {
      return (
         <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
             <div className="max-w-md w-full bg-dark-panel border border-dark-border rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-20 h-20 bg-dark-border rounded-full flex items-center justify-center mx-auto mb-6 text-text-muted">
                    <LockKeyhole className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Verification Required</h2>
                <p className="text-text-muted mb-8">
                   You must verify your identity before accessing the Escrow Smart Vault.
                </p>
                <button 
                  onClick={() => router.push('/kyc')}
                  className="w-full bg-primary text-white py-4 rounded-xl font-semibold hover:bg-primary/90 transition-all cursor-pointer"
                >
                   Verify Identity Now
                </button>
            </div>
         </div>
      );
  }

  return (
    <div className="flex-1 w-full max-w-[1000px] mx-auto px-4 py-8 lg:py-12">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" /> Secure Mathematical P2P Trading
        </div>
        <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 tracking-tight">Escrow Initialization</h1>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">Build an unbreakable smart-contract to secure your transaction. Funds remain locked until conditions are physically met.</p>
        
        {/* Stepper */}
        <div className="flex items-center justify-center max-w-2xl mx-auto mt-12 gap-4">
            {[1, 2, 3, 4].map(s => (
                <div key={s} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step === s ? 'bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.3)] ring-4 ring-primary/20' : step > s ? 'bg-primary/20 text-primary' : 'bg-dark-border text-text-muted'}`}>
                        {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                    {s < 4 && <div className={`w-12 sm:w-20 h-1 rounded-full mx-2 transition-colors duration-300 ${step > s ? 'bg-primary/40' : 'bg-dark-border'}`} />}
                </div>
            ))}
        </div>
      </div>

      <div ref={containerRef} className="bg-dark-panel/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3 font-medium">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {/* STEP 1: CATEGORY & GAME */}
        {step === 1 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Your Role in this Trade</h2>
              <div className="flex bg-dark-bg/50 p-1.5 rounded-2xl border border-white/5 ring-1 ring-white/5 mb-8">
                  <button
                      onClick={() => setRole("BUY")}
                      className={`flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer ${role === "BUY" ? "bg-dark-border text-white shadow-md shadow-black/50" : "text-text-muted hover:text-white"}`}
                  >
                      I AM BUYING
                  </button>
                  <button
                      onClick={() => setRole("SELL")}
                      className={`flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer ${role === "SELL" ? "bg-dark-border text-white shadow-md shadow-black/50" : "text-text-muted hover:text-white"}`}
                  >
                      I AM SELLING
                  </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Asset Classification</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map(cat => {
                   const Icon = categoryIcons[cat];
                   return (
                   <button
                     key={cat}
                     onClick={() => setTradeCategory(cat)}
                     className={`p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer flex flex-col gap-3 group hover:-translate-y-1 ${tradeCategory === cat ? 'bg-primary/10 border-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.1)] ring-1 ring-primary/50' : 'bg-dark-bg/60 border-white/5 text-text-muted hover:border-white/20 hover:bg-dark-bg hover:text-white'}`}
                   >
                       <div className={`p-3 rounded-xl w-fit transition-colors duration-300 ${tradeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-text-muted group-hover:bg-white/10 group-hover:text-white'}`}>
                           <Icon className="w-6 h-6" />
                       </div>
                       <div>
                           <div className="font-semibold mb-1 text-base tracking-wide">{cat}</div>
                           <div className="text-xs opacity-70 leading-relaxed">
                               {cat === 'Game Account' && 'Full ownership transfer with mandatory recovery block.'}
                               {cat === 'In-Game Item' && 'Skin or item delivery verification via live tracking.'}
                               {cat === 'Service/Boosting' && 'Milestone-based progressive release tracking.'}
                               {cat === 'Currency' && 'Direct transfer or automated gift card validation.'}
                           </div>
                       </div>
                   </button>
                   );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Game / Platform</h2>
              <div className="relative group">
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value)}
                    className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all cursor-pointer appearance-none hover:bg-dark-bg/80"
                  >
                    {games.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-white transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
              </div>
            </div>

            <div className="pt-8 flex justify-end">
                <button onClick={handleNext} className="bg-white text-black px-8 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-white/10 cursor-pointer flex items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}

        {/* STEP 2: DYNAMIC METADATA */}
        {step === 2 && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white mb-4">Contextual Intelligence</h2>
            
            {/* AIL Overlay Hints */}
            {hasCriticalRisk() && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-1">AIL Warning: High-Risk Syntax Detected</span>
                        Your description contains keywords associated with stolen or cracked assets. This escrow will require manual admin clearance.
                    </div>
                </div>
            )}

            {gameType === 'Valorant' && (itemDescription.toLowerCase().includes('fa') || itemDescription.toLowerCase().includes('oge')) && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-0.5">Detected Full Access (FA/OGE)</span>
                        Providing the original email ensures the fastest escrow payout and highest trust score.
                    </div>
                </div>
            )}

            {gameType === 'CS2' && tradeCategory === 'Game Account' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-sm flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-0.5">Anti-Scam Advisory</span>
                        Beware of API Scams. Midly bots will never ask you to trade items to a different account first. Always verify the bot's registration date.
                    </div>
                </div>
            )}

            {role === 'SELL' && gameType === 'Roblox' && tradeCategory === 'Game Account' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-sm flex items-start gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-0.5">Poisoned Limiteds Warning</span>
                        If this account contains high-value limiteds, you may be asked to provide Rolimons proof of clean item history during the escrow inspection phase.
                    </div>
                </div>
            )}

            <div className="space-y-3">
               <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">{role === 'BUY' ? 'General Description (What do you want to buy?)' : 'Asset Description'}</label>
               <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder={role === 'BUY' ? "Describe the asset you are looking to buy in detail..." : "Detailed description of the asset..."}
                  className="w-full bg-dark-bg/40 border border-white/5 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all resize-none h-32 hover:bg-dark-bg/60"
               />
            </div>

            {/* Dynamic Fields based on Category */}
            {role === 'SELL' && (
            <div className="p-6 border border-white/5 rounded-3xl bg-dark-bg/30 backdrop-blur-md space-y-6">
               {tradeCategory === 'Game Account' && (
                  <>
                     <div className="space-y-3">
                         <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Linked Email Status (Crucial)</label>
                         <div className="relative group">
                             <select
                                onChange={(e) => setAssetMetadata({...assetMetadata, linked_email_status: e.target.value})}
                                className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all cursor-pointer appearance-none hover:bg-dark-bg/80"
                             >
                                <option value="">Select Status...</option>
                                <option value="Original (OGE)">Original Email (Full Access)</option>
                                <option value="Changed">Changed Email</option>
                                <option value="Dead/Lost">Lost/Dead Email</option>
                             </select>
                             <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover:text-white transition-colors">
                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                             </div>
                         </div>
                         <p className="text-xs text-text-muted mt-2 ml-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> Original email is required for fast-track escrow.</p>
                     </div>

                     {/* Valorant Specifics */}
                     {gameType === 'Valorant' && (
                         <div className="grid grid-cols-2 gap-5">
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Riot ID</label>
                                 <input type="text" onChange={(e) => setAssetMetadata({...assetMetadata, riot_id: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" placeholder="Name#TAG" />
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Region</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, region: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="">Select...</option>
                                         <option value="NA">NA</option>
                                         <option value="EU">EU</option>
                                         <option value="AP">AP</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">VP Spent</label>
                                 <input type="number" onChange={(e) => setAssetMetadata({...assetMetadata, vp_spent: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Premium Skins Count</label>
                                 <input type="number" onChange={(e) => setAssetMetadata({...assetMetadata, skins_count: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                         </div>
                     )}

                     {/* CS2 Specifics */}
                     {gameType === 'CS2' && (
                         <div className="grid grid-cols-2 gap-5">
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Steam ID64</label>
                                 <input type="text" onChange={(e) => setAssetMetadata({...assetMetadata, steam_id64: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Prime Status</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, prime_status: e.target.value === 'true'})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="false">No Prime</option>
                                         <option value="true">Prime Enabled</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">VAC Status</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, vac_status: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="Clean">Clean</option>
                                         <option value="Banned">Banned</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">FaceIT Elo</label>
                                 <input type="number" onChange={(e) => setAssetMetadata({...assetMetadata, faceit_elo: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                         </div>
                     )}

                     {/* Roblox Specifics */}
                     {gameType === 'Roblox' && (
                         <div className="grid grid-cols-2 gap-5">
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Age Verified</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, age_verified: e.target.value === 'true'})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="false">No</option>
                                         <option value="true">Yes</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Voice Chat</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, vc_enabled: e.target.value === 'true'})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="false">Disabled</option>
                                         <option value="true">Enabled</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5 col-span-2">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Robux Balance / Limiteds Value</label>
                                 <input type="text" onChange={(e) => setAssetMetadata({...assetMetadata, robux_balance: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                         </div>
                     )}

                     {/* MLBB Specifics */}
                     {gameType === 'Mobile Legends' && (
                         <div className="grid grid-cols-2 gap-5">
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Moonton Status</label>
                                 <div className="relative group">
                                     <select onChange={(e) => setAssetMetadata({...assetMetadata, moonton_status: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80">
                                         <option value="Clean">Clean/Unbound</option>
                                         <option value="Bound">Bound</option>
                                     </select>
                                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                                 </div>
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Max Emblems Count</label>
                                 <input type="number" onChange={(e) => setAssetMetadata({...assetMetadata, max_emblems: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                             <div className="space-y-2.5 col-span-2">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Total Heroes</label>
                                 <input type="number" onChange={(e) => setAssetMetadata({...assetMetadata, hero_count: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                         </div>
                     )}

                     {/* Generic fields for other games */}
                     {!['Valorant', 'CS2', 'Roblox', 'Mobile Legends'].includes(gameType) && (
                         <div className="grid grid-cols-2 gap-5">
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Current Rank / Level</label>
                                 <input type="text" onChange={(e) => setAssetMetadata({...assetMetadata, current_rank: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                             <div className="space-y-2.5">
                                 <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Region / Server</label>
                                 <input type="text" onChange={(e) => setAssetMetadata({...assetMetadata, region: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                             </div>
                         </div>
                     )}
                  </>
               )}
               {tradeCategory === 'Service/Boosting' && (
                  <>
                     <div className="space-y-3">
                         <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Service Type</label>
                         <div className="relative group">
                             <select
                                onChange={(e) => setAssetMetadata({...assetMetadata, service_type: e.target.value})}
                                className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80"
                             >
                                <option value="">Select...</option>
                                <option value="Piloting (Account Sharing)">Piloting</option>
                                <option value="Duo/Party (Self-Play)">Duo/Party</option>
                                <option value="Coaching">Coaching</option>
                             </select>
                             <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                         </div>
                     </div>
                     <p className="text-xs text-primary bg-primary/10 border border-primary/20 p-3.5 rounded-xl flex items-start gap-2"><Info className="w-4 h-4 flex-shrink-0 mt-0.5"/> Services automatically use Milestone Escrow tracking (25% Commencement, 75% Completion).</p>
                  </>
               )}
               {tradeCategory === 'In-Game Item' && (
                  <div className="space-y-3">
                     <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Tradability Status</label>
                     <div className="relative group">
                         <select
                            onChange={(e) => setAssetMetadata({...assetMetadata, tradability: e.target.value})}
                            className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none hover:bg-dark-bg/80"
                         >
                            <option value="Instant Trade">Instant Trade</option>
                            <option value="Trade Locked">Trade Locked (Cooldown)</option>
                         </select>
                         <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg></div>
                     </div>
                  </div>
               )}
               {tradeCategory === 'Currency' && (
                  <div className="space-y-3">
                     <label className="text-xs uppercase tracking-wider font-semibold text-text-muted block ml-1">Delivery Method</label>
                     <input type="text" placeholder="e.g., Gift Card Code, In-game mail" onChange={(e) => setAssetMetadata({...assetMetadata, delivery_method: e.target.value})} className="w-full bg-dark-bg/50 border border-white/5 text-white rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-dark-bg/80" />
                  </div>
               )}
            </div>
            )}

            <div className="pt-8 flex justify-between">
                <button onClick={handleBack} className="text-text-muted hover:text-white px-4 py-3 font-semibold transition-colors cursor-pointer flex items-center gap-2 hover:-translate-x-1 duration-200">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleNext} disabled={!itemDescription} className="bg-white text-black px-8 py-3.5 rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-white/10 cursor-pointer flex items-center gap-2">
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}

        {/* STEP 3: COUNTERPARTY & PRICING */}
        {step === 3 && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white mb-4">Financials & Routing</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted block">Agreed Valuation (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold tracking-wider">₱</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-dark-bg/50 border border-dark-border text-white rounded-xl pl-10 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted block">Counterparty Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      className="w-full bg-dark-bg/50 border border-dark-border text-white rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
            </div>

            <div className="pt-8 flex justify-between">
                <button onClick={handleBack} className="text-text-muted hover:text-white px-4 py-3 font-semibold transition-colors cursor-pointer flex items-center gap-2 hover:-translate-x-1 duration-200">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={handleNext} disabled={!amount || !email} className="bg-white text-black px-8 py-3.5 rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-lg shadow-white/10 cursor-pointer flex items-center gap-2">
                    Review Contract <ArrowRight className="w-4 h-4" />
                </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {step === 4 && (
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white mb-4">Intelligent Contract Review</h2>
            
            {hasHighRisk() && (
                <div className="p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-yellow-500 text-sm flex items-start gap-3 shadow-lg shadow-yellow-500/5">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold block mb-1">Risk Advisory</span>
                        You are initiating a Game Account trade without the Original Email. A mandatory 7-day cooldown will be strictly enforced before payout can be released to protect against recovery scams.
                    </div>
                </div>
            )}

            <div className="bg-dark-bg/40 backdrop-blur-md rounded-3xl border border-white/10 p-8 space-y-6 shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                    <div>
                        <div className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-1">{gameType} • {tradeCategory}</div>
                        <div className="text-white font-medium text-lg truncate max-w-sm">{itemDescription || 'No description provided'}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-1">Contract Role</div>
                        <div className="text-white font-bold text-lg bg-dark-border px-3 py-1 rounded-lg inline-block">{role === 'BUY' ? 'Buyer' : 'Seller'}</div>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="flex justify-between text-base">
                        <span className="text-text-muted font-medium">Asset Valuation</span>
                        <span className="text-white font-medium font-mono">₱{parsedAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                        <span className="text-text-muted font-medium flex items-center gap-1">Network Fee (5%)</span>
                        <span className="text-white font-medium font-mono">₱{serviceFee.toFixed(2)}</span>
                    </div>
                    
                    <div className="pt-6 border-t border-white/10 border-dashed flex justify-between items-center">
                        <span className="text-white font-bold text-lg uppercase tracking-wider">{role === 'BUY' ? 'Total Required' : 'Net Payout'}</span>
                        <span className="text-3xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)] font-mono">
                            ₱{role === 'BUY' ? buyerTotal.toFixed(2) : sellerReceives.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="pt-8 flex justify-between items-center">
                <button onClick={handleBack} disabled={isProcessing} className="text-text-muted hover:text-white px-4 py-3 font-semibold transition-colors cursor-pointer flex items-center gap-2 hover:-translate-x-1 duration-200">
                    <ArrowLeft className="w-4 h-4" /> Edit Contract
                </button>
                <button 
                  onClick={executeContract} 
                  disabled={isProcessing}
                  className="bg-primary text-white px-10 py-4 rounded-xl font-bold hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)] disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-3"
                >
                    {isProcessing ? 'Deploying to Vault...' : 'Deploy Smart Escrow'} <CheckCircle2 className="w-5 h-5" />
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
