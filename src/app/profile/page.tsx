"use client";

import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ShieldCheck, ShieldAlert, User, Mail, Settings, LogOut, CheckCircle2, CreditCard, Smartphone, Plus, Trash2, Wallet, Activity, Laptop, Bell, Moon } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [methods, setMethods] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newMethod, setNewMethod] = useState({ provider: 'Visa', account_mask: '' });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'security' | 'preferences'>('overview');
  const tabContentRef = useRef<HTMLDivElement>(null);

  const fetchProfileData = () => {
    fetch(`${API_URL}/api/user/profile`, {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { if (data.email) setProfile(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
      
    fetch(`${API_URL}/api/user/payment-methods`, {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { if(data.methods) setMethods(data.methods); })
      .catch(()=>{});

    fetch(`${API_URL}/api/user/sessions`, {
       headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => { if(data.sessions) setSessions(data.sessions); })
      .catch(()=>{});
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useGSAP(() => {
     if (tabContentRef.current && !isLoading) {
        gsap.fromTo(tabContentRef.current.children, 
           { opacity: 0, y: 15 }, 
           { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }
        );
     }
  }, [activeTab, isLoading]);

  const handleAddMethod = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
        const res = await fetch(`${API_URL}/api/user/payment-methods`, {
           method: "POST",
           headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
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
           headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) fetchProfileData();
     } catch(e) {}
  };

  const handleLogout = () => {
      localStorage.removeItem("token");
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      window.location.href = "/login";
  };

  if (isLoading) {
     return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]"><div className="w-12 h-12 rounded-full border-[6px] border-primary/20 border-t-primary animate-spin"/></div>
  }

  if (!profile) {
     return <div className="flex-1 flex items-center justify-center text-[#8892b0] font-bold tracking-widest uppercase">System Synchronization Error. Not Logged In.</div>
  }

  return (
    <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-12 flex flex-col lg:flex-row gap-12">
      
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-80 shrink-0 space-y-4">
        <div className="mb-10 px-4 border-b border-white/[0.04] pb-8">
           <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Control <span className="text-primary hidden sm:inline">Center</span></h1>
           <p className="text-xs font-bold text-[#8892b0] tracking-widest uppercase">Manage Protocol Identity</p>
        </div>
        
        <div className="space-y-2">
           <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(63,229,108,0.1)]' : 'text-[#8892b0] border border-transparent hover:bg-[#050608] hover:border-white/5 hover:text-white'}`}>
              <User className="w-5 h-5" /> Profile Overview
           </button>
           <button onClick={() => setActiveTab('payment')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'payment' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(63,229,108,0.1)]' : 'text-[#8892b0] border border-transparent hover:bg-[#050608] hover:border-white/5 hover:text-white'}`}>
              <Wallet className="w-5 h-5" /> Financial Nodes
           </button>
           <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(63,229,108,0.1)]' : 'text-[#8892b0] border border-transparent hover:bg-[#050608] hover:border-white/5 hover:text-white'}`}>
              <ShieldCheck className="w-5 h-5" /> Matrix Security
           </button>
           <button onClick={() => setActiveTab('preferences')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'preferences' ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(63,229,108,0.1)]' : 'text-[#8892b0] border border-transparent hover:bg-[#050608] hover:border-white/5 hover:text-white'}`}>
              <Settings className="w-5 h-5" /> System Prefs
           </button>
        </div>

        <div className="pt-12 px-4 border-t border-white/[0.04]">
           <button onClick={handleLogout} className="flex items-center gap-3 text-sm font-black text-[#8892b0] uppercase tracking-widest hover:text-red-500 transition-colors group">
              <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Disconnect User
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
         <div ref={tabContentRef} className="space-y-8">
            {activeTab === 'overview' && (
               <>
                  <DynamicCard hoverEffect={false} className="border border-white/5 bg-[#0a0d14]/80 p-8 md:p-12 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                     <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        <div className="w-32 h-32 rounded-[2rem] bg-[#030407] border border-primary/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(63,229,108,0.1)] shrink-0">
                           <span className="text-5xl font-black text-white">{profile.first_name[0]}{profile.last_name[0]}</span>
                           {profile.kyc.status === 'verified' && (
                              <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-primary rounded-full border-4 border-[#0a0d14] flex items-center justify-center shadow-[0_0_20px_rgba(63,229,108,0.5)]">
                              <CheckCircle2 className="w-5 h-5 text-black" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 text-center md:text-left pt-2">
                           <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase mb-2">{profile.first_name} {profile.last_name}</h2>
                           <p className="text-base font-bold text-[#8892b0] flex items-center gap-2 mt-1 justify-center md:justify-start">
                              <Mail className="w-4 h-4" /> {profile.email}
                           </p>
                           <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
                              <span className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">Reputation Limit: {profile.reputation_score} / 5.0</span>
                              <span className={`px-4 py-2 rounded-lg border text-xs font-black uppercase tracking-widest ${profile.kyc.status === 'verified' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>Security Status: {profile.kyc.status}</span>
                           </div>
                        </div>
                     </div>
                  </DynamicCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <DynamicCard hoverEffect={false} className="p-8 md:p-10 border border-white/5 bg-[#07090d]/80">
                        <div className="flex items-center gap-3 mb-4">
                           <Activity className="w-6 h-6 text-blue-500" />
                           <h3 className="text-[#8892b0] font-black text-xs uppercase tracking-widest">Total Resolved Contracts</h3>
                        </div>
                        <p className="text-6xl md:text-7xl font-black text-white mt-6 tracking-tighter">{profile.stats?.completed_trades || 0}</p>
                     </DynamicCard>
                     <DynamicCard hoverEffect={false} className="p-8 md:p-10 border border-white/5 bg-[#07090d]/80">
                        <div className="flex items-center gap-3 mb-4">
                           <Wallet className="w-6 h-6 text-purple-500" />
                           <h3 className="text-[#8892b0] font-black text-xs uppercase tracking-widest">Active Escrow Rooms</h3>
                        </div>
                        <p className="text-6xl md:text-7xl font-black text-white mt-6 tracking-tighter">{profile.stats?.active_escrows || 0}</p>
                     </DynamicCard>
                  </div>

                  {profile.kyc.status !== 'verified' && (
                     <DynamicCard hoverEffect={false} className="p-8 rounded-[2rem] border border-yellow-500/30 bg-yellow-500/5 flex flex-col md:flex-row items-center md:items-start gap-8">
                        <ShieldAlert className="w-12 h-12 text-yellow-500 shrink-0" />
                        <div className="text-center md:text-left">
                        <h4 className="text-2xl text-white font-black uppercase tracking-tight">Identity Lock Active</h4>
                        <p className="text-base text-[#8892b0] font-medium leading-relaxed mt-3 mb-6">
                           Our system has restricted your permissions. Compile federal identification documents to unlock maximum protocol efficiency and unlimited withdrawals.
                        </p>
                        <NeonButton onClick={() => window.location.href = "/kyc"} className="!py-4 !px-8 text-sm gap-3 uppercase tracking-widest shadow-[0_0_20px_rgba(63,229,108,0.2)]">
                           Lift Restriction Node
                        </NeonButton>
                        </div>
                     </DynamicCard>
                  )}
               </>
            )}

            {activeTab === 'payment' && (
               <>
                  <DynamicCard hoverEffect={false} className="p-8 md:p-12 border border-white/5 bg-[#0a0d14]/80">
                     <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                        <div>
                           <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-2">
                              External Bridges
                           </h3>
                           <p className="text-sm font-medium text-[#8892b0]">Integrate fiat payment networks directly into your Midly architecture.</p>
                        </div>
                        {!isAddingMode && (
                           <NeonButton onClick={() => setIsAddingMode(true)} variant="ghost" className="!py-4 !px-6 text-sm gap-2 uppercase tracking-widest hover:border-white shrink-0 shadow-[0_0_20px_-5px_rgba(255,255,255,0.1)]">
                              <Plus className="w-5 h-5" /> Compile New Hub
                           </NeonButton>
                        )}
                     </div>

                     {isAddingMode ? (
                        <div className="p-8 border border-primary/20 rounded-[2rem] bg-[#050608] shadow-[inset_0_0_30px_rgba(63,229,108,0.05)]">
                           <h4 className="text-xl font-black text-white uppercase tracking-wider mb-8 flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-primary animate-pulse"/> Handshake Initialization</h4>
                           <form onSubmit={handleAddMethod} className="space-y-8">
                              <div>
                                 <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest mb-3 block pl-1">Target Network Provider</label>
                                 <select 
                                    value={newMethod.provider}
                                    onChange={(e) => setNewMethod({ ...newMethod, provider: e.target.value })}
                                    className="w-full bg-[#030407] border border-white/10 p-5 rounded-2xl text-white focus:border-primary focus:outline-none appearance-none font-medium"
                                 >
                                    <option value="Visa">Visa / Mastercard Vector</option>
                                    <option value="GCash">GCash Integration Node</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-xs font-black text-[#8892b0] uppercase tracking-widest mb-3 block pl-1">Unique Masked Identifier</label>
                                 <input 
                                    required
                                    type="text"
                                    placeholder={newMethod.provider === 'GCash' ? "09** *** 1234" : "**** **** **** 1234"}
                                    value={newMethod.account_mask}
                                    onChange={(e) => setNewMethod({ ...newMethod, account_mask: e.target.value })}
                                    className="w-full bg-[#030407] border border-white/10 p-5 rounded-2xl text-white focus:border-primary focus:outline-none font-mono text-lg"
                                 />
                              </div>
                              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                 <NeonButton type="button" variant="ghost" className="flex-1 !py-5 uppercase tracking-widest text-sm" onClick={() => setIsAddingMode(false)}>Terminate Handshake</NeonButton>
                                 <NeonButton type="submit" className="flex-1 !py-5 uppercase tracking-widest text-sm">Force Bridge Access</NeonButton>
                              </div>
                           </form>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {methods.length === 0 ? (
                              <div className="text-center py-20 border border-dashed border-[#8892b0] rounded-[2rem] opacity-60">
                                 <Wallet className="w-12 h-12 text-[#8892b0] mx-auto mb-4" />
                                 <p className="text-sm font-black uppercase tracking-widest text-[#8892b0]">Zero Fiat Bridges Found.</p>
                              </div>
                           ) : (
                              methods.map((method) => (
                                 <div key={method.method_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-2xl border border-white/10 bg-[#050608] hover:border-primary/50 transition-all group gap-4 relative overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-6">
                                       <div className={`w-16 h-16 rounded-xl flex items-center justify-center border ${method.provider === 'GCash' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}`}>
                                          {method.provider === 'GCash' ? <Smartphone className="w-8 h-8" /> : <CreditCard className="w-8 h-8"/>}
                                       </div>
                                       <div>
                                          <h4 className="text-xl font-black text-white uppercase tracking-wider">{method.provider} Node</h4>
                                          <p className="text-sm text-[#8892b0] font-mono tracking-widest mt-1 opacity-80">{method.account_mask}</p>
                                       </div>
                                    </div>
                                    <button onClick={() => handleDeleteMethod(method.method_id)} className="w-12 h-12 rounded-xl flex items-center justify-center text-[#8892b0] bg-white/5 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 border border-transparent transition-all">
                                       <Trash2 className="w-5 h-5" />
                                    </button>
                                 </div>
                              ))
                           )}
                        </div>
                     )}
                  </DynamicCard>
               </>
            )}

            {activeTab === 'security' && (
               <>
                  <DynamicCard hoverEffect={false} className="p-8 md:p-12 border border-white/5 bg-[#0a0d14]/80">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Two-Factor Forcefield (2FA)</h3>
                     <p className="text-sm font-medium text-[#8892b0] mb-8">Deploy cryptographic layers to defend against unauthorized logins.</p>
                     
                     <div className="p-6 border border-white/10 bg-[#050608] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div>
                           <p className="text-white font-black text-lg uppercase tracking-wide">TOTP Generator Array</p>
                           <p className="text-[#8892b0] font-black text-xs uppercase tracking-widest flex items-center gap-2 mt-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Offline Node</p>
                        </div>
                        <NeonButton className="!py-3 !px-8 text-xs uppercase tracking-widest w-full sm:w-auto">Engage Shield</NeonButton>
                     </div>
                  </DynamicCard>

                  <DynamicCard hoverEffect={false} className="p-8 md:p-12 border border-white/5 bg-[#0a0d14]/80">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Login Telemetry Ping</h3>
                     <p className="text-sm font-medium text-[#8892b0] mb-8">Raw server traces of machines that compiled into your protocol interface.</p>
                     
                     <div className="space-y-4">
                        {sessions.length > 0 ? (
                           sessions.map((s) => (
                              <div key={s.session_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 border border-white/10 bg-[#050608] rounded-2xl hover:border-primary/30 transition-all">
                                 <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    <Laptop className="w-6 h-6 text-[#8892b0]" />
                                 </div>
                                 <div className="flex-1">
                                    <p className="text-lg font-black text-white uppercase tracking-wide">{s.os} Node • {s.device.split(' ')[0]}</p>
                                    <p className="text-xs font-bold text-[#8892b0] uppercase tracking-widest mt-1">{s.location} // Net Ping: {s.ip_address}</p>
                                 </div>
                                 <div className="text-left sm:text-right shrink-0">
                                    <p className="text-xs font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">{new Date(s.last_active).toLocaleString()}</p>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <div className="text-center py-12 border border-dashed border-[#8892b0] rounded-2xl opacity-60">
                              <p className="text-sm font-black uppercase tracking-widest text-[#8892b0]">Zero Telemetry Cached.</p>
                           </div>
                        )}
                     </div>
                  </DynamicCard>
               </>
            )}

            {activeTab === 'preferences' && (
               <>
                  <DynamicCard hoverEffect={false} className="p-8 md:p-12 border border-white/5 bg-[#0a0d14]/80">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8">User Interface Engine</h3>
                     
                     <div className="flex flex-col sm:flex-row items-center justify-between p-6 border border-white/10 bg-[#050608] rounded-2xl gap-6 mb-12">
                        <div className="flex items-start gap-4">
                           <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <Moon className="w-6 h-6 text-primary" />
                           </div>
                           <div>
                              <p className="text-white font-black text-lg uppercase tracking-wide">Midnight Theme Overlay</p>
                              <p className="text-[#8892b0] font-medium text-sm mt-1 max-w-sm">The UI engine permanently enforces Dark Mode matrix arrays for maximum visibility and aesthetic dominance.</p>
                           </div>
                        </div>
                        <div className="w-16 h-8 bg-primary rounded-full relative cursor-not-allowed opacity-80 shrink-0 shadow-[0_0_15px_rgba(63,229,108,0.3)]">
                           <div className="w-6 h-6 bg-[#030407] rounded-full absolute right-1 top-1"></div>
                        </div>
                     </div>

                     <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8 pt-8 border-t border-white/5">Push Signal Configurations</h3>
                     <div className="flex flex-col sm:flex-row items-center justify-between p-6 border border-white/10 bg-[#050608] rounded-2xl gap-6">
                        <div className="flex items-start gap-4">
                           <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Bell className="w-6 h-6 text-[#8892b0]" />
                           </div>
                           <div>
                              <p className="text-white font-black text-lg uppercase tracking-wide">Escrow Smart Alerts</p>
                              <p className="text-[#8892b0] font-medium text-sm mt-1 max-w-sm">System interrupts you immediately if a counterparty deposits funds or requests an audit.</p>
                           </div>
                        </div>
                        <div className="w-16 h-8 bg-primary rounded-full relative cursor-pointer shadow-[0_0_15px_rgba(63,229,108,0.3)] hover:scale-105 transition-transform shrink-0">
                           <div className="w-6 h-6 bg-[#030407] rounded-full absolute right-1 top-1"></div>
                        </div>
                     </div>

                  </DynamicCard>
               </>
            )}
         </div>
      </div>

    </div>
  );
}
