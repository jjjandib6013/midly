"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
   Wallet, Clock, Zap, Search, Filter, Box, TrendingUp, ShieldCheck, Activity, Eye, CheckCircle2, AlertTriangle, Send, XCircle, X, PlusCircle, ChevronDown
} from "lucide-react";
import { RowSkeleton } from "@/components/ui/RowSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDelayedSkeleton } from "@/hooks/useDelayedSkeleton";
import { API_URL } from "@/lib/api";
import { useSession } from "next-auth/react";
import ReputationBadge from "@/components/ui/ReputationBadge";
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

const STATUS_MAP: Record<string, { label: string; colorClass: string; bgClass: string; borderClass: string; icon: any }> = {
   pending_invite: { label: "Pending", colorClass: "text-yellow-400", bgClass: "bg-yellow-400/10", borderClass: "border-yellow-400/20", icon: Send },
   agreement: { label: "Agreement", colorClass: "text-[#8892b0]", bgClass: "bg-[#8892b0]/10", borderClass: "border-[#8892b0]/20", icon: ShieldCheck },
   awaiting_payment: { label: "Awaiting Payment", colorClass: "text-orange-400", bgClass: "bg-orange-400/10", borderClass: "border-orange-400/20", icon: Wallet },
   active: { label: "Active", colorClass: "text-primary", bgClass: "bg-primary/10", borderClass: "border-primary/20", icon: Zap },
   verifying: { label: "Verifying", colorClass: "text-purple-400", bgClass: "bg-purple-400/10", borderClass: "border-purple-400/20", icon: Eye },
   completed: { label: "Completed", colorClass: "text-primary", bgClass: "bg-primary/10", borderClass: "border-primary/20", icon: CheckCircle2 },
   disputed: { label: "Disputed", colorClass: "text-red-400", bgClass: "bg-red-400/10", borderClass: "border-red-400/20", icon: AlertTriangle },
   cancelled: { label: "Cancelled", colorClass: "text-[#8892b0]", bgClass: "bg-white/5", borderClass: "border-white/10", icon: XCircle },
   refunded: { label: "Refunded", colorClass: "text-yellow-400", bgClass: "bg-yellow-400/10", borderClass: "border-yellow-400/20", icon: Clock },
};

