"use client";
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, User, Mail, Settings, LogOut, CheckCircle2, CreditCard, Plus, Trash2, Wallet, Activity, Laptop, Smartphone, LockKeyhole, CalendarDays, ArrowDownRight, ArrowUpRight, TrendingUp, AlertCircle, ShoppingCart, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_URL } from "@/lib/api";

export default function Profile() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const router = useRouter();

  const [hubData, setHubData] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newMethod, setNewMethod] = useState({ provider: 'Visa', account_mask: '' });
  
  const [activeTab, setActiveTab] = useState<'hub' | 'payment' | 'security'>('hub');
  const tabContentRef = useRef<HTMLDivElement>(null);

  const fetchHubData = () => {
    // 1. Fetch unified intelligence hub
    fetch(`${API_URL}/api/user/hub`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (data.identity) setHubData(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
      
    // 2. Fetch payment methods
    fetch(`${API_URL}/api/user/payment-methods`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if(data.methods) setMethods(data.methods); })
      .catch(()=>{});

    // 3. Fetch security sessions
    fetch(`${API_URL}/api/user/sessions`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if(data.sessions) setSessions(data.sessions); })
      .catch(()=>{});
  };

  useEffect(() => {
    if (token) fetchHubData();
  }, [token]);

  useGSAP(() => {
     if (tabContentRef.current && !isLoading) {
        gsap.fromTo(tabContentRef.current.children, 
           { opacity: 0, y: 15 }, 
           { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" }
        );
     }
  }, [activeTab, isLoading]);

  const handleAddMethod = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
        const res = await fetch(`${API_URL}/api/user/payment-methods`, {
           method: "POST",
           headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
           body: JSON.stringify({ ...newMethod, is_default: methods.length === 0 })
        });
        if (res.ok) {
           setIsAddingMode(false);
           setNewMethod({ provider: 'Visa', account_mask: '' });
           fetchHubData();
        }
     } catch(e) {}
  };

  const handleDeleteMethod = async (id: number) => {
     try {
        const res = await fetch(`${API_URL}/api/user/payment-methods/${id}`, {
           method: "DELETE",
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) fetchHubData();
     } catch(e) {}
  };

  if (isLoading) {
     return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]"><div className="w-8 h-8 rounded-full border-[3px] border-dark-border border-t-primary animate-spin"/></div>
  }

  if (!hubData) {
     return <div className="flex-1 flex items-center justify-center text-text-muted font-medium">Authentication Required</div>
  }

  const { identity, wallet, stats, timeline } = hubData;

  const renderTrustTier = (score: number) => {
     if (score >= 90) return { label: 'Gold Tier', color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' };
     if (score >= 50) return { label: 'Silver Tier', color: 'text-gray-300 border-gray-500/30 bg-gray-500/10' };
     return { label: 'Standard Tier', color: 'text-text-muted border-dark-border bg-dark-bg' };
  };

  const tier = renderTrustTier(Number(identity.reputation));

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 font-sans">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 space-y-6">
        <div>
           <h1 className="text-2xl font-semibold text-white mb-1">User Hub</h1>
           <p className="text-sm text-text-muted">Manage your identity and activities.</p>
        </div>
        
        <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0 -mx-1 md:mx-0">
           <button onClick={() => setActiveTab('hub')} className={`whitespace-nowrap flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all touch-manipulation ${activeTab === 'hub' ? 'bg-dark-panel border border-dark-border text-white shadow-sm' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
              <User className="w-4 h-4" /> Intelligence Dashboard
           </button>
           <button onClick={() => setActiveTab('payment')} className={`whitespace-nowrap flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all touch-manipulation ${activeTab === 'payment' ? 'bg-dark-panel border border-dark-border text-white shadow-sm' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
              <CreditCard className="w-4 h-4" /> Bridges & Billing
           </button>
           <button onClick={() => setActiveTab('security')} className={`whitespace-nowrap flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all touch-manipulation ${activeTab === 'security' ? 'bg-dark-panel border border-dark-border text-white shadow-sm' : 'text-text-muted hover:bg-white/5 hover:text-white border border-transparent'}`}>
              <ShieldCheck className="w-4 h-4" /> Security Sessions
           </button>
        </nav>

        <div className="pt-6 border-t border-dark-border">
           <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-3 px-4 text-sm font-medium text-text-muted hover:text-red-500 transition-colors group">
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Disconnect Identity
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0" ref={tabContentRef}>
         {activeTab === 'hub' && (
            <div className="space-y-6">
               
               {/* Identity & Wallet Hero Grid */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Identity Card */}
                  <div className="lg:col-span-2 bg-dark-panel border border-dark-border rounded-2xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-sm">
                     <div className="w-20 h-20 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center relative shrink-0">
                        <span className="text-2xl font-semibold text-white">{identity.name[0]}</span>
                        {identity.kyc_status === 'verified' && (
                           <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-[3px] border-dark-panel flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                           </div>
                        )}
                     </div>
                     <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-semibold text-white mb-1">{identity.name}</h2>
                        <p className="text-sm text-text-muted flex items-center gap-2 justify-center sm:justify-start">
                           <Mail className="w-4 h-4" /> {identity.email}
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                           <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${tier.color}`}>
                              {tier.label} ({Number(identity.reputation).toFixed(1)})
                           </span>
                           <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${identity.kyc_status === 'verified' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-dark-bg border-dark-border text-text-muted'}`}>
                              Identity: {identity.kyc_status.charAt(0).toUpperCase() + identity.kyc_status.slice(1)}
                           </span>
                           <span className="px-2.5 py-1 text-xs font-medium rounded-md border border-dark-border bg-dark-bg text-text-muted flex items-center gap-1.5">
                              <CalendarDays className="w-3 h-3" /> Joined {new Date(identity.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* Wallet Mini-Ledger */}
                  <div className="bg-dark-panel border border-dark-border rounded-2xl p-8 flex flex-col justify-center shadow-sm">
                     <div className="flex items-center gap-2 mb-2 text-text-muted">
                        <Wallet className="w-4 h-4" />
                        <h3 className="text-sm font-medium">Available Balance</h3>
                     </div>
                     <p className="text-3xl font-semibold text-white tracking-tight">₱{wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                     <button onClick={() => router.push('/wallet')} className="mt-4 w-full py-2 bg-dark-bg border border-dark-border hover:bg-white/5 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                        View Wallet Details <ArrowRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>

               {/* Lock Match Banner for Unverified */}
               {identity.kyc_status !== 'verified' && (
                  <div className="bg-dark-bg border border-yellow-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                     <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6 text-yellow-500" />
                     </div>
                     <div className="flex-1 text-center sm:text-left">
                        <h4 className="text-base font-semibold text-white">Verification Required</h4>
                        <p className="text-sm text-text-muted mt-1">You must verify your identity to participate in Escrow trading and marketplace listings.</p>
                     </div>
                     <button onClick={() => router.push('/kyc')} className="px-6 py-2.5 bg-yellow-500 text-yellow-950 font-semibold text-sm rounded-lg hover:bg-yellow-400 transition-colors whitespace-nowrap">
                        Verify Now
                     </button>
                  </div>
               )}

               {/* Quick Stats & Active Metrics */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm hover:border-dark-border/80 transition-colors">
                     <div className="flex items-center gap-2 mb-2 text-text-muted">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Active Listings</span>
                     </div>
                     <p className="text-2xl font-semibold text-white">{stats.active_listings}</p>
                  </div>
                  <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm hover:border-dark-border/80 transition-colors">
                     <div className="flex items-center gap-2 mb-2 text-text-muted">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Sold Items</span>
                     </div>
                     <p className="text-2xl font-semibold text-white">{stats.sold_listings}</p>
                  </div>
                  <div className="bg-dark-panel border border-dark-border rounded-xl p-5 shadow-sm hover:border-dark-border/80 transition-colors col-span-2 md:col-span-2 relative overflow-hidden">
                     <div className="relative z-10 flex items-center gap-2 mb-2 text-primary">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Escrows In Transit</span>
                     </div>
                     <p className="relative z-10 text-2xl font-semibold text-white">{stats.active_escrows}</p>
                     {stats.active_escrows > 0 && (
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
                     )}
                  </div>
               </div>

               {/* Unified Activity Timeline */}
               <div className="bg-dark-panel border border-dark-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-dark-border">
                     <h3 className="text-base font-semibold text-white">Recent Activity</h3>
                  </div>
                  <div className="divide-y divide-dark-border">
                     {timeline.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                           <p className="text-sm text-text-muted font-medium">Your activity timeline is clean.</p>
                        </div>
                     ) : (
                        timeline.map((event: any) => (
                           <div key={event.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                    event.action === 'deposit' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    event.action === 'withdrawal' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                    event.action === 'sold' || event.action === 'escrow_release' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                    event.action === 'purchased' ? 'bg-dark-bg border-dark-border text-white' :
                                    'bg-dark-bg border-dark-border text-text-muted'
                                 }`}>
                                    {event.amount > 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium text-white">{event.description}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{new Date(event.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                 </div>
                              </div>
                              <div className="text-right font-mono text-sm">
                                 <span className={event.amount > 0 ? 'text-emerald-500 font-medium' : 'text-white font-medium'}>
                                    {event.amount > 0 ? '+' : ''}₱{Math.abs(event.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                 </span>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'payment' && (
            <div className="space-y-6">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-dark-border gap-4">
                  <div>
                     <h3 className="text-lg font-semibold text-white mb-1">Bridges & Billing</h3>
                     <p className="text-sm text-text-muted">Manage external accounts for fiat off-ramping.</p>
                  </div>
                  {!isAddingMode && (
                     <button onClick={() => setIsAddingMode(true)} className="flex items-center gap-2 bg-dark-bg border border-dark-border px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/5 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Bridge
                     </button>
                  )}
               </div>

               {isAddingMode ? (
                  <div className="bg-dark-panel border border-dark-border rounded-xl p-6 shadow-sm">
                     <h4 className="text-base font-semibold text-white mb-5">Link New Account</h4>
                     <form onSubmit={handleAddMethod} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                           <div className="space-y-1.5">
                              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Provider</label>
                              <select 
                                 value={newMethod.provider}
                                 onChange={(e) => setNewMethod({ ...newMethod, provider: e.target.value })}
                                 className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors text-sm"
                              >
                                 <option value="Visa">Visa / Mastercard</option>
                                 <option value="GCash">GCash</option>
                              </select>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Account Number</label>
                              <input 
                                 required
                                 type="text"
                                 placeholder={newMethod.provider === 'GCash' ? "09** *** 1234" : "**** **** **** 1234"}
                                 value={newMethod.account_mask}
                                 onChange={(e) => setNewMethod({ ...newMethod, account_mask: e.target.value })}
                                 className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors font-mono text-sm"
                              />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                           <button type="button" onClick={() => setIsAddingMode(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white transition-colors">Cancel</button>
                           <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 transition-colors shadow-sm">Save Bridge</button>
                        </div>
                     </form>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-3">
                     {methods.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-dark-border rounded-xl">
                           <p className="text-sm text-text-muted">No external bridges configured.</p>
                        </div>
                     ) : (
                        methods.map((method) => (
                           <div key={method.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-dark-panel border border-dark-border rounded-xl gap-4 group shadow-sm">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-dark-bg border border-dark-border rounded-lg flex items-center justify-center text-text-muted">
                                    <CreditCard className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                       {method.provider}
                                       {method.is_default && <span className="px-1.5 py-0.5 bg-dark-bg border border-dark-border text-text-muted text-[9px] uppercase font-bold rounded">Default</span>}
                                    </h4>
                                    <p className="text-xs text-text-muted font-mono mt-0.5">{method.account_mask}</p>
                                 </div>
                              </div>
                              <button onClick={() => handleDeleteMethod(method.id)} className="text-text-muted hover:text-red-500 transition-colors sm:opacity-0 sm:group-hover:opacity-100 p-2">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        ))
                     )}
                  </div>
               )}
            </div>
         )}

         {activeTab === 'security' && (
            <div className="space-y-6">
               <div className="pb-4 border-b border-dark-border">
                  <h3 className="text-lg font-semibold text-white mb-1">Active Sessions</h3>
                  <p className="text-sm text-text-muted">Review devices currently logged into your account.</p>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {sessions.length === 0 ? (
                     <div className="text-sm text-text-muted">No active sessions tracked.</div>
                  ) : (
                     sessions.map((session, i) => (
                        <div key={session.id || i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-dark-panel border border-dark-border rounded-xl gap-4 shadow-sm">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-dark-bg border border-dark-border rounded-full flex items-center justify-center text-text-muted">
                                 {session.user_agent?.toLowerCase().includes('mobile') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                              </div>
                              <div>
                                 <h4 className="text-sm font-semibold text-white">
                                    {session.ip_address}
                                 </h4>
                                 <p className="text-xs text-text-muted mt-0.5 max-w-xs truncate">
                                    {session.user_agent || "Unknown Device"}
                                 </p>
                              </div>
                           </div>
                           <div className="text-left sm:text-right">
                              <p className="text-xs text-text-muted mb-0.5">Last Active</p>
                              <p className="text-sm font-medium text-white">{new Date(session.last_active).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
