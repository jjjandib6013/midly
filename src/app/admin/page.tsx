"use client";
import { useSession } from 'next-auth/react';

import { useEffect, useState } from "react";
import { ShieldAlert, Activity, CheckCircle, Search, FileText } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";

export default function AdminDashboard() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;

  const [isAdmin, setIsAdmin] = useState(false);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [kycs, setKycs] = useState<any[]>([]);
  
  const fetchDisputes = () => {
      fetch(`${API_URL}/api/admin/disputes`, {
         headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
         if (data.disputes) setDisputes(data.disputes);
      });
  };

  const fetchKycs = () => {
      fetch(`${API_URL}/api/admin/kyc`, {
         headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
         if (data.kycs) setKycs(data.kycs);
      });
  };
  
  useEffect(() => {
     
     if (token) {
        try {
           const payload = JSON.parse(atob(token.split('.')[1]));
           if (payload.role === 'admin') {
              setIsAdmin(true);
              fetchDisputes();
              fetchKycs();
           } else {
              window.location.href = "/";
           }
        } catch(e) {}
     } else {
        window.location.href = "/";
     }
  }, [token]);

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
            fetchDisputes();
         } else {
            toast.error("Failed to execute admin logic.");
         }
      } catch(e) {
         toast.error("Server API Error");
      }
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
            fetchKycs();
         } else {
            toast.error("Failed to update KYC status.");
         }
      } catch(e) {
         toast.error("Server API Error");
      }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
         <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
               <ShieldAlert className="w-8 h-8 text-red-500 glow-icon" /> Command Center
            </h1>
            <p className="text-text-muted mt-2">Global System Monitoring & Dispute Mediation</p>
         </div>
         <div className="flex bg-dark-panel p-2 rounded-xl border border-dark-border gap-2">
            <input type="text" placeholder="Search TxID or Email" className="bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500" />
            <button className="bg-red-500/10 text-red-500 p-2 rounded-lg border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">
               <Search className="w-5 h-5" />
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         <DynamicCard hoverEffect={false} className="border border-red-500/30 bg-red-500/5 p-6">
            <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Active Disputes</h3>
            <p className="text-4xl text-red-500 font-bold">{disputes.length}</p>
         </DynamicCard>
         <DynamicCard hoverEffect={false} className="border border-yellow-500/30 bg-yellow-500/5 p-6">
            <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Pending KYC</h3>
            <p className="text-4xl text-yellow-500 font-bold">{kycs.length}</p>
         </DynamicCard>
         <DynamicCard hoverEffect={false} className="border border-primary/30 bg-primary/5 p-6">
            <h3 className="text-text-muted text-sm font-bold uppercase tracking-wider mb-2">Smart Vault Status</h3>
            <p className="text-4xl text-primary font-bold">Operational</p>
         </DynamicCard>
      </div>

      <div className="grid grid-cols-1 gap-8">
         <div className="bg-dark-panel border border-dark-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               <Activity className="w-5 h-5 text-red-500" /> Dispute Resolution Queue
            </h2>
            
            {disputes.length === 0 ? (
               <div className="text-center py-10 border border-dark-border/50 border-dashed rounded-xl flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-text-muted mb-3" />
                  <p className="text-text-muted">Zero disputes actively flagged in the system.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {disputes.map(d => (
                     <div key={d.dispute_id} className="border border-red-500/30 rounded-xl p-5 bg-dark-bg flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
                        <div>
                           <div className="flex items-center gap-3 mb-2">
                              <span className="bg-red-500 text-white font-bold px-2 py-1 rounded text-xs">CRITICAL FLAG</span>
                              <span className="text-white font-bold">Trade #{d.transaction_id}</span>
                              <a href={`/trade/${d.transaction_id}`} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm">Target Trade Hub ↗</a>
                           </div>
                           <p className="text-text-muted text-sm mb-1"><span className="text-white">Reason:</span> "{d.description}"</p>
                           <div className="text-xs text-text-muted flex gap-4 mt-2">
                              <span>Buyer: {d.transaction.buyer.first_name}</span>
                              <span>Seller: {d.transaction.seller.first_name}</span>
                              <span>Locked Value: ₱{Number(d.transaction.total_amount).toLocaleString()}</span>
                           </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                           <NeonButton onClick={() => handleResolve(d.transaction_id, 'FORWARD_TO_SELLER')} className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-black !py-2 !px-4 !text-sm whitespace-nowrap">
                              Force Escrow Release
                           </NeonButton>
                           <NeonButton onClick={() => handleResolve(d.transaction_id, 'REFUND_BUYER')} variant="ghost" className="border-red-500 text-red-500 hover:bg-red-500/10 !py-2 !px-4 !text-sm whitespace-nowrap">
                              Force Vault Refund
                           </NeonButton>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 gap-8 mt-8">
         <div className="bg-dark-panel border border-dark-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               <FileText className="w-5 h-5 text-yellow-500" /> KYC Verification Queue
            </h2>
            
            {kycs.length === 0 ? (
               <div className="text-center py-10 border border-dark-border/50 border-dashed rounded-xl flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-text-muted mb-3" />
                  <p className="text-text-muted">No pending identity verification requests.</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {kycs.map(k => (
                     <div key={k.kyc_id} className="border border-yellow-500/30 rounded-xl p-5 bg-dark-bg flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
                        <div>
                           <div className="flex items-center gap-3 mb-2">
                              <span className="bg-yellow-500 text-black font-bold px-2 py-1 rounded text-xs">PENDING KYC</span>
                              <span className="text-white font-bold">{k.user.email}</span>
                           </div>
                           <p className="text-text-muted text-sm mb-1"><span className="text-white">Legal Name:</span> {k.id_name}</p>
                           <div className="text-xs text-text-muted flex items-center gap-4 mt-2">
                              <span>Type: {k.id_type}</span>
                              <span>ID No: {k.id_number}</span>
                              <span>DOB: {new Date(k.birthdate).toLocaleDateString()}</span>
                              {k.images?.[0] && (
                                 <a href={k.images[0].file_path} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                    View Document Proof ↗
                                 </a>
                              )}
                           </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                           <NeonButton onClick={() => handleResolveKyc(k.kyc_id, 'approved')} className="bg-primary/10 border-primary text-primary hover:bg-primary hover:text-black !py-2 !px-4 !text-sm whitespace-nowrap">
                              Approve KYC
                           </NeonButton>
                           <NeonButton onClick={() => handleResolveKyc(k.kyc_id, 'rejected')} variant="ghost" className="border-red-500 text-red-500 hover:bg-red-500/10 !py-2 !px-4 !text-sm whitespace-nowrap">
                              Reject Fraud
                           </NeonButton>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