export default function Dashboard() {
   const { data: session, status } = useSession();
   const router = useRouter();
   const [user, setUser] = useState<any>(null);
   const [trades, setTrades] = useState<Trade[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   
   type TabType = "All" | "Pending" | "Active" | "Verifying" | "Completed" | "Disputed" | "Cancelled";
   const [activeTab, setActiveTab] = useState<TabType>("All");
   const [clearedTabs, setClearedTabs] = useState<Set<string>>(new Set(["All"]));
   const [isListTransitioning, setIsListTransitioning] = useState(false);
   
   // Search State
   const [searchQuery, setSearchQuery] = useState("");
   const [isSearchFocused, setIsSearchFocused] = useState(false);
   const [selectedIndex, setSelectedIndex] = useState(-1);
   const searchContainerRef = useRef<HTMLDivElement>(null);
   
   // Filter State
   const [isFilterOpen, setIsFilterOpen] = useState(false);
   const [dateFilter, setDateFilter] = useState<"all" | "week" | "month">("all");
   const filterContainerRef = useRef<HTMLDivElement>(null);

   // Tab indicator refs
   const tabBarRef = useRef<HTMLDivElement>(null);
   const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
   const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

   const showSkeleton = useDelayedSkeleton(isLoading, 200);
   const containerRef = useRef<HTMLDivElement>(null);

   // Persist cleared tabs in localStorage
   useEffect(() => {
      try {
         const saved = localStorage.getItem('midly_cleared_tabs');
         if (saved) setClearedTabs(new Set(JSON.parse(saved)));
      } catch {}
   }, []);

   const persistClearedTabs = useCallback((tabs: Set<string>) => {
      setClearedTabs(tabs);
      try { localStorage.setItem('midly_cleared_tabs', JSON.stringify([...tabs])); } catch {}
   }, []);

   useEffect(() => {
      // @ts-ignore
      const token = session?.accessToken;
      if (!token) {
         if (status === "unauthenticated") setIsLoading(false);
         return;
      }
      Promise.all([
         fetch(`${API_URL}/api/user/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
         fetch(`${API_URL}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]).then(([p, t]) => {
         setUser(p);
         if (t.trades) setTrades(t.trades);
         setIsLoading(false);
      }).catch(() => setIsLoading(false));
   }, [session, status]);

   // Handle click outside for dropdowns
   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
            setIsSearchFocused(false);
         }
         if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
            setIsFilterOpen(false);
         }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   useGSAP(() => {
      if (isLoading) return;
      const tl = gsap.timeline();
      tl.fromTo(".dash-header", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
        .fromTo(".dash-animate", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: "power2.out" }, "-=0.3");
   }, { scope: containerRef, dependencies: [isLoading] });

   const getMyUserId = () => { 
      const t = (session as any)?.accessToken;
      if (!t) return 0;
      try { return JSON.parse(atob(t.split('.')[1])).user_id; } catch { return 0; } 
   };
   
   const getCounterparty = (t: Trade) => t.buyer_id === getMyUserId() ? t.seller?.first_name || t.seller?.email?.split('@')[0] : t.buyer?.first_name || t.buyer?.email?.split('@')[0];
   const timeAgo = (d: string) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };

   const liveTrades = trades.filter(t => !['completed', 'cancelled', 'refunded'].includes(t.status));
   const escrowAmount = liveTrades.reduce((s, t) => s + Number(t.agreed_price || 0), 0);
   const sorted = [...trades].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

   // Autocomplete / Search logic
   const searchResults = sorted.filter(t => {
      if (!searchQuery) return false;
      const q = searchQuery.toLowerCase();
      const partnerName = getCounterparty(t)?.toLowerCase() || "";
      return (
         (t.item_name || "").toLowerCase().includes(q) ||
         (t.game_type || "").toLowerCase().includes(q) ||
         (t.item_type || "").toLowerCase().includes(q) ||
         (t.status || "").toLowerCase().includes(q) ||
         (t.agreed_price || "").includes(q) ||
         partnerName.includes(q) ||
         t.transaction_id.toString().includes(q)
      );
   }).slice(0, 6); // Limit to 6 results in dropdown

   const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (!searchQuery) return;
      if (e.key === "ArrowDown") {
         e.preventDefault();
         setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
         e.preventDefault();
         setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
         e.preventDefault();
         if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            router.push(`/trade/${searchResults[selectedIndex].transaction_id}`);
         } else if (searchResults.length > 0) {
            router.push(`/trade/${searchResults[0].transaction_id}`);
         }
      } else if (e.key === "Escape") {
         setIsSearchFocused(false);
         setSelectedIndex(-1);
      }
   };

   // Tab & Date Filtering Logic
   const filteredTrades = sorted.filter(t => {
       // Tab Filter
       let matchesTab = true;
       if (activeTab === "Pending") matchesTab = ["pending_invite", "agreement", "awaiting_payment"].includes(t.status);
       if (activeTab === "Active") matchesTab = t.status === "active";
       if (activeTab === "Verifying") matchesTab = t.status === "verifying";
       if (activeTab === "Completed") matchesTab = t.status === "completed";
       if (activeTab === "Disputed") matchesTab = t.status === "disputed";
       if (activeTab === "Cancelled") matchesTab = t.status === "cancelled";
       
       // Date Filter
       let matchesDate = true;
       const txDate = new Date(t.created_at).getTime();
       const now = new Date().getTime();
       if (dateFilter === "week") matchesDate = txDate >= now - (7 * 24 * 60 * 60 * 1000);
       if (dateFilter === "month") matchesDate = txDate >= now - (30 * 24 * 60 * 60 * 1000);

       return matchesTab && matchesDate;
   });

   const counts = {
       All: trades.length,
       Pending: trades.filter(t => ["pending_invite", "agreement", "awaiting_payment"].includes(t.status)).length,
       Active: trades.filter(t => t.status === "active").length,
       Verifying: trades.filter(t => t.status === "verifying").length,
       Completed: trades.filter(t => t.status === "completed").length,
       Disputed: trades.filter(t => t.status === "disputed").length,
       Cancelled: trades.filter(t => t.status === "cancelled").length,
   };

   const completedCount = trades.filter(t => t.status === "completed").length;
   const completionRate = trades.length > 0 ? Math.round((completedCount / trades.length) * 100) : 100;

   // Animate tab indicator position
   useEffect(() => {
      const btn = tabRefs.current[activeTab];
      if (btn && tabBarRef.current) {
         const barRect = tabBarRef.current.getBoundingClientRect();
         const btnRect = btn.getBoundingClientRect();
         setIndicatorStyle({ left: btnRect.left - barRect.left, width: btnRect.width });
      }
   }, [activeTab, isLoading]);

   const handleTabClick = (tab: TabType) => {
      if (tab === activeTab) return;
      setIsListTransitioning(true);
      setActiveTab(tab);
      const next = new Set(clearedTabs).add(tab);
      persistClearedTabs(next);
      // Brief transition for visual feedback
      setTimeout(() => setIsListTransitioning(false), 180);
   };

   const handleDateFilter = (f: "all" | "week" | "month") => {
      setIsListTransitioning(true);
      setDateFilter(f);
      setIsFilterOpen(false);
      setTimeout(() => setIsListTransitioning(false), 180);
   };

   return (
      <div className="min-h-screen bg-transparent text-white w-full overflow-hidden">
         <div ref={containerRef} className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-10">
         
         {/* Top Header */}
         <div className="dash-header flex flex-col md:flex-row items-start md:items-end justify-between mb-8 sm:mb-12 gap-6 border-b border-white/[0.04] pb-6 sm:pb-8">
            <div>
               {showSkeleton ? (
                  <Skeleton className="h-12 sm:h-14 w-64 sm:w-80 bg-white/5" />
               ) : (
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                     Hi, <span className="text-[#8892b0]">{user?.first_name || 'there'}</span>
                  </h1>
               )}
            </div>
            <Link href="/create-trade" className="w-full sm:w-auto">
               <NeonButton className="gap-3 w-full sm:w-auto !py-3.5 tracking-widest uppercase text-xs">
                  <PlusCircle className="w-4 h-4" /> New Trade
               </NeonButton>
            </Link>
         </div>

         {/* Top Metrics Row */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Available Balance */}
            <div className="dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold text-[#8892b0] uppercase tracking-widest">Available Balance</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                     <Wallet className="w-5 h-5" />
                  </div>
               </div>
               {showSkeleton ? <Skeleton className="h-10 w-32 mb-2 bg-white/5" /> : (
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight flex items-baseline gap-1 text-white">
                     <span className="text-2xl text-primary">₱</span>
                     {Number(user?.wallet_balance || 0).toLocaleString()}
                  </h2>
               )}
               <p className="text-sm font-medium text-[#8892b0] mt-2">Ready to trade</p>
            </div>

            {/* In Escrow */}
            <div className="dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold text-[#8892b0] uppercase tracking-widest">In Escrow</span>
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20">
                     <Clock className="w-5 h-5" />
                  </div>
               </div>
               {showSkeleton ? <Skeleton className="h-10 w-32 mb-2 bg-white/5" /> : (
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight flex items-baseline gap-1 text-white">
                     <span className="text-2xl text-[#8892b0]">₱</span>
                     {escrowAmount.toLocaleString()}
                  </h2>
               )}
               <p className="text-sm font-medium text-[#8892b0] mt-2">Protected transactions</p>
            </div>

            {/* Active Trades */}
            <div className="dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-8 flex flex-col justify-between border border-white/5 relative overflow-hidden group">
               <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold text-[#8892b0] uppercase tracking-widest">Active Trades</span>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                     <Zap className="w-5 h-5" />
                  </div>
               </div>
               {showSkeleton ? <Skeleton className="h-10 w-16 mb-2 bg-white/5" /> : (
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight flex items-baseline gap-1 text-white">
                     {liveTrades.length}
                  </h2>
               )}
               <p className="text-sm font-medium text-[#8892b0] mt-2">Ongoing transactions</p>
            </div>

         </div>

         {/* Main Content Grid */}
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column (Trades List) */}
            <div className="xl:col-span-8 dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/5 flex flex-col">
               
               <div className="mb-6 sm:mb-8">
                  <h3 className="text-2xl font-bold tracking-tight mb-1 text-white">Your Trades</h3>
                  <p className="text-sm font-medium text-[#8892b0]">Manage all your active and completed trades</p>
               </div>

               {/* Search & Filter */}
               <div className="flex gap-3 mb-6 sm:mb-8">
                  <div className="relative flex-1 group" ref={searchContainerRef}>
                     <Search className={`w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-primary' : 'text-[#8892b0]'}`} />
                     <input 
                        type="text" 
                        placeholder="Search by item, category, partner, or status..." 
                        value={searchQuery}
                        onChange={(e) => {
                           setSearchQuery(e.target.value);
                           setSelectedIndex(-1);
                           setIsSearchFocused(true);
                        }}
                        onFocus={() => setIsSearchFocused(true)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-white/[0.03] text-white placeholder:text-[#8892b0] text-sm font-medium rounded-xl py-3.5 pl-11 pr-10 outline-none border border-white/5 focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                     />
                     {searchQuery && (
                        <button 
                           onClick={() => {
                              setSearchQuery("");
                              setSelectedIndex(-1);
                           }}
                           className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#8892b0] hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                        >
                           <X className="w-3.5 h-3.5" />
                        </button>
                     )}
                     
                     {/* Autocomplete Dropdown */}
                     {isSearchFocused && searchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#0B0C10] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                           {searchResults.length > 0 ? (
                              <div className="py-2">
                                 <div className="px-4 py-2 text-xs font-bold text-[#8892b0] uppercase tracking-wider bg-white/[0.02]">
                                    Search Results
                                 </div>
                                 {searchResults.map((t, i) => (
                                    <Link 
                                       key={t.transaction_id} 
                                       href={`/trade/${t.transaction_id}`}
                                       className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors border-l-2 ${selectedIndex === i ? 'bg-white/[0.05] border-primary' : 'border-transparent'}`}
                                    >
                                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#8892b0] shrink-0">
                                          <Search className="w-3.5 h-3.5" />
                                       </div>
                                       <div>
                                          <div className="text-sm font-bold text-white">{t.item_name || t.game_type}</div>
                                          <div className="text-xs text-[#8892b0]">
                                             with {getCounterparty(t)} &bull; {t.status} &bull; ₱{Number(t.agreed_price).toLocaleString()}
                                          </div>
                                       </div>
                                    </Link>
                                 ))}
                              </div>
                           ) : (
                              <div className="px-4 py-8 text-center text-sm text-[#8892b0]">
                                 No matching trades found for "<span className="text-white">{searchQuery}</span>"
                              </div>
                           )}
                        </div>
                     )}
                  </div>
                  
                  {/* Filter Dropdown */}
                  <div className="relative" ref={filterContainerRef}>
                     <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-12 sm:w-auto h-12 px-0 sm:px-4 rounded-xl bg-white/[0.03] border transition-all flex items-center justify-center gap-2 shrink-0 ${isFilterOpen || dateFilter !== 'all' ? 'border-primary/50 text-primary' : 'border-white/5 hover:border-primary/50 hover:text-primary text-[#8892b0]'}`}
                     >
                        <Filter className="w-5 h-5" />
                        <span className="hidden sm:inline text-sm font-bold">
                           {dateFilter === 'week' ? 'Past Week' : dateFilter === 'month' ? 'Past Month' : 'All Time'}
                        </span>
                     </button>
                     
                     {isFilterOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#0B0C10] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1">
                           <div className="px-3 py-2 text-xs font-bold text-[#8892b0] uppercase tracking-wider">
                              Date Filter
                           </div>
                           <button onClick={() => handleDateFilter('all')} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${dateFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-white hover:bg-white/5'}`}>
                              All Time
                           </button>
                           <button onClick={() => handleDateFilter('week')} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${dateFilter === 'week' ? 'bg-primary/10 text-primary' : 'text-white hover:bg-white/5'}`}>
                              Past 7 Days
                           </button>
                           <button onClick={() => handleDateFilter('month')} className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${dateFilter === 'month' ? 'bg-primary/10 text-primary' : 'text-white hover:bg-white/5'}`}>
                              Past 30 Days
                           </button>
                        </div>
                     )}
                  </div>
               </div>

               {/* Tabs */}
               <div className="relative flex items-center gap-4 sm:gap-6 border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide pb-1" ref={tabBarRef}>
                  {(["All", "Pending", "Active", "Verifying", "Completed", "Disputed", "Cancelled"] as TabType[]).map((tab) => {
                     const isCleared = clearedTabs.has(tab);
                     const hasItems = counts[tab] > 0;
                     const showBadge = !isCleared && hasItems;
                     
                     return (
                        <button 
                           key={tab}
                           ref={(el) => { tabRefs.current[tab] = el; }}
                           onClick={() => handleTabClick(tab)}
                           className={`pb-3 text-sm font-bold tracking-wide whitespace-nowrap transition-colors duration-200 flex items-center gap-2 ${activeTab === tab ? "text-white" : "text-[#8892b0] hover:text-white"}`}
                        >
                           {tab}
                           {showBadge && (
                              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-[#030407] animate-pulse">
                                 {counts[tab]}
                              </span>
                           )}
                        </button>
                     );
                  })}
                  {/* Sliding indicator */}
                  <div
                     className="absolute bottom-0 h-0.5 bg-primary rounded-t-full shadow-[0_0_8px_rgba(63,229,108,0.6)] transition-all duration-300 ease-out"
                     style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                  />
               </div>

               {/* Trade List with Scrollbar */}
               <div className={`flex flex-col flex-1 overflow-y-auto pr-2 max-h-[600px] custom-scrollbar transition-opacity duration-200 ${isListTransitioning ? 'opacity-30' : 'opacity-100'}`}>
                  {(showSkeleton || isListTransitioning) ? (
                     <div className="flex flex-col gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} className="bg-white/[0.02] border-white/5" />)}
                     </div>
                  ) : filteredTrades.length === 0 ? (
                     <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <p className="text-[#8892b0] font-medium">No trades found in this category or date range.</p>
                     </div>
                  ) : (
                     filteredTrades.map((t) => {
                        const s = STATUS_MAP[t.status] || STATUS_MAP.agreement;
                        return (
                           <Link key={t.transaction_id} href={`/trade/${t.transaction_id}`} className="flex items-center justify-between py-4 sm:py-5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-2xl px-3 sm:px-4 -mx-3 sm:-mx-4 transition-colors group">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/5 text-[#8892b0] flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/30 transition-all">
                                    <Box className="w-4 h-4 sm:w-5 sm:h-5" />
                                 </div>
                                 <div className="min-w-0">
                                    <h4 className="text-[14px] sm:text-[15px] font-bold text-white mb-0.5 group-hover:text-primary transition-colors truncate">{t.item_name || t.game_type}</h4>
                                    <p className="text-[12px] sm:text-[13px] font-medium text-[#8892b0] flex items-center gap-1.5 truncate">
                                       with <span className="text-zinc-300 font-bold truncate">{getCounterparty(t) || 'Unknown'}</span>
                                    </p>
                                 </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0 ml-4">
                                 <span className="text-[14px] sm:text-[15px] font-black text-white">
                                    ₱{Number(t.agreed_price).toLocaleString()}
                                 </span>
                                 <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest border ${s.colorClass} ${s.bgClass} ${s.borderClass}`}>
                                    {s.label}
                                 </div>
                              </div>
                           </Link>
                        );
                     })
                  )}
               </div>

            </div>

            {/* Right Column */}
            <div className="xl:col-span-4 flex flex-col gap-8">
               
               {/* Account Status Card */}
               <div className="dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/5">
                  <div className="flex items-center gap-3 mb-8 text-white">
                     <TrendingUp className="w-5 h-5 text-primary" />
                     <h3 className="text-[17px] font-bold tracking-tight">Account Status</h3>
                  </div>

                  <div className="flex flex-col gap-6">
                     <div className="pb-6 border-b border-white/5">
                        <span className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest block mb-2">Reputation Tier</span>
                        {showSkeleton ? <Skeleton className="h-6 w-24 bg-white/5 rounded-full" /> : (
                           <div className="flex items-center gap-2">
                              <ReputationBadge score={Number(user?.reputation_score || 0)} showScore className="!bg-orange-500/10 !text-orange-400 !border-orange-500/20" />
                           </div>
                        )}
                     </div>
                     <div className="pb-6 border-b border-white/5">
                        <span className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest block mb-2">Completion Rate</span>
                        {showSkeleton ? <Skeleton className="h-8 w-16 bg-white/5" /> : (
                           <span className="text-2xl font-black text-white tracking-tight">{completionRate}%</span>
                        )}
                     </div>
                     <div>
                        <span className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest block mb-2">Total Trades</span>
                        {showSkeleton ? <Skeleton className="h-8 w-12 bg-white/5" /> : (
                           <span className="text-2xl font-black text-white tracking-tight">{trades.length}</span>
                        )}
                     </div>
                  </div>
               </div>

               {/* Recent Activity Card */}
               <div className="dash-animate bg-white/[0.02] backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/5">
                  <h3 className="text-[17px] font-bold text-white tracking-tight mb-6">Recent Activity</h3>
                  
                  <div className="flex flex-col gap-5">
                     {sorted.slice(0, 5).map((t) => {
                        const s = STATUS_MAP[t.status] || STATUS_MAP.agreement;
                        return (
                           <Link href={`/trade/${t.transaction_id}`} key={t.transaction_id} className="flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                              <div className="min-w-0 pr-4">
                                 <h4 className="text-[13px] font-bold text-white truncate mb-1 group-hover:text-primary transition-colors">{t.item_name || t.game_type}</h4>
                                 <span className="text-[12px] font-medium text-[#8892b0]">₱{Number(t.agreed_price).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                 <span className={`text-[11px] font-bold ${s.colorClass}`}>{s.label}</span>
                                 <span className="text-[11px] font-medium text-zinc-600">{timeAgo(t.updated_at || t.created_at)} ago</span>
                              </div>
                           </Link>
                        );
                     })}
                     {sorted.length === 0 && !isLoading && (
                        <p className="text-[13px] text-[#8892b0] font-medium py-4 text-center border border-dashed border-white/10 rounded-xl">No recent activity.</p>
                     )}
                  </div>
               </div>

            </div>
         </div>

      </div>
      </div>
   );
}
