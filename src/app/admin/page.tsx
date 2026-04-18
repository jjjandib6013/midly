"use client";
import { useSession } from 'next-auth/react';

import { useEffect, useState } from "react";
import { ShieldAlert, Activity, CheckCircle, Search, FileText, Users, Settings, Database, Server, Clock, Lock, Globe, Power, Key } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";

type TabState = "OVERVIEW" | "DISPUTES" | "KYC" | "USERS" | "SETTINGS";

export default function AdminDashboard() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("OVERVIEW");

  // State
  const [metrics, setMetrics] = useState<any>({ lockedCapital: 0, tradesCount: 0, activeUsers: 0 });
  const [settings, setPlatformSettings] = useState<any>({ base_fee: 0.05 });
  const [disputes, setDisputes] = useState<any[]>([]);
  const [kycs, setKycs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [feeInput, setFeeInput] = useState("5.0");
  
  const loadData = async () => {
    if (!token) return;
    try {
        const metRes = await fetch(`${API_URL}/api/admin/metrics`, { headers: { "Authorization": `Bearer ${token}` } });
        if(metRes.ok) setMetrics(await metRes.json());

        const setRes = await fetch(`${API_URL}/api/admin/settings`, { headers: { "Authorization": `Bearer ${token}` } });
        if(setRes.ok) {
           const d = await setRes.json();
           setPlatformSettings(d.settings);
           setFeeInput((Number(d.settings.base_fee) * 100).toFixed(1));
        }

        const disRes = await fetch(`${API_URL}/api/admin/disputes`, { headers: { "Authorization": `Bearer ${token}` } });
        if(disRes.ok) {
           const d = await disRes.json();
           if(d.disputes) setDisputes(d.disputes);
        }

        const kycRes = await fetch(`${API_URL}/api/admin/kyc`, { headers: { "Authorization": `Bearer ${token}` } });
        if(kycRes.ok) {
            const d = await kycRes.json();
            if(d.kycs) setKycs(d.kycs);
        }

        const usrRes = await fetch(`${API_URL}/api/admin/users`, { headers: { "Authorization": `Bearer ${token}` } });
        if(usrRes.ok) {
           const d = await usrRes.json();
           if(d.users) setUsers(d.users);
        }

    } catch (e) {
        console.error("Error loading admin data", e);
    }
  };
  
  useEffect(() => {
     if (token) {
        try {
           const payload = JSON.parse(atob(token.split('.')[1]));
           if (payload.role === 'admin') {
              setIsAdmin(true);
              loadData();
           } else {
              window.location.href = "/";
           }
        } catch(e) {}
     } else if (session === null) {
        window.location.href = "/";
     }
  }, [token, session]);

  const handleResolve = async (txId: number, action: 'REFUND_BUYER' | 'FORWARD_TO_SELLER') => {
      if (!confirm(`Are you absolutely sure you want to FORCE ${action}? This manipulates the global vault database instantly.`)) return;
      try {
         const res = await fetch(`${API_URL}/api/admin/disputes/${txId}/resolve`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action })
         });
         if (res.ok) {
            toast.success("Mediation successful! Vault distribution executed.");
            loadData();
         } else {
            toast.error("Failed to execute admin logic.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

  const handleResolveKyc = async (kycId: number, status: 'approved' | 'rejected') => {
      try {
         const res = await fetch(`${API_URL}/api/admin/kyc/${kycId}/resolve`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ status })
         });
         if (res.ok) {
            toast.success(`KYC ${status} successfully.`);
            loadData();
         } else {
            toast.error("Failed to update KYC status.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

  const handleToggleBan = async (userId: number, currentBanState: boolean) => {
      if (!confirm(`Are you sure you want to ${currentBanState ? 'UNBAN' : 'BAN'} this user globally?`)) return;
      try {
         const res = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ is_banned: !currentBanState })
         });
         if (res.ok) {
            toast.success(`User successfully ${currentBanState ? 'unbanned' : 'banned'}.`);
            loadData();
         } else {
            toast.error("Failed to modify ban state.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

  const handleUpdateFee = async () => {
     try {
         const rawInput = parseFloat(feeInput);
         if (isNaN(rawInput)) return toast.error("Invalid number.");
         const decimalFee = rawInput / 100;
         const res = await fetch(`${API_URL}/api/admin/settings`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ base_fee: decimalFee })
         });
         if (res.ok) {
            toast.success("Platform Settings Global Override Enacted.");
            loadData();
         } else {
            const err = await res.json();
            toast.error(err.error || "Failed to update settings");
         }
     } catch (e) { toast.error("Server API Error"); }
  }


  if (!isAdmin) return (
     <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
     </div>
  );

  const filteredUsers = users.filter(u => 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar Command Center */}
      <div className="w-64 bg-[#0a0a0c] border-r border-dark-border flex flex-col pt-8 shrink-0 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-0 w-full h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>

        <div className="px-6 mb-10 flex items-center gap-3 relative z-10">
           <Database className="w-8 h-8 text-primary glow-icon" />
           <div className="flex flex-col">
              <span className="text-white font-black tracking-widest text-lg">MIDLY OS</span>
              <span className="text-primary text-[10px] uppercase font-bold tracking-widest">Admin Terminal</span>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 relative z-10">
           {[
              { id: "OVERVIEW", icon: Activity, label: "System Overview" },
              { id: "DISPUTES", icon: ShieldAlert, label: "Disputes Queue", badge: disputes.length > 0 ? disputes.length : null, badgeColor: "bg-red-500" },
              { id: "KYC", icon: FileText, label: "KYC Fallback", badge: kycs.length > 0 ? kycs.length : null, badgeColor: "bg-yellow-500" },
              { id: "USERS", icon: Users, label: "Global Users" },
              { id: "SETTINGS", icon: Settings, label: "Platform Parameters" },
           ].map(tab => (
              <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as TabState)}
                 className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? 'bg-primary/10 border border-primary/30 text-white shadow-[0_0_15px_rgba(255,215,0,0.1)]' : 'text-text-muted hover:bg-dark-panel hover:text-white border border-transparent'}`}
              >
                 <div className="flex items-center gap-3">
                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : 'text-white/40'}`} />
                    <span className="font-semibold text-sm">{tab.label}</span>
                 </div>
                 {tab.badge && (
                    <span className={`${tab.badgeColor} text-black font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                       {tab.badge}
                    </span>
                 )}
              </button>
           ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#030407] overflow-y-auto px-10 py-10">
         <div className="max-w-6xl mx-auto space-y-8">

            {/* TAB: OVERVIEW */}
            {activeTab === "OVERVIEW" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="mb-10">
                     <h1 className="text-3xl font-bold text-white mb-2 font-display">System Overview</h1>
                     <p className="text-text-muted">High-altitude telemetry of the Midly Escrow Infrastructure.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                     <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a0a0c] to-[#0d0d12] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Lock className="w-16 h-16 text-primary"/></div>
                        <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Locked Vault Capital</h3>
                        <p className="text-4xl text-white font-light font-display">₱{Number(metrics.lockedCapital).toLocaleString()}</p>
                     </div>
                     <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a0a0c] to-[#0d0d12] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity className="w-16 h-16 text-blue-500"/></div>
                        <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Total Executed Trades</h3>
                        <p className="text-4xl text-white font-light font-display">{metrics.tradesCount}</p>
                     </div>
                     <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a0a0c] to-[#0d0d12] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Globe className="w-16 h-16 text-emerald-500"/></div>
                        <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Active Orbiting Users</h3>
                        <p className="text-4xl text-white font-light font-display">{metrics.activeUsers}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-center justify-center p-20 border border-white/5 rounded-2xl bg-dark-bg/50">
                     <div className="text-center flex flex-col items-center">
                        <Server className="w-12 h-12 text-primary/30 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">All Systems Operational</h2>
                        <p className="text-text-muted">Node.js and WebSockets are connected via standard P2P relay.</p>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB: DISPUTES */}
            {activeTab === "DISPUTES" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="mb-10 flex justify-between items-center">
                     <div>
                        <h1 className="text-3xl font-bold text-white mb-2 font-display flex items-center gap-3">
                           <ShieldAlert className="w-8 h-8 text-red-500" /> Dispute Resolution Queue
                        </h1>
                        <p className="text-text-muted">Review immutable chat logs and mediate stalemated escrows.</p>
                     </div>
                  </header>

                  {disputes.length === 0 ? (
                     <div className="text-center py-20 border border-dark-border/50 border-dashed rounded-2xl flex flex-col items-center bg-[#0a0a0c]/50">
                        <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                        <h3 className="text-xl text-white font-bold mb-2">Zero Active Disputes</h3>
                        <p className="text-text-muted">The platform is running smoothly. Nothing to mediate.</p>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        {disputes.map(d => (
                           <div key={d.dispute_id} className="border border-red-500/30 rounded-2xl bg-[#0a0a0c] flex flex-col overflow-hidden shadow-lg shadow-red-500/5">
                              {/* Header */}
                              <div className="p-6 border-b border-white/5 flex justify-between items-start bg-red-500/5">
                                 <div>
                                    <div className="flex items-center gap-3 mb-2">
                                       <span className="bg-red-500 text-white font-black px-3 py-1 rounded-sm text-[10px] uppercase tracking-widest">CRITICAL FLAG</span>
                                       <span className="text-white font-bold text-lg font-display">Trade #{d.transaction_id}</span>
                                       <a href={`/trade/${d.transaction_id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm ml-2 flex items-center gap-1">View Live Hub ↗</a>
                                    </div>
                                    <p className="text-white bg-black/50 p-4 rounded-xl border border-white/10 italic text-sm mt-4">"{d.description}"</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider mb-1">Locked Value</p>
                                    <p className="text-2xl text-primary font-bold font-display">₱{Number(d.transaction?.total_amount || 0).toLocaleString()}</p>
                                 </div>
                              </div>
                              
                              {/* Evidence Board */}
                              <div className="p-6 bg-black flex gap-6 flex-col lg:flex-row">
                                 <div className="lg:w-2/3 border border-dark-border rounded-xl bg-[#050508] p-5 flex flex-col h-80">
                                    <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-text-muted"/> Immutable Chat Evidence Logs</h4>
                                    <div className="space-y-3 overflow-y-auto pr-4 custom-scrollbar flex-1">
                                       {d.transaction?.messages && d.transaction.messages.length > 0 ? (
                                          d.transaction.messages.map((msg: any) => (
                                             <div key={msg.message_id} className={`text-sm p-3 rounded-xl border ${msg.is_system_generated ? 'bg-primary/5 text-primary border-primary/20 text-center text-xs ml-auto mr-auto max-w-[80%]' : (msg.sender_id === d.transaction.buyer_id ? 'bg-blue-500/5 text-blue-100 border-blue-500/20 mr-12' : 'bg-red-500/5 text-red-100 border-red-500/20 ml-12')}`}>
                                                <div className="font-black text-[10px] uppercase opacity-50 mb-1 flex justify-between">
                                                   <span>{msg.is_system_generated ? 'SYSTEM LOG' : (msg.sender_id === d.transaction.buyer_id ? 'BUYER ALIAS' : 'SELLER ALIAS')}</span>
                                                   <span>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className={`${msg.is_system_generated ? 'italic' : ''}`}>{msg.message_text}</span>
                                             </div>
                                          ))
                                       ) : (
                                          <div className="flex-1 flex items-center justify-center text-xs text-white/30 italic">No chat messages recorded.</div>
                                       )}
                                    </div>
                                 </div>
                                 
                                 {/* Execution Controls */}
                                 <div className="lg:w-1/3 flex flex-col justify-center gap-4 bg-dark-panel p-6 rounded-xl border border-white/5">
                                    <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2 text-center text-text-muted">Mediation Execution</h4>
                                    <p className="text-xs text-center text-white/40 mb-4 px-2">Analyze the chat logs thoroughly. Overriding the vault relies solely on your ultimate human discretion.</p>
                                    <NeonButton onClick={() => handleResolve(d.transaction_id, 'FORWARD_TO_SELLER')} className="bg-emerald-500/10 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-black w-full !py-4 shadow-lg shadow-emerald-500/10">
                                       Release Escrow to Seller
                                    </NeonButton>
                                    <p className="text-center font-black text-white/10 text-xs">OR</p>
                                    <NeonButton onClick={() => handleResolve(d.transaction_id, 'REFUND_BUYER')} variant="ghost" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black w-full !py-4 shadow-lg shadow-red-500/10 bg-red-500/5">
                                       Force Refund to Buyer
                                    </NeonButton>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* TAB: KYC */}
            {activeTab === "KYC" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="mb-10">
                     <h1 className="text-3xl font-bold text-white mb-2 font-display flex items-center gap-3">
                        <FileText className="w-8 h-8 text-yellow-500" /> AI Fallback Override Queue
                     </h1>
                     <p className="text-text-muted">Review identities that failed the strict 70% AI biometric confidence threshold.</p>
                  </header>

                  {kycs.length === 0 ? (
                     <div className="text-center py-20 border border-dark-border/50 border-dashed rounded-2xl flex flex-col items-center bg-[#0a0a0c]/50">
                        <CheckCircle className="w-12 h-12 text-emerald-500/50 mb-4" />
                        <h3 className="text-xl text-white font-bold mb-2">No Fallback Reviews</h3>
                        <p className="text-text-muted">The AI Pipeline is handling 100% of registrations automatically.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {kycs.map(k => (
                           <div key={k.kyc_id} className="border border-yellow-500/30 rounded-2xl p-6 bg-[#0a0a0c] flex flex-col relative overflow-hidden group">
                              <div className="flex items-start justify-between mb-6">
                                 <div>
                                    <span className="bg-yellow-500 text-black font-black px-2 py-1 rounded text-[10px] tracking-widest uppercase mb-3 inline-block">LOW CONFIDENCE</span>
                                    <h3 className="text-lg font-bold text-white font-display truncate max-w-[200px]">{k.user.email}</h3>
                                    <p className="text-sm text-text-muted">{k.id_name}</p>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-xs bg-dark-bg border border-white/10 px-2 py-1 rounded text-white">{k.id_type}</span>
                                    <p className="text-xs font-mono text-white/50 mt-2">{k.id_number}</p>
                                    <p className="text-xs text-white/30 mt-1">DOB: {new Date(k.birthdate).toLocaleDateString()}</p>
                                 </div>
                              </div>

                              <div className="bg-black border border-white/5 rounded-xl p-4 mb-6 relative group-hover:border-white/10 transition-colors">
                                 <h4 className="text-[10px] uppercase font-black tracking-widest text-text-muted mb-3 flex items-center gap-2"><Key className="w-3 h-3"/> Document Evidence</h4>
                                 {k.images?.[0] ? (
                                    <a href={k.images[0].file_path} target="_blank" rel="noreferrer" className="block relative aspect-video bg-dark-bg rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-colors group/img">
                                       <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity z-10 backdrop-blur-sm">
                                          <span className="text-white font-bold text-sm flex items-center gap-2"><Search className="w-4 h-4"/> Expand Original Scrape</span>
                                       </div>
                                       <img src={k.images[0].file_path} className="w-full h-full object-cover opacity-80 group-hover/img:scale-105 transition-transform duration-700" alt="ID Document"/>
                                    </a>
                                 ) : (
                                    <div className="aspect-video bg-dark-bg rounded-lg border border-white/10 flex items-center justify-center">
                                       <span className="text-xs text-white/30">Missing File Extract</span>
                                    </div>
                                 )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-auto">
                                 <NeonButton onClick={() => handleResolveKyc(k.kyc_id, 'approved')} className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-black !py-3 text-sm font-bold">
                                    Override: Approve
                                 </NeonButton>
                                 <NeonButton onClick={() => handleResolveKyc(k.kyc_id, 'rejected')} variant="ghost" className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black !py-3 text-sm font-bold bg-red-500/5">
                                    Reject & Lock
                                 </NeonButton>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* TAB: USERS */}
            {activeTab === "USERS" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                     <div>
                        <h1 className="text-3xl font-bold text-white mb-2 font-display flex items-center gap-3">
                           <Users className="w-8 h-8 text-blue-500" /> Global User Database
                        </h1>
                        <p className="text-text-muted">Total root control over all registered platform participants.</p>
                     </div>
                     <div className="relative w-full md:w-auto">
                        <Search className="w-5 h-5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                           type="text" 
                           placeholder="Search alias or email. . . " 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full md:w-80 bg-black border border-dark-border rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors focus:ring-1 focus:ring-primary shadow-inner"
                        />
                     </div>
                  </header>

                  <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-text-muted">
                           <thead className="bg-black/80 text-xs uppercase font-black tracking-widest text-white/60 border-b border-white/10">
                              <tr>
                                 <th className="px-6 py-5">Ident</th>
                                 <th className="px-6 py-5">Role</th>
                                 <th className="px-6 py-5">Created</th>
                                 <th className="px-6 py-5">Status</th>
                                 <th className="px-6 py-5 text-right">Moderation</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {filteredUsers.map(u => (
                                 <tr key={u.user_id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col">
                                          <span className="text-white font-bold">{u.first_name || 'Incognito'} {u.last_name || ''}</span>
                                          <span className="text-xs">{u.email}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-white/60'}`}>
                                          {u.role}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-white/40">
                                       {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                       {u.is_banned ? (
                                          <span className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded-full w-fit border border-red-500/20"><Power className="w-3 h-3"/> BANNED</span>
                                       ) : (
                                          <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs bg-emerald-500/10 px-2 py-1 rounded-full w-fit border border-emerald-500/20"><CheckCircle className="w-3 h-3"/> ACTIVE</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       {u.role !== 'admin' && (
                                          <button onClick={() => handleToggleBan(u.user_id, u.is_banned)} className={`text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg border transition-all ${u.is_banned ? 'bg-black text-white hover:border-white/50 border-dark-border' : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white'}`}>
                                             {u.is_banned ? 'Restore Access' : 'Suspend Engine'}
                                          </button>
                                       )}
                                    </td>
                                 </tr>
                              ))}
                              {filteredUsers.length === 0 && (
                                 <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/30 italic">No corresponding identities found in sectors.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === "SETTINGS" && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
                  <header className="mb-10">
                     <h1 className="text-3xl font-bold text-white mb-2 font-display flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" /> Core Parameters
                     </h1>
                     <p className="text-text-muted">Dynamically inject global modifiers across the entire Midly network latency-free.</p>
                  </header>

                  <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-8 relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Database className="w-40 h-40 text-primary" /></div>
                     
                     <div className="relative z-10 flex flex-col gap-6">
                        <div>
                           <label className="block text-xs uppercase font-black tracking-widest text-primary mb-2 flex items-center gap-2">Global Base Service Fee (%)</label>
                           <p className="text-sm text-text-muted mb-4">Dictates the profit margin collected from Seller payouts upon Escrow completions. Modifying this immediately affects all new transactions instantiated.</p>
                           <div className="flex bg-black border border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors max-w-xs shadow-inner">
                              <input 
                                 type="text" 
                                 value={feeInput}
                                 onChange={(e) => setFeeInput(e.target.value)}
                                 className="bg-transparent text-white font-display text-xl w-full px-4 py-3 focus:outline-none"
                              />
                              <div className="bg-white/5 flex items-center justify-center px-4 font-bold text-white/50 border-l border-white/10">%</div>
                           </div>
                        </div>

                        <div className="pt-6 mt-2 border-t border-white/5">
                           <NeonButton onClick={handleUpdateFee} className="w-full md:w-auto shadow-lg shadow-primary/20">
                              Inject Changes to Root
                           </NeonButton>
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>
    </div>
  );
}
