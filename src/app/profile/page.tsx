"use client";
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, User, Mail, Settings, LogOut, CheckCircle2, CreditCard, Plus, Trash2, Wallet, Activity, Laptop, Smartphone, LockKeyhole, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { API_URL } from "@/lib/api";

export default function Profile() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newMethod, setNewMethod] = useState({ provider: 'Visa', account_mask: '' });
  
  const [activeTab, setActiveTab] = useState<'account' | 'payment' | 'security' | 'settings'>('account');
  const tabContentRef = useRef<HTMLDivElement>(null);

  const fetchProfileData = () => {
    fetch(`${API_URL}/api/user/profile`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (data.email) setProfile(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
      
    fetch(`${API_URL}/api/user/payment-methods`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if(data.methods) setMethods(data.methods); })
      .catch(()=>{});

    fetch(`${API_URL}/api/user/sessions`, {
       headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if(data.sessions) setSessions(data.sessions); })
      .catch(()=>{});
  };

  useEffect(() => {
    if (token) fetchProfileData();
  }, [token]);

  useGSAP(() => {
     if (tabContentRef.current && !isLoading) {
        gsap.fromTo(tabContentRef.current.children, 
           { opacity: 0, y: 10 }, 
           { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }
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
           fetchProfileData();
        }
     } catch(e) {}
  };

  const handleDeleteMethod = async (id: number) => {
     try {
        const res = await fetch(`${API_URL}/api/user/payment-methods/${id}`, {
           method: "DELETE",
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) fetchProfileData();
     } catch(e) {}
  };

  const handleLogout = async () => {
      await signOut({ callbackUrl: "/" });
  };

  if (isLoading) {
     return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]"><div className="w-8 h-8 rounded-full border-[3px] border-dark-border border-t-primary animate-spin"/></div>
  }

  if (!profile) {
     return <div className="flex-1 flex items-center justify-center text-text-muted font-bold tracking-widest uppercase">Authentication Required</div>
  }

  return (
    <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 flex flex-col md:flex-row gap-6 sm:gap-8 lg:gap-16 font-sans">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 space-y-8">
        <div>
           <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
           <p className="text-sm font-medium text-text-muted">Manage your identity and billing.</p>
        </div>
        
        <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0 -mx-1 md:mx-0">
           <button onClick={() => setActiveTab('account')} className={`whitespace-nowrap flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[40px] touch-manipulation ${activeTab === 'account' ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
              <User className="w-4 h-4" /> Account Overview
           </button>
           <button onClick={() => setActiveTab('payment')} className={`whitespace-nowrap flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[40px] touch-manipulation ${activeTab === 'payment' ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
              <CreditCard className="w-4 h-4" /> Payment Methods
           </button>
           <button onClick={() => setActiveTab('security')} className={`whitespace-nowrap flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[40px] touch-manipulation ${activeTab === 'security' ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
              <ShieldCheck className="w-4 h-4" /> Security & Sessions
           </button>
           <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm transition-all min-h-[40px] touch-manipulation ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}>
              <Settings className="w-4 h-4" /> Preferences
           </button>
        </nav>

        <div className="pt-8 border-t border-dark-border">
           <button onClick={handleLogout} className="flex items-center gap-3 px-4 text-sm font-medium text-text-muted hover:text-red-500 transition-colors group">
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Disconnect User
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0" ref={tabContentRef}>
         {activeTab === 'account' && (
            <div className="space-y-8">
               
               {/* Account Card */}
               <div className="bg-dark-panel border border-dark-border rounded-2xl p-8">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                     <div className="w-24 h-24 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center relative shrink-0">
                        <span className="text-3xl font-bold text-white">{profile.first_name[0]}{profile.last_name[0]}</span>
                        {profile.kyc.status === 'verified' && (
                           <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-dark-panel flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                           </div>
                        )}
                     </div>
                     <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-white mb-1">{profile.first_name} {profile.last_name}</h2>
                        <p className="text-sm font-medium text-text-muted flex items-center gap-2 justify-center sm:justify-start">
                           <Mail className="w-4 h-4" /> {profile.email}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
                           <span className="px-3 py-1 bg-dark-bg border border-dark-border rounded-md text-xs font-semibold text-text-muted">Reputation: {profile.reputation_score} / 5.0</span>
                           <span className={`px-3 py-1 border rounded-md text-xs font-semibold ${profile.kyc.status === 'verified' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-dark-bg border-dark-border text-text-muted'}`}>Status: {profile.kyc.status}</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-dark-panel border border-dark-border rounded-2xl p-6">
                     <div className="flex items-center gap-2 mb-4 text-text-muted">
                        <Activity className="w-4 h-4" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider">Resolved Contracts</h3>
                     </div>
                     <p className="text-4xl font-bold text-white">{profile.stats?.completed_trades || 0}</p>
                  </div>
                  <div className="bg-dark-panel border border-dark-border rounded-2xl p-6">
                     <div className="flex items-center gap-2 mb-4 text-text-muted">
                        <Wallet className="w-4 h-4" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider">Active Escrows</h3>
                     </div>
                     <p className="text-4xl font-bold text-white">{profile.stats?.active_escrows || 0}</p>
                  </div>
               </div>

               {/* Progressive Profiling Lock Match */}
               {profile.kyc.status !== 'verified' && (
                  <div className="bg-dark-panel border border-dark-border rounded-2xl p-8 text-center flex flex-col items-center">
                     <div className="w-16 h-16 bg-dark-bg border border-dark-border rounded-full flex items-center justify-center mb-6 text-text-muted">
                           <LockKeyhole className="w-6 h-6" />
                     </div>
                     <h2 className="text-xl font-bold text-white mb-2">Verification Required</h2>
                     <p className="text-sm font-medium text-text-muted mb-6 max-w-lg">
                        To protect the integrity of the escrow network and comply with anti-fraud regulations, you must verify your identity before creating a trade.
                     </p>
                     <button onClick={() => router.push('/kyc')} className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-hover transition-colors text-sm">
                        Verify Identity Now
                     </button>
                  </div>
               )}
            </div>
         )}

         {activeTab === 'payment' && (
            <div className="space-y-8">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-dark-border gap-4">
                  <div>
                     <h3 className="text-xl font-bold text-white mb-1">Payment Methods</h3>
                     <p className="text-sm font-medium text-text-muted">Add bridges to process your fiat withdrawals.</p>
                  </div>
                  {!isAddingMode && (
                     <button onClick={() => setIsAddingMode(true)} className="flex items-center gap-2 bg-dark-panel border border-dark-border px-4 py-2 rounded-lg text-sm font-semibold text-white hover:bg-dark-border transition-colors">
                        <Plus className="w-4 h-4" /> Add Method
                     </button>
                  )}
               </div>

               {isAddingMode ? (
                  <div className="bg-dark-panel border border-dark-border rounded-2xl p-8">
                     <h4 className="text-lg font-bold text-white mb-6">Link New Accounts</h4>
                     <form onSubmit={handleAddMethod} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-sm font-medium text-text-muted">Provider</label>
                              <select 
                                 value={newMethod.provider}
                                 onChange={(e) => setNewMethod({ ...newMethod, provider: e.target.value })}
                                 className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors shadow-inner text-sm"
                              >
                                 <option value="Visa">Visa / Mastercard</option>
                                 <option value="GCash">GCash</option>
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-sm font-medium text-text-muted">Account Number</label>
                              <input 
                                 required
                                 type="text"
                                 placeholder={newMethod.provider === 'GCash' ? "09** *** 1234" : "**** **** **** 1234"}
                                 value={newMethod.account_mask}
                                 onChange={(e) => setNewMethod({ ...newMethod, account_mask: e.target.value })}
                                 className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors shadow-inner font-mono text-sm"
                              />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                           <button type="button" onClick={() => setIsAddingMode(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-text-muted hover:text-white transition-colors">Cancel</button>
                           <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors">Save Details</button>
                        </div>
                     </form>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 gap-4">
                     {methods.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-dark-border rounded-2xl">
                           <p className="text-sm font-medium text-text-muted">No external bridges configured.</p>
                        </div>
                     ) : (
                        methods.map((method) => (
                           <div key={method.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-dark-panel border border-dark-border rounded-2xl gap-4 group">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-dark-bg border border-dark-border rounded-xl flex items-center justify-center text-text-muted">
                                    <CreditCard className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                                       {method.provider}
                                       {method.is_default && <span className="px-2 py-0.5 bg-dark-bg border border-dark-border text-text-muted text-[10px] uppercase font-bold rounded">Default</span>}
                                    </h4>
                                    <p className="text-sm font-medium text-text-muted font-mono mt-0.5">{method.account_mask}</p>
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
            <div className="space-y-8">
               <div className="pb-6 border-b border-dark-border">
                  <h3 className="text-xl font-bold text-white mb-1">Active Sessions</h3>
                  <p className="text-sm font-medium text-text-muted">Review devices currently logged into your account.</p>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {sessions.length === 0 ? (
                     <div className="text-sm font-medium text-text-muted">No active sessions tracked.</div>
                  ) : (
                     sessions.map((session, i) => (
                        <div key={session.id || i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-dark-panel border border-dark-border rounded-2xl gap-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-dark-bg border border-dark-border rounded-full flex items-center justify-center text-text-muted">
                                 {session.user_agent?.toLowerCase().includes('mobile') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                              </div>
                              <div>
                                 <h4 className="text-sm font-bold text-white">
                                    {session.ip_address}
                                 </h4>
                                 <p className="text-xs font-medium text-text-muted mt-1 max-w-xs truncate">
                                    {session.user_agent || "Unknown Device"}
                                 </p>
                              </div>
                           </div>
                           <div className="text-left sm:text-right">
                              <p className="text-xs font-semibold text-text-muted mb-1">Last Active</p>
                              <p className="text-sm font-bold text-white">{new Date(session.last_active).toLocaleString()}</p>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}

         {activeTab === 'settings' && (
            <div className="space-y-8">
               <div className="pb-6 border-b border-dark-border">
                  <h3 className="text-xl font-bold text-white mb-1">Preferences</h3>
                  <p className="text-sm font-medium text-text-muted">Manage platform behavior.</p>
               </div>
               <div className="p-8 bg-dark-panel border border-dark-border rounded-2xl text-text-muted text-sm font-medium border-dashed">
                  General settings configuration is currently disabled by administrators. Contact support for manual overrides.
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
