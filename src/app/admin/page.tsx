"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from "react";
import { ShieldAlert, Activity, CheckCircle, Search, FileText, Users, Settings, Server, Clock, Lock, Globe, Power, Key, ChevronRight, Ban, Check, ExternalLink, RefreshCw, Download, PieChart, BarChart as BarChartIcon, Filter } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TabState = "OVERVIEW" | "REPORTS" | "DISPUTES" | "KYC" | "USERS" | "SETTINGS";

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
  const [biometricThreshold, setBiometricThreshold] = useState("0.55");
  const [reviewThreshold, setReviewThreshold] = useState("0.45");
  const [isLoading, setIsLoading] = useState(true);

  // Reports Data
  const [chartData, setChartData] = useState<any[]>([]);
  const [reportTransactions, setReportTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportStatus, setReportStatus] = useState("all");

  const [resolveModalState, setResolveModalState] = useState<{isOpen: boolean, txId: number | null, action: 'REFUND_BUYER' | 'FORWARD_TO_SELLER' | null}>({isOpen: false, txId: null, action: null});
  const [resolveConfirmText, setResolveConfirmText] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  
  const loadData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
        const [metRes, setRes, disRes, kycRes, usrRes] = await Promise.all([
           fetch(`${API_URL}/api/admin/metrics`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/settings`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/disputes`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/kyc`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/users`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if(metRes.ok) setMetrics(await metRes.json());
        if(setRes.ok) {
           const d = await setRes.json();
           setPlatformSettings(d.settings);
           setFeeInput((Number(d.settings.base_fee) * 100).toFixed(1));
           if (d.settings.kyc_biometric_threshold !== undefined) setBiometricThreshold(String(d.settings.kyc_biometric_threshold));
           if (d.settings.kyc_review_threshold !== undefined) setReviewThreshold(String(d.settings.kyc_review_threshold));
        }
        if(disRes.ok) {
           const d = await disRes.json();
           if(d.disputes) setDisputes(d.disputes);
        }
        if(kycRes.ok) {
            const d = await kycRes.json();
            if(d.kycs) setKycs(d.kycs);
        }
        if(usrRes.ok) {
           const d = await usrRes.json();
           if(d.users) setUsers(d.users);
        }

        // Fetch reports
        const [chartRes, txRepRes, logRes] = await Promise.all([
           fetch(`${API_URL}/api/admin/reports/charts`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/reports/transactions?status=${reportStatus}&startDate=${reportStartDate}&endDate=${reportEndDate}`, { headers: { "Authorization": `Bearer ${token}` } }),
           fetch(`${API_URL}/api/admin/reports/audit-logs`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (chartRes.ok) { const d = await chartRes.json(); setChartData(d.timelineData); }
        if (txRepRes.ok) { const d = await txRepRes.json(); setReportTransactions(d.transactions); }
        if (logRes.ok) { const d = await logRes.json(); setAuditLogs(d.logs); }
    } catch (e) {
        console.error("Error loading admin data", e);
        toast.error("Failed to sync dashboard data.");
    } finally {
        setIsLoading(false);
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

  const confirmResolve = async () => {
      if (resolveConfirmText !== 'CONFIRM') return toast.error("Please type CONFIRM to execute.");
      if (!resolveModalState.txId || !resolveModalState.action) return;
      
      setIsResolving(true);
      try {
         const res = await fetch(`${API_URL}/api/admin/disputes/${resolveModalState.txId}/resolve`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: resolveModalState.action })
         });
         if (res.ok) {
            toast.success("Dispute resolved successfully.");
            setResolveModalState({ isOpen: false, txId: null, action: null });
            setResolveConfirmText("");
            loadData();
         } else {
            toast.error("Failed to resolve dispute.");
         }
      } catch(e) { toast.error("Server API Error"); } finally {
         setIsResolving(false);
      }
  };

  const handleResolveKyc = async (kycId: number, status: 'verified' | 'rejected') => {
      try {
         const res = await fetch(`${API_URL}/api/admin/kyc/${kycId}/resolve`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ status })
         });
         if (res.ok) {
            toast.success(`KYC application ${status}.`);
            loadData();
         } else {
            toast.error("Failed to update KYC status.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

  const handleToggleBan = async (userId: number, currentBanState: boolean) => {
      if (!confirm(`Are you sure you want to ${currentBanState ? 'unban' : 'suspend'} this user account?`)) return;
      try {
         const res = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ is_banned: !currentBanState })
         });
         if (res.ok) {
            toast.success(`User account successfully ${currentBanState ? 'unbanned' : 'suspended'}.`);
            loadData();
         } else {
            toast.error("Failed to modify account state.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

   const handleUpdateSettings = async () => {
      try {
          const rawInput = parseFloat(feeInput);
          if (isNaN(rawInput)) return toast.error("Invalid number provided for fee.");
          const decimalFee = rawInput / 100;

          const body: any = { base_fee: decimalFee };

          const bt = parseFloat(biometricThreshold);
          const rt = parseFloat(reviewThreshold);
          if (!isNaN(bt)) body.kyc_biometric_threshold = bt;
          if (!isNaN(rt)) body.kyc_review_threshold = rt;

          if (rt >= bt) return toast.error("Review threshold must be lower than biometric threshold.");

          const res = await fetch(`${API_URL}/api/admin/settings`, {
             method: "POST",
             headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
             body: JSON.stringify(body)
          });
          if (res.ok) {
             toast.success("Platform settings updated successfully.");
             loadData();
          } else {
             const err = await res.json();
             toast.error(err.error || "Failed to update settings.");
          }
      } catch (e) { toast.error("Server API Error"); }
   }

  const fetchFilteredReports = async () => {
      try {
         const res = await fetch(`${API_URL}/api/admin/reports/transactions?status=${reportStatus}&startDate=${reportStartDate}&endDate=${reportEndDate}`, { headers: { "Authorization": `Bearer ${token}` } });
         if (res.ok) {
            const d = await res.json();
            setReportTransactions(d.transactions);
            toast.success("Report data refreshed.");
         }
      } catch (e) { toast.error("Failed to filter reports."); }
  };

  const handleExportCSV = () => {
     if (reportTransactions.length === 0) return toast.error("No data to export");
     const worksheet = XLSX.utils.json_to_sheet(reportTransactions.map(tx => ({
        ID: tx.transaction_id,
        Date: new Date(tx.created_at).toLocaleString(),
        Status: tx.status,
        Amount: tx.total_amount,
        Buyer: tx.buyer?.email,
        Seller: tx.seller?.email
     })));
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
     XLSX.writeFile(workbook, "Midly_Transactions_Report.csv");
     toast.success("CSV Export Generated");
  };

  const handleExportPDF = () => {
     if (reportTransactions.length === 0) return toast.error("No data to export");
     const doc = new jsPDF();
     doc.setFontSize(18);
     doc.text("Midly Admin - Secured Transaction Report", 14, 22);
     doc.setFontSize(11);
     doc.setTextColor(100);
     doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
     
     const tableColumn = ["TxID", "Date", "Status", "Amount", "Buyer", "Seller"];
     const tableRows = reportTransactions.map(tx => [
        tx.transaction_id.toString(),
        new Date(tx.created_at).toLocaleDateString(),
        tx.status,
        `PHP ${tx.total_amount}`,
        tx.buyer?.email || 'N/A',
        tx.seller?.email || 'N/A'
     ]);
     
     autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [24, 24, 27] } // zinc-900 match
     });
     
     doc.save("Midly_Transactions_Report.pdf");
     toast.success("PDF Export Generated");
  };


  if (!isAdmin) return (
     <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-zinc-950">
        <RefreshCw className="w-6 h-6 text-zinc-500 animate-spin" />
     </div>
  );

  const filteredUsers = users.filter(u => 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col pt-6 shrink-0 z-10">
        <div className="px-6 mb-8 flex items-center gap-3">
           <div className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold">
              M
           </div>
           <div className="flex flex-col">
              <span className="text-zinc-100 font-semibold text-sm">Midly</span>
              <span className="text-zinc-500 text-xs">Administration</span>
           </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
           {[
              { id: "OVERVIEW", icon: Activity, label: "Overview" },
              { id: "REPORTS", icon: BarChartIcon, label: "Analytics & Reports" },
              { id: "DISPUTES", icon: ShieldAlert, label: "Disputes", badge: disputes.length > 0 ? disputes.length : null },
              { id: "KYC", icon: FileText, label: "Identity Verification", badge: kycs.length > 0 ? kycs.length : null },
              { id: "USERS", icon: Users, label: "Users" },
              { id: "SETTINGS", icon: Settings, label: "Settings" },
           ].map(tab => (
              <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as TabState)}
                 className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${activeTab === tab.id ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
              >
                 <div className="flex items-center gap-3">
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-zinc-100' : 'text-zinc-400'}`} />
                    <span>{tab.label}</span>
                 </div>
                 {tab.badge && (
                    <span className="bg-zinc-100 text-zinc-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                       {tab.badge}
                    </span>
                 )}
              </button>
           ))}
        </nav>
        
        <div className="p-4 border-t border-zinc-800">
           <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              Systems Operational
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8 lg:px-12">
         <div className="max-w-5xl mx-auto space-y-8">

            {/* TAB: OVERVIEW */}
            {activeTab === "OVERVIEW" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-8">
                     <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Dashboard Overview</h1>
                     <p className="text-sm text-zinc-400">System metrics, active operations, and overall platform volume.</p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                     <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="text-zinc-400 text-sm font-medium">Escrow Capital</h3>
                           <Lock className="w-4 h-4 text-zinc-500"/>
                        </div>
                        <p className="text-3xl text-zinc-100 font-semibold tracking-tight">₱{Number(metrics.lockedCapital).toLocaleString()}</p>
                     </div>
                     <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="text-zinc-400 text-sm font-medium">Total Trades</h3>
                           <Activity className="w-4 h-4 text-zinc-500"/>
                        </div>
                        <p className="text-3xl text-zinc-100 font-semibold tracking-tight">{metrics.tradesCount}</p>
                     </div>
                     <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                           <h3 className="text-zinc-400 text-sm font-medium">Active Users</h3>
                           <Users className="w-4 h-4 text-zinc-500"/>
                        </div>
                        <p className="text-3xl text-zinc-100 font-semibold tracking-tight">{metrics.activeUsers}</p>
                     </div>
                  </div>
                  
                  <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900/30">
                     <h3 className="text-zinc-100 text-sm font-medium mb-4">System Status</h3>
                     <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-2">
                           <CheckCircle className="w-4 h-4 text-emerald-500" />
                           <span>Database Connected</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <CheckCircle className="w-4 h-4 text-emerald-500" />
                           <span>WebSocket Operational</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <CheckCircle className="w-4 h-4 text-emerald-500" />
                           <span>API Responding properly</span>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB: REPORTS */}
            {activeTab === "REPORTS" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                     <div>
                        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Analytics & Reporting</h1>
                        <p className="text-sm text-zinc-400">Data-driven insights, time-series aggregations, and secured file exports.</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                           <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                           <FileText className="w-4 h-4" /> Export PDF
                        </button>
                     </div>
                  </header>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500"/> Platform Growth (30 Days)</h3>
                        <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                 <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                 <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2"><BarChartIcon className="w-4 h-4 text-blue-500"/> Transaction Volume (30 Days)</h3>
                        <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                 <defs>
                                    <linearGradient id="colorTxs" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                 <Area type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTxs)" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>

                  {/* Filters */}
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Status</label>
                        <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none">
                           <option value="all">All Statuses</option>
                           <option value="completed">Completed</option>
                           <option value="pending">Pending</option>
                           <option value="refunded">Refunded</option>
                           <option value="disputed">Disputed</option>
                        </select>
                     </div>
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date</label>
                        <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none" />
                     </div>
                     <div className="w-full md:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">End Date</label>
                        <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-zinc-600 focus:outline-none" />
                     </div>
                     <button onClick={fetchFilteredReports} className="w-full md:w-auto bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-6 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                        <Filter className="w-4 h-4"/> Apply Filters
                     </button>
                  </div>

                  {/* Transactions Table */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl mb-8">
                     <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900">
                        <h3 className="font-semibold text-zinc-100">Filtered Transactions List</h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">
                           <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                              <tr>
                                 <th className="px-6 py-4">ID / Date</th>
                                 <th className="px-6 py-4">Entities</th>
                                 <th className="px-6 py-4">Status</th>
                                 <th className="px-6 py-4 text-right">Value</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {reportTransactions.map(tx => (
                                 <tr key={tx.transaction_id} className="hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="font-mono text-zinc-300">#{tx.transaction_id}</div>
                                       <div className="text-xs mt-1">{new Date(tx.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <div className="text-xs text-zinc-300"><span className="text-zinc-500">B:</span> {tx.buyer?.email || 'N/A'}</div>
                                       <div className="text-xs mt-1 text-zinc-300"><span className="text-zinc-500">S:</span> {tx.seller?.email || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                          tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                          tx.status === 'disputed' ? 'bg-red-500/10 text-red-400' :
                                          'bg-zinc-800 text-zinc-400'
                                       }`}>
                                          {tx.status}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold text-zinc-200">
                                       ₱{Number(tx.total_amount).toLocaleString()}
                                    </td>
                                 </tr>
                              ))}
                              {reportTransactions.length === 0 && (
                                 <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No transactions match the current filters.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
                  
                  {/* Immutable Audit Log Preview */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
                     <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                        <h3 className="font-semibold text-zinc-100 flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-400"/> System Action Ledger</h3>
                        <span className="text-xs text-zinc-500">Last 1000 events</span>
                     </div>
                     <div className="overflow-x-auto max-h-96 custom-scrollbar">
                        <table className="w-full text-left text-xs text-zinc-400">
                           <thead className="bg-zinc-950/50 uppercase font-semibold text-zinc-500 border-b border-zinc-800 sticky top-0 backdrop-blur-md">
                              <tr>
                                 <th className="px-6 py-3">Timestamp</th>
                                 <th className="px-6 py-3">Action</th>
                                 <th className="px-6 py-3">User Node</th>
                                 <th className="px-6 py-3">Description</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {auditLogs.map(log => (
                                 <tr key={log.log_id} className="hover:bg-zinc-800/20">
                                    <td className="px-6 py-3 font-mono text-zinc-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-3">
                                       <span className="bg-zinc-800/50 px-2 py-0.5 rounded text-zinc-300 font-mono">{log.action_type}</span>
                                    </td>
                                    <td className="px-6 py-3 text-zinc-300">{log.user?.email || 'System'} (ID:{log.user_id})</td>
                                    <td className="px-6 py-3 text-zinc-500 truncate max-w-xs">{log.action_description}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB: DISPUTES */}
            {activeTab === "DISPUTES" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-8">
                     <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Disputes</h1>
                     <p className="text-sm text-zinc-400">Review mediation requests and distribute funds based on transaction evidence.</p>
                  </header>

                  {disputes.length === 0 ? (
                     <div className="text-center py-16 border border-zinc-800 rounded-xl flex flex-col items-center bg-zinc-900/10">
                        <ShieldAlert className="w-8 h-8 text-zinc-600 mb-3" />
                        <h3 className="text-zinc-200 font-medium text-sm">No Active Disputes</h3>
                        <p className="text-xs text-zinc-500 mt-1">All escrow transactions are resolving smoothly.</p>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        {disputes.map(d => (
                           <div key={d.dispute_id} className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                              <div className="p-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
                                 <div>
                                    <div className="flex items-center gap-3 mb-1">
                                       <span className="text-zinc-100 font-medium text-base">Transaction #{d.transaction_id}</span>
                                       <a href={`/trade/${d.transaction_id}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-xs">View Hub <ExternalLink className="w-3 h-3"/></a>
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-2">Reason: <span className="text-zinc-300 italic">"{d.description}"</span></p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xs text-zinc-500 font-medium mb-1">Escrow Value</p>
                                    <p className="text-lg text-zinc-100 font-semibold tracking-tight">₱{Number(d.transaction?.total_amount || 0).toLocaleString()}</p>
                                 </div>
                              </div>
                              
                              <div className="p-5 flex gap-6 flex-col lg:flex-row">
                                 <div className="lg:w-2/3 border border-zinc-800 rounded-lg bg-zinc-950 p-4 flex flex-col h-72">
                                    <h4 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><Clock className="w-3 h-3"/> Activity Logs</h4>
                                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                       {d.transaction?.messages && d.transaction.messages.length > 0 ? (
                                          d.transaction.messages.map((msg: any) => (
                                             <div key={msg.message_id} className={`text-sm p-3 rounded-lg border ${msg.is_system_generated ? 'bg-zinc-900 text-zinc-400 border-zinc-800 text-center text-xs mx-auto max-w-[80%]' : (msg.sender_id === d.transaction.buyer_id ? 'bg-zinc-800/40 text-zinc-200 border-zinc-700/50 mr-8' : 'bg-zinc-800/80 text-zinc-100 border-zinc-700 ml-8')}`}>
                                                <div className="text-[10px] uppercase text-zinc-500 font-medium mb-1 flex justify-between">
                                                   <span>{msg.is_system_generated ? 'System' : (msg.sender_id === d.transaction.buyer_id ? 'Buyer' : 'Seller')}</span>
                                                   <span>{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span>{msg.message_text}</span>
                                             </div>
                                          ))
                                       ) : (
                                          <div className="flex-1 flex items-center justify-center text-xs text-zinc-600">No chat history recorded.</div>
                                       )}
                                    </div>
                                 </div>
                                 
                                 <div className="lg:w-1/3 flex flex-col justify-center gap-3">
                                    <h4 className="text-zinc-100 text-sm font-medium mb-1">Resolution Action</h4>
                                    <p className="text-xs text-zinc-400 mb-4">Review the activity logs. Overriding the vault relies on human discretion and cannot be reversed.</p>
                                    
                                    <button 
                                       onClick={() => setResolveModalState({ isOpen: true, txId: d.transaction_id, action: 'FORWARD_TO_SELLER'})} 
                                       className="w-full bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 hover:bg-emerald-600/20 font-bold tracking-wider uppercase text-xs px-4 py-3 rounded-md transition-colors shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                    >
                                       Release to Seller
                                    </button>
                                    
                                    <div className="relative flex items-center py-2">
                                       <div className="flex-grow border-t border-zinc-800"></div>
                                       <span className="flex-shrink-0 mx-3 text-zinc-600 text-[10px] uppercase font-bold">or</span>
                                       <div className="flex-grow border-t border-zinc-800"></div>
                                    </div>
                                    
                                    <button 
                                       onClick={() => setResolveModalState({ isOpen: true, txId: d.transaction_id, action: 'REFUND_BUYER'})} 
                                       className="w-full bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20 font-bold tracking-wider uppercase text-xs px-4 py-3 rounded-md transition-colors shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                    >
                                       Refund to Buyer
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {activeTab === "KYC" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-8">
                     <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Identity Verification</h1>
                     <p className="text-sm text-zinc-400">Manual review pipeline for users requiring human confirmation.</p>
                  </header>

                  {kycs.length === 0 ? (
                     <div className="text-center py-16 border border-zinc-800 rounded-xl flex flex-col items-center bg-zinc-900/10">
                        <CheckCircle className="w-8 h-8 text-zinc-600 mb-3" />
                        <h3 className="text-zinc-200 font-medium text-sm">Review Queue Empty</h3>
                        <p className="text-xs text-zinc-500 mt-1">All identities are verified by the automated system.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {kycs.map((k: any) => (
                           <div key={k.kyc_id} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30 flex flex-col">
                              <div className="flex items-start justify-between mb-4">
                                 <div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider mb-2 inline-block ${
                                       k.status === 'pending_review' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                       k.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                       'bg-zinc-800 text-zinc-300'
                                    }`}>{k.status?.replace(/_/g, ' ')}</span>
                                    <h3 className="text-base font-medium text-zinc-100 truncate max-w-[200px]">{k.user?.email}</h3>
                                    <p className="text-sm text-zinc-400 mt-1">{k.user?.first_name} {k.user?.last_name}</p>
                                 </div>
                                 <div className="text-right flex flex-col items-end">
                                    <span className="text-xs bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-zinc-300">{k.id_type}</span>
                                    {k.match_distance !== null && k.match_distance !== undefined && (
                                       <p className={`text-xs font-mono mt-2 px-2 py-0.5 rounded ${k.match_distance < 0.45 ? 'bg-green-500/10 text-green-400' : k.match_distance < 0.55 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                                          Distance: {Number(k.match_distance).toFixed(4)}
                                       </p>
                                    )}
                                 </div>
                              </div>

                              {k.rejection_reason && (
                                 <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-4">
                                    <p className="text-xs text-red-400">{k.rejection_reason}</p>
                                 </div>
                              )}

                              {k.ocr_raw_text && (
                                 <details className="mb-4">
                                    <summary className="text-[10px] uppercase font-semibold text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors">OCR Extracted Text</summary>
                                    <pre className="mt-2 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap">{k.ocr_raw_text}</pre>
                                 </details>
                              )}

                              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-5 group">
                                 <h4 className="text-[10px] uppercase font-semibold text-zinc-500 mb-2 flex items-center gap-2"><Key className="w-3 h-3"/> Documents ({k.images?.length || 0})</h4>
                                 <div className="grid grid-cols-2 gap-2">
                                    {k.images?.map((img: any, idx: number) => (
                                       <div key={idx} className="relative aspect-video bg-zinc-900 rounded border border-zinc-800 overflow-hidden">
                                          <div className="absolute top-1 left-1 z-10">
                                             <span className="bg-zinc-900/80 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded uppercase">{img.image_type}</span>
                                          </div>
                                          <img src={img.file_path?.startsWith('/') ? `${API_URL}${img.file_path}` : img.file_path} className="w-full h-full object-cover opacity-90" alt={img.image_type}/>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              <div className="flex gap-3 mt-auto">
                                 <button 
                                    onClick={() => handleResolveKyc(k.kyc_id, 'verified')} 
                                    className="flex-1 bg-white text-black hover:bg-zinc-200 text-sm font-medium py-2 rounded-md transition-colors"
                                 >
                                    Approve
                                 </button>
                                 <button 
                                    onClick={() => handleResolveKyc(k.kyc_id, 'rejected')} 
                                    className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800 text-sm font-medium py-2 rounded-md transition-colors"
                                 >
                                    Reject
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* TAB: USERS */}
            {activeTab === "USERS" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Users</h1>
                        <p className="text-sm text-zinc-400">Manage all accounts registered on the platform.</p>
                     </div>
                     <div className="relative w-full sm:w-auto">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                           type="text" 
                           placeholder="Search users..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full sm:w-64 bg-zinc-900/50 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                        />
                     </div>
                  </header>

                  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-zinc-900/80 text-xs font-medium text-zinc-400 border-b border-zinc-800">
                              <tr>
                                 <th className="px-5 py-3 font-medium">User</th>
                                 <th className="px-5 py-3 font-medium">Role</th>
                                 <th className="px-5 py-3 font-medium">Joined</th>
                                 <th className="px-5 py-3 font-medium">Status</th>
                                 <th className="px-5 py-3 font-medium text-right">Action</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                              {filteredUsers.map(u => (
                                 <tr key={u.user_id} className="hover:bg-zinc-800/20 transition-colors">
                                    <td className="px-5 py-3.5">
                                       <div className="flex flex-col">
                                          <span className="text-zinc-100 font-medium">{u.first_name || 'No Name'} {u.last_name || ''}</span>
                                          <span className="text-xs text-zinc-500 mt-0.5">{u.email}</span>
                                       </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                       <span className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase ${u.role === 'admin' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500 border border-zinc-800/50'}`}>
                                          {u.role}
                                       </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                                       {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-3.5">
                                       {u.is_banned ? (
                                          <span className="flex items-center gap-1.5 text-zinc-400 text-xs"><Ban className="w-3.5 h-3.5 text-zinc-500"/> Suspended</span>
                                       ) : (
                                          <span className="flex items-center gap-1.5 text-zinc-300 text-xs"><CheckCircle className="w-3.5 h-3.5 text-zinc-500"/> Active</span>
                                       )}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                       {u.role !== 'admin' && (
                                          <button 
                                             onClick={() => handleToggleBan(u.user_id, u.is_banned)} 
                                             className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${u.is_banned ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'}`}
                                          >
                                             {u.is_banned ? 'Unsuspend' : 'Suspend'}
                                          </button>
                                       )}
                                       {u.role === 'admin' && (
                                          <span className="text-xs text-zinc-600 block px-3 py-1.5">—</span>
                                       )}
                                    </td>
                                 </tr>
                              ))}
                              {filteredUsers.length === 0 && (
                                 <tr>
                                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-500">No users found matching query.</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {activeTab === "SETTINGS" && (
               <div className="animate-in fade-in duration-300 max-w-lg">
                  <header className="mb-8">
                     <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Platform Settings</h1>
                     <p className="text-sm text-zinc-400">Manage global platform parameters, billing, and KYC thresholds.</p>
                  </header>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6">
                     <div className="flex flex-col gap-5">
                        <div>
                           <label className="block text-sm font-medium text-zinc-200 mb-1">Base Platform Fee</label>
                           <p className="text-xs text-zinc-500 mb-3">Defines the percentage deducted from completed escrow payouts.</p>
                           
                           <div className="flex relative max-w-[200px]">
                              <input 
                                 type="text" 
                                 value={feeInput}
                                 onChange={(e) => setFeeInput(e.target.value)}
                                 className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 pl-3 pr-8 text-zinc-100 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none">%</div>
                           </div>
                        </div>

                        <div className="pt-5 border-t border-zinc-800">
                           <label className="block text-sm font-medium text-zinc-200 mb-1">KYC Biometric Thresholds</label>
                           <p className="text-xs text-zinc-500 mb-4">Controls the face match distance boundaries. Lower = stricter matching.</p>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-[10px] uppercase font-semibold text-zinc-500 mb-1.5 block tracking-wider">Auto-Reject (≥)</label>
                                 <input 
                                    type="text" 
                                    value={biometricThreshold}
                                    onChange={(e) => setBiometricThreshold(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-zinc-100 text-sm focus:outline-none focus:border-zinc-600 transition-colors font-mono"
                                    placeholder="0.55"
                                 />
                              </div>
                              <div>
                                 <label className="text-[10px] uppercase font-semibold text-zinc-500 mb-1.5 block tracking-wider">Auto-Approve ({'<'})</label>
                                 <input 
                                    type="text" 
                                    value={reviewThreshold}
                                    onChange={(e) => setReviewThreshold(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-zinc-100 text-sm focus:outline-none focus:border-zinc-600 transition-colors font-mono"
                                    placeholder="0.45"
                                 />
                              </div>
                           </div>
                           <p className="text-[10px] text-zinc-600 mt-2">Distances between Auto-Approve and Auto-Reject will be sent to manual admin review.</p>
                        </div>

                        <div className="pt-5 border-t border-zinc-800">
                           <button 
                              onClick={handleUpdateSettings} 
                              className="bg-white text-black hover:bg-zinc-200 font-medium text-sm px-4 py-2 rounded-md transition-colors"
                           >
                              Save Changes
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

         </div>
      </div>

      {/* ADMIN HIGH-FRICTION RESOLVE MODAL */}
      {resolveModalState.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.15)]">
               <div className="p-6 border-b border-zinc-800 bg-red-500/5">
                  <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                     <ShieldAlert className="w-6 h-6" /> Root Execution Authority
                  </h3>
                  <p className="text-zinc-400 text-sm mt-2">You are bypassing the Smart Vault logic to forcefully route funds.</p>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                     <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Target Action</p>
                     <p className="text-white font-medium">
                        {resolveModalState.action === 'REFUND_BUYER' ? (
                           <span className="text-red-400">Forcefully REFUND funds to the BUYER.</span>
                        ) : (
                           <span className="text-emerald-400">Forcefully RELEASE funds to the SELLER.</span>
                        )}
                     </p>
                  </div>

                  <div>
                     <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
                        Type <span className="text-red-500 select-none">CONFIRM</span> to execute
                     </label>
                     <input 
                        type="text" 
                        value={resolveConfirmText}
                        onChange={(e) => setResolveConfirmText(e.target.value)}
                        placeholder="CONFIRM"
                        className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg focus:outline-none focus:border-red-500 font-mono tracking-widest uppercase"
                        disabled={isResolving}
                     />
                  </div>
               </div>

               <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex gap-3">
                  <button 
                     onClick={() => { setResolveModalState({isOpen: false, txId: null, action: null}); setResolveConfirmText(""); }}
                     className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                     disabled={isResolving}
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={confirmResolve}
                     disabled={resolveConfirmText !== 'CONFIRM' || isResolving}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 disabled:text-white/30 text-white font-bold rounded-lg transition-colors flex justify-center items-center gap-2 uppercase tracking-widest text-xs"
                  >
                     {isResolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Execute Override"}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
