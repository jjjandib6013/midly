"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      window.location.href = "/login";
  };

  if (isLoading) {
     return <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"/></div>
  }

  if (!profile) {
     return <div className="flex-1 flex items-center justify-center text-text-muted">You are not logged in.</div>
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 space-y-2">
        <div className="mb-6 px-4">
           <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
           <p className="text-xs text-text-muted mt-1">Manage your Midly account</p>
        </div>
        
        <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'overview' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-dark-panel hover:text-white'}`}>
           <User className="w-5 h-5" /> Overview
        </button>
        <button onClick={() => setActiveTab('payment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'payment' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-dark-panel hover:text-white'}`}>
           <Wallet className="w-5 h-5" /> Payment Linkages
        </button>
        <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'security' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-dark-panel hover:text-white'}`}>
           <ShieldCheck className="w-5 h-5" /> Security Center
        </button>
        <button onClick={() => setActiveTab('preferences')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === 'preferences' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-text-muted hover:bg-dark-panel hover:text-white'}`}>
           <Settings className="w-5 h-5" /> Preferences
        </button>

        <div className="pt-8 px-4">
           <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-text-muted hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
         <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
               <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-6">
                     <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-24 h-24 rounded-full bg-dark-bg border-4 border-primary/30 flex items-center justify-center relative glow-icon shrink-0">
                           <span className="text-3xl font-bold text-primary">{profile.first_name[0]}{profile.last_name[0]}</span>
                           {profile.kyc.status === 'verified' && (
                              <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full border-2 border-dark-panel flex items-center justify-center shadow-[0_0_10px_rgba(63,229,108,0.5)]">
                              <CheckCircle2 className="w-4 h-4 text-black" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                           <h2 className="text-2xl font-bold text-white">{profile.first_name} {profile.last_name}</h2>
                           <p className="text-sm text-text-muted flex items-center gap-1 mt-1 justify-center md:justify-start">
                              <Mail className="w-4 h-4" /> {profile.email}
                           </p>
                           <div className="mt-4 flex flex-wrap gap-3 justify-center md:justify-start">
                              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">Reputation: {profile.reputation_score} / 5.0</span>
                              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${profile.kyc.status === 'verified' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>KYC: {profile.kyc.status.toUpperCase()}</span>
                           </div>
                        </div>
                     </div>
                  </DynamicCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-bg/30">
                        <div className="flex items-center gap-3 mb-2">
                           <Activity className="w-5 h-5 text-blue-500" />
                           <h3 className="text-text-muted font-bold">Total Midly Trades</h3>
                        </div>
                        <p className="text-4xl font-bold text-white mt-4">{profile.stats?.completed_trades || 0}</p>
                     </DynamicCard>
                     <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-bg/30">
                        <div className="flex items-center gap-3 mb-2">
                           <Wallet className="w-5 h-5 text-purple-500" />
                           <h3 className="text-text-muted font-bold">Active Escrows</h3>
                        </div>
                        <p className="text-4xl font-bold text-white mt-4">{profile.stats?.active_escrows || 0}</p>
                     </DynamicCard>
                  </div>

                  {profile.kyc.status !== 'verified' && (
                     <DynamicCard hoverEffect={false} className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex items-start gap-4">
                        <ShieldAlert className="w-8 h-8 text-yellow-500 shrink-0" />
                        <div>
                        <h4 className="text-white font-bold">Verification Required</h4>
                        <p className="text-sm text-text-muted mt-1 leading-relaxed mb-4">
                           Complete your KYC to utilize the Midly platform safely. Unverified profiles have highly restricted trading features.
                        </p>
                        <NeonButton onClick={() => window.location.href = "/kyc"} className="!py-2 !px-4 text-sm gap-2">
                           Verify Identity Now
                        </NeonButton>
                        </div>
                     </DynamicCard>
                  )}
               </motion.div>
            )}

            {activeTab === 'payment' && (
               <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-panel">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              External Payment Gateways
                           </h3>
                           <p className="text-sm text-text-muted mt-1">Manage linked credit cards and e-Wallets used to directly fund smart escrows.</p>
                        </div>
                        {!isAddingMode && (
                           <NeonButton onClick={() => setIsAddingMode(true)} variant="ghost" className="!py-2 !px-4 text-sm gap-2">
                              <Plus className="w-4 h-4" /> Link Hub
                           </NeonButton>
                        )}
                     </div>

                     {isAddingMode ? (
                        <div className="p-6 border border-primary/20 rounded-xl bg-dark-bg">
                           <h4 className="text-lg font-bold text-white mb-4">Secure Link Handshake</h4>
                           <form onSubmit={handleAddMethod} className="space-y-4">
                              <div>
                                 <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Provider Network</label>
                                 <select 
                                    value={newMethod.provider}
                                    onChange={(e) => setNewMethod({ ...newMethod, provider: e.target.value })}
                                    className="w-full bg-dark-panel border border-dark-border p-3 rounded-xl text-white focus:border-primary focus:outline-none"
                                 >
                                    <option value="Visa">Visa / Mastercard</option>
                                    <option value="GCash">GCash Integration</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">Identification Number</label>
                                 <input 
                                    required
                                    type="text"
                                    placeholder={newMethod.provider === 'GCash' ? "09** *** 1234" : "**** **** **** 1234"}
                                    value={newMethod.account_mask}
                                    onChange={(e) => setNewMethod({ ...newMethod, account_mask: e.target.value })}
                                    className="w-full bg-dark-panel border border-dark-border p-3 rounded-xl text-white focus:border-primary focus:outline-none"
                                 />
                              </div>
                              <div className="flex gap-3 pt-2">
                                 <NeonButton type="button" variant="ghost" className="flex-1" onClick={() => setIsAddingMode(false)}>Abandon</NeonButton>
                                 <NeonButton type="submit" className="flex-1">Authorize Linkage</NeonButton>
                              </div>
                           </form>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {methods.length === 0 ? (
                              <div className="text-center py-10 border border-dashed border-dark-border rounded-xl">
                                 <p className="text-sm text-text-muted">No external payments connected to your identity.</p>
                              </div>
                           ) : (
                              methods.map((method) => (
                                 <div key={method.method_id} className="flex items-center justify-between p-5 rounded-xl border border-dark-border bg-dark-bg/50 hover:border-primary/30 transition-all group">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 rounded-full flex items-center justify-center ${method.provider === 'GCash' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                          {method.provider === 'GCash' ? <Smartphone className="w-6 h-6" /> : <CreditCard className="w-6 h-6"/>}
                                       </div>
                                       <div>
                                          <h4 className="text-base font-bold text-white">{method.provider}</h4>
                                          <p className="text-sm text-text-muted font-mono">{method.account_mask}</p>
                                       </div>
                                    </div>
                                    <button onClick={() => handleDeleteMethod(method.method_id)} className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              ))
                           )}
                        </div>
                     )}
                  </DynamicCard>
               </motion.div>
            )}

            {activeTab === 'security' && (
               <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  
                  <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-panel">
                     <h3 className="text-lg font-bold text-white mb-2">Two-Factor Authentication (2FA)</h3>
                     <p className="text-sm text-text-muted mb-4">Protect your account with an extra layer of structural security.</p>
                     <div className="p-4 border border-dark-border bg-dark-bg rounded-xl flex items-center justify-between">
                        <div>
                           <p className="text-white font-bold text-sm">Authenticator App</p>
                           <p className="text-text-muted text-xs mt-1">Not configured</p>
                        </div>
                        <NeonButton className="!py-1.5 !px-4 text-xs">Enable</NeonButton>
                     </div>
                  </DynamicCard>

                  <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-panel">
                     <h3 className="text-lg font-bold text-white mb-2">Device Telemetry Logs</h3>
                     <p className="text-sm text-text-muted mb-4">Recent logins monitored by Midly infrastructure metrics.</p>
                     
                     <div className="space-y-3">
                        {sessions.length > 0 ? (
                           sessions.map((s) => (
                              <div key={s.session_id} className="flex items-start gap-4 p-4 border border-dark-border bg-dark-bg/30 rounded-xl">
                                 <Laptop className="w-5 h-5 text-text-muted mt-1" />
                                 <div>
                                    <p className="text-sm font-bold text-white">{s.os} • {s.device.split(' ')[0]}</p>
                                    <p className="text-xs text-text-muted mt-1">{s.location} • IP: {s.ip_address}</p>
                                    <p className="text-xs font-mono text-primary mt-2">Last active: {new Date(s.last_active).toLocaleString()}</p>
                                 </div>
                              </div>
                           ))
                        ) : (
                           <p className="text-sm text-text-muted">No telemetry data recorded.</p>
                        )}
                     </div>
                  </DynamicCard>

               </motion.div>
            )}

            {activeTab === 'preferences' && (
               <motion.div key="preferences" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                  <DynamicCard hoverEffect={false} className="p-6 border border-dark-border bg-dark-panel">
                     <h3 className="text-lg font-bold text-white mb-6">User Interface Experience</h3>
                     
                     <div className="flex items-center justify-between p-4 border border-dark-border bg-dark-bg rounded-xl mb-4">
                        <div className="flex items-center gap-3">
                           <Moon className="w-5 h-5 text-primary" />
                           <div>
                              <p className="text-white font-bold text-sm">Dark Mode Affinity</p>
                              <p className="text-text-muted text-xs mt-1">Midly is currently locked into Dark Mode architecture.</p>
                           </div>
                        </div>
                        <div className="w-10 h-6 bg-primary rounded-full relative cursor-not-allowed opacity-80">
                           <div className="w-4 h-4 bg-black rounded-full absolute right-1 top-1"></div>
                        </div>
                     </div>

                     <h3 className="text-lg font-bold text-white mt-8 mb-4">Global Notifications</h3>
                     <div className="flex items-center justify-between p-4 border border-dark-border bg-dark-bg rounded-xl">
                        <div className="flex items-center gap-3">
                           <Bell className="w-5 h-5 text-text-muted" />
                           <div>
                              <p className="text-white font-bold text-sm">Escrow Alerts</p>
                              <p className="text-text-muted text-xs mt-1">Receive UI pings when counterparties lock terms or deposit funds.</p>
                           </div>
                        </div>
                        <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                           <div className="w-4 h-4 bg-black rounded-full absolute right-1 top-1"></div>
                        </div>
                     </div>

                  </DynamicCard>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

    </div>
  );
}
