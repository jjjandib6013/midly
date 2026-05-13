"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
   Search, ArrowRight, ShieldCheck, CheckCircle2, XCircle, AlertTriangle,
   Clock, Send, Wallet, Zap, Eye, Box, Inbox, Snowflake, Undo2
} from "lucide-react";
import { API_URL } from "@/lib/api";

// Shared status vocabulary — keep the labels, colors, and icons identical to
// the dashboard's STATUS_MAP so users see the same language everywhere.
type StatusMeta = { label: string; text: string; bg: string; border: string; icon: any };
const STATUS_MAP: Record<string, StatusMeta> = {
   pending_invite:   { label: "Pending Invite",    text: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20", icon: Send },
   agreement:        { label: "Agreement",         text: "text-[#8892b0]",   bg: "bg-[#8892b0]/10",   border: "border-[#8892b0]/20",  icon: ShieldCheck },
   awaiting_payment: { label: "Awaiting Payment",  text: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20", icon: Wallet },
   active:           { label: "Active",            text: "text-primary",     bg: "bg-primary/10",     border: "border-primary/20",    icon: Zap },
   verifying:        { label: "Verifying",         text: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20", icon: Eye },
   completed:        { label: "Completed",         text: "text-primary",     bg: "bg-primary/10",     border: "border-primary/20",    icon: CheckCircle2 },
   disputed:         { label: "Disputed",          text: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",    icon: AlertTriangle },
   cancelled:        { label: "Cancelled",         text: "text-[#8892b0]",   bg: "bg-white/5",        border: "border-white/10",      icon: XCircle },
   refunded:         { label: "Refunded",          text: "text-yellow-400",  bg: "bg-yellow-400/10",  border: "border-yellow-400/20", icon: Undo2 },
   expired:          { label: "Expired",           text: "text-[#8892b0]",   bg: "bg-white/5",        border: "border-white/10",      icon: Clock },
   frozen:           { label: "Frozen",            text: "text-blue-300",    bg: "bg-blue-400/10",    border: "border-blue-400/20",   icon: Snowflake },
};
const fallbackStatus = STATUS_MAP.agreement;

// Tab definitions. The "All / Pending / Active / Verifying / Completed /
// Disputed / Cancelled" set mirrors the dashboard so users don't need to
// learn two different filter vocabularies. Each tab maps a single label to
// one or more underlying transaction statuses.
type TabKey = "All" | "Pending" | "Active" | "Verifying" | "Completed" | "Disputed" | "Cancelled";
const TAB_MATCHERS: Record<TabKey, (status: string) => boolean> = {
   All:       () => true,
   Pending:   (s) => ["pending_invite", "agreement", "awaiting_payment"].includes(s),
   Active:    (s) => s === "active" || s === "frozen",
   Verifying: (s) => s === "verifying",
   Completed: (s) => s === "completed",
   Disputed:  (s) => s === "disputed",
   Cancelled: (s) => ["cancelled", "expired", "refunded"].includes(s),
};
const TAB_ORDER: TabKey[] = ["All", "Pending", "Active", "Verifying", "Completed", "Disputed", "Cancelled"];

export default function Transactions() {
   return (
      <Suspense fallback={<TransactionsLoader />}>
         <TransactionsContent />
      </Suspense>
   );
}

function TransactionsLoader() {
   return (
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
         <div className="w-8 h-8 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
      </div>
   );
}

function TransactionsContent() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;
   const searchParams = useSearchParams();

   const [trades, setTrades] = useState<any[]>([]);
   const [currentUserId, setCurrentUserId] = useState<number | null>(null);
   const [isLoading, setIsLoading] = useState(true);

   // Initial tab comes from ?tab= so deep links from the dashboard land on
   // the same filter the user was browsing. Falls back to "All" on invalid
   // values or when the param is absent.
   const initialTab = useMemo<TabKey>(() => {
      const raw = searchParams.get("tab");
      if (raw && (TAB_ORDER as string[]).includes(raw)) return raw as TabKey;
      return "All";
   }, [searchParams]);
   const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
   const [searchQuery, setSearchQuery] = useState("");

   // Decode user_id from the Express JWT so we can label BUY/SELL correctly
   // per trade. Previously the page hardcoded "BUY" for everything, which
   // misled sellers viewing their own sales.
   useEffect(() => {
      if (!token) return;
      try {
         const payload = JSON.parse(atob(token.split(".")[1]));
         if (payload?.user_id) setCurrentUserId(Number(payload.user_id));
      } catch {}
   }, [token]);

   useEffect(() => {
      if (!token) return;
      // Fixed the double-slash bug (`${API_URL}//api/transactions`) that was
      // technically working on HTTP/2 but would break behind strict proxies.
      fetch(`${API_URL}/api/transactions`, {
         headers: { Authorization: `Bearer ${token}` },
      })
         .then((r) => r.json())
         .then((data) => {
            if (Array.isArray(data?.trades)) setTrades(data.trades);
         })
         .catch((e) => console.error("[Transactions] fetch failed:", e))
         .finally(() => setIsLoading(false));
   }, [token]);

   // Count trades per tab so the tab chips can show how many items live
   // under each filter — matches the dashboard's pattern.
   const counts = useMemo(() => {
      const c: Record<TabKey, number> = { All: 0, Pending: 0, Active: 0, Verifying: 0, Completed: 0, Disputed: 0, Cancelled: 0 };
      for (const t of trades) {
         for (const k of TAB_ORDER) {
            if (TAB_MATCHERS[k](t.status)) c[k]++;
         }
      }
      return c;
   }, [trades]);

   const filtered = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      return trades
         .filter((t) => TAB_MATCHERS[activeTab](t.status))
         .filter((t) => {
            if (!q) return true;
            const counterparty =
               currentUserId && t.buyer_id === currentUserId
                  ? `${t.seller?.first_name || ""} ${t.seller?.last_name || ""} ${t.seller?.email || ""}`
                  : `${t.buyer?.first_name || ""} ${t.buyer?.last_name || ""} ${t.buyer?.email || ""}`;
            return (
               String(t.transaction_id).includes(q) ||
               (t.item_name || "").toLowerCase().includes(q) ||
               (t.game_type || "").toLowerCase().includes(q) ||
               (t.status || "").toLowerCase().includes(q) ||
               counterparty.toLowerCase().includes(q)
            );
         })
         .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
   }, [trades, activeTab, searchQuery, currentUserId]);

   const roleFor = (t: any): "BUY" | "SELL" => {
      if (!currentUserId) return "BUY";
      return t.buyer_id === currentUserId ? "BUY" : "SELL";
   };

   const counterpartyLabel = (t: any) => {
      if (!currentUserId) return "";
      const other = t.buyer_id === currentUserId ? t.seller : t.buyer;
      if (!other) return "Unknown";
      const name = `${other.first_name || ""} ${other.last_name || ""}`.trim();
      return name || other.email || "Unknown";
   };

   const formatDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

   return (
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
         {/* Header */}
         <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">Your Transactions</h1>
            <p className="text-sm sm:text-base text-[#8892b0] max-w-2xl">
               All the trades you've been a part of. Tap any row to open its trade hub.
            </p>
         </header>

         {/* Search */}
         <div className="mb-6">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892b0]" aria-hidden="true" />
               <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by trade ID, item, game, counterparty, or status"
                  className="w-full bg-white/[0.02] border border-white/5 py-3 pl-11 pr-4 rounded-xl text-white text-sm placeholder:text-[#8892b0] focus:outline-none focus:border-white/20 transition-colors"
               />
            </div>
         </div>

         {/* Tabs */}
         <div className="flex gap-1 mb-6 overflow-x-auto scrollbar-thin pb-1">
            {TAB_ORDER.map((tab) => {
               const isActive = activeTab === tab;
               const count = counts[tab];
               return (
                  <button
                     key={tab}
                     type="button"
                     onClick={() => setActiveTab(tab)}
                     className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                           ? "bg-primary/10 text-primary border border-primary/20"
                           : "text-[#8892b0] hover:text-white hover:bg-white/[0.04] border border-transparent"
                     }`}
                  >
                     {tab}
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? "bg-primary/15" : "bg-white/5"}`}>
                        {count}
                     </span>
                  </button>
               );
            })}
         </div>

         {/* List */}
         <section className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            {isLoading ? (
               <div className="py-16 text-center flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-[#8892b0]">Loading your transactions</p>
               </div>
            ) : filtered.length === 0 ? (
               <div className="py-20 text-center flex flex-col items-center gap-3 px-4">
                  <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                     <Inbox className="w-6 h-6 text-[#8892b0]" />
                  </div>
                  <h3 className="text-white font-semibold">
                     {searchQuery ? "No matches" : trades.length === 0 ? "You haven't traded yet" : `No ${activeTab.toLowerCase()} trades`}
                  </h3>
                  <p className="text-sm text-[#8892b0] max-w-md">
                     {searchQuery
                        ? "Try a different search term, or clear the search box to see everything."
                        : trades.length === 0
                           ? "Browse the marketplace or create a private trade to get started."
                           : `Switch tabs to see trades in other states.`}
                  </p>
                  {!searchQuery && trades.length === 0 && (
                     <div className="flex gap-2 mt-2">
                        <Link href="/marketplace" className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold hover:bg-primary-hover transition-colors">
                           Browse Marketplace
                        </Link>
                        <Link href="/create-trade" className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors">
                           Create Trade
                        </Link>
                     </div>
                  )}
               </div>
            ) : (
               <ul className="divide-y divide-white/5">
                  {filtered.map((t) => {
                     const s = STATUS_MAP[t.status] || fallbackStatus;
                     const StatusIcon = s.icon;
                     const role = roleFor(t);
                     return (
                        <li key={t.transaction_id}>
                           <Link
                              href={`/trade/${t.transaction_id}`}
                              className="flex items-center gap-4 px-4 sm:px-6 py-4 sm:py-5 hover:bg-white/[0.02] transition-colors group"
                           >
                              {/* Item icon */}
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                                 <Box className="w-5 h-5 text-[#8892b0] group-hover:text-primary transition-colors" aria-hidden="true" />
                              </div>

                              {/* Primary info */}
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm sm:text-base font-semibold text-white truncate group-hover:text-primary transition-colors">
                                       {t.item_name || t.game_type || "Trade"}
                                    </h3>
                                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                       role === "BUY" ? "bg-blue-400/10 text-blue-300" : "bg-amber-400/10 text-amber-300"
                                    }`}>
                                       {role}
                                    </span>
                                 </div>
                                 <p className="text-xs sm:text-sm text-[#8892b0] truncate">
                                    with <span className="text-zinc-300 font-medium">{counterpartyLabel(t)}</span>
                                    <span className="mx-1.5">·</span>
                                    <span className="font-mono">#{t.transaction_id}</span>
                                    <span className="mx-1.5">·</span>
                                    {formatDate(t.updated_at || t.created_at)}
                                 </p>
                              </div>

                              {/* Amount + status */}
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                 <span className="text-sm sm:text-base font-bold text-white">
                                    ₱{Number(t.agreed_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </span>
                                 <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${s.text} ${s.bg} ${s.border}`}>
                                    <StatusIcon className="w-3 h-3" aria-hidden="true" /> {s.label}
                                 </span>
                              </div>

                              <ArrowRight className="w-4 h-4 text-[#8892b0] group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" aria-hidden="true" />
                           </Link>
                        </li>
                     );
                  })}
               </ul>
            )}
         </section>

         {/* Footer summary */}
         {!isLoading && filtered.length > 0 && (
            <p className="mt-4 text-xs text-[#8892b0] text-center">
               Showing {filtered.length} of {trades.length} trades
            </p>
         )}
      </div>
   );
}
