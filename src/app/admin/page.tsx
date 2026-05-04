"use client";
import { useSession } from 'next-auth/react';
import { useEffect, useState } from "react";
import { ShieldAlert, Activity, CheckCircle, Search, FileText, Users, Settings, Server, Clock, Lock, Globe, Power, Key, ChevronRight, Ban, Check, ExternalLink, RefreshCw, Download, PieChart, BarChart as BarChartIcon, Filter, ImageIcon, X, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { DisputeCardSkeleton } from '@/components/ui/DisputeCardSkeleton';
import { useDelayedSkeleton } from '@/hooks/useDelayedSkeleton';

type TabState = "OVERVIEW" | "REPORTS" | "DISPUTES" | "KYC" | "USERS" | "SETTINGS" | "RISK";

export default function AdminDashboard() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<TabState>("OVERVIEW");
  const [kycSubTab, setKycSubTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [disputeSubTab, setDisputeSubTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [kycSearchQuery, setKycSearchQuery] = useState("");
  const [disputeSearchQuery, setDisputeSearchQuery] = useState("");
  const [reportListView, setReportListView] = useState<"TRANSACTIONS" | "USERS" | "DISPUTES" | "VOLUME">("TRANSACTIONS");

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
  const showSkeleton = useDelayedSkeleton(isLoading, 200);

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

  // Risk & Fraud
  const [riskTransactions, setRiskTransactions] = useState<any[]>([]);
  const [timelineModal, setTimelineModal] = useState<{isOpen: boolean, userId: number | null, data: any | null}>({isOpen: false, userId: null, data: null});
  const [tradeTimelineModal, setTradeTimelineModal] = useState<{isOpen: boolean, txId: number | null, logs: any[]}>({isOpen: false, txId: null, logs: []});
  
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

        const riskRes = await fetch(`${API_URL}/api/admin/risk-transactions`, { headers: { "Authorization": `Bearer ${token}` } });
        if (riskRes.ok) { const d = await riskRes.json(); setRiskTransactions(d.transactions); }
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
  const handleToggleFreeze = async (txId: number, currentStatus: string) => {
      const isFrozen = currentStatus === 'frozen';
      if (!confirm(`Are you sure you want to ${isFrozen ? 'release' : 'freeze'} this transaction?`)) return;
      try {
         const res = await fetch(`${API_URL}/api/admin/risk-transactions/${txId}/freeze`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: isFrozen ? 'release' : 'freeze' })
         });
         if (res.ok) {
            toast.success(`Transaction successfully ${isFrozen ? 'released' : 'frozen'}.`);
            loadData();
         } else {
            toast.error("Failed to update transaction status.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

   const handleViewTimeline = async (userId: number) => {
      try {
         const res = await fetch(`${API_URL}/api/admin/users/${userId}/timeline`, {
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) {
            const data = await res.json();
            setTimelineModal({ isOpen: true, userId, data: data.timeline });
         } else {
            toast.error("Failed to load user timeline.");
         }
      } catch(e) { toast.error("Server API Error"); }
  };

   const handleViewTradeTimeline = async (txId: number) => {
      try {
         const res = await fetch(`${API_URL}/api/admin/trades/${txId}/audit-timeline`, {
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) {
            const data = await res.json();
            setTradeTimelineModal({ isOpen: true, txId, logs: data.logs });
         } else {
            toast.error("Failed to load trade audit timeline.");
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
         const filterParams = `status=${reportStatus}&startDate=${reportStartDate}&endDate=${reportEndDate}`;
         const [txRes, chartRes] = await Promise.all([
            fetch(`${API_URL}/api/admin/reports/transactions?${filterParams}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/admin/reports/charts?${filterParams}`, { headers: { "Authorization": `Bearer ${token}` } }),
         ]);
         if (txRes.ok) {
            const d = await txRes.json();
            setReportTransactions(d.transactions);
         }
         if (chartRes.ok) {
            const d = await chartRes.json();
            setChartData(d.timelineData);
         }
         toast.success("Report data refreshed.");
      } catch (e) { toast.error("Failed to filter reports."); }
  };

  const clearFilters = async () => {
      setReportStatus("all");
      setReportStartDate("");
      setReportEndDate("");
      try {
         const [txRes, chartRes] = await Promise.all([
            fetch(`${API_URL}/api/admin/reports/transactions?status=all&startDate=&endDate=`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/admin/reports/charts?startDate=&endDate=&status=all`, { headers: { "Authorization": `Bearer ${token}` } }),
         ]);
         if (txRes.ok) { const d = await txRes.json(); setReportTransactions(d.transactions); }
         if (chartRes.ok) { const d = await chartRes.json(); setChartData(d.timelineData); }
         toast.success("Filters cleared.");
      } catch (e) { toast.error("Failed to reset filters."); }
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
      {/* Sidebar Navigation — fixed position */}
      <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col pt-6 shrink-0 z-20 fixed top-0 left-0 h-screen overflow-y-auto">
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
              { id: "RISK", icon: AlertTriangle, label: "Risk & Fraud", badge: riskTransactions.filter(t => t.risk_score >= 60).length > 0 ? riskTransactions.filter(t => t.risk_score >= 60).length : null },
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

      {/* Main Content Area — offset by sidebar width */}
      <div className="flex-1 ml-64 px-8 py-8 lg:px-12 relative min-h-screen">
         {/* Fullscreen Image Hover Modal */}
         {hoveredImage && (
            <div 
               className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
               onClick={() => setHoveredImage(null)}
            >
               <img src={hoveredImage} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl border border-zinc-800" alt="Fullscreen preview" />
               <div className="absolute top-6 right-6 bg-zinc-900 text-zinc-300 px-4 py-2 rounded-md font-medium text-sm border border-zinc-800">
                  Click anywhere to close
               </div>
            </div>
         )}

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

                  {/* Filters — placed above charts so changes feel immediate */}
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
                     {(reportStatus !== 'all' || reportStartDate || reportEndDate) && (
                        <button onClick={clearFilters} className="w-full md:w-auto bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                           <X className="w-4 h-4"/> Clear Filters
                        </button>
                     )}
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2">
                           <Activity className="w-4 h-4 text-emerald-500"/>
                           User Signups {reportStartDate && reportEndDate ? `(${reportStartDate} — ${reportEndDate})` : '(Last 30 Days)'}
                        </h3>
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
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                 <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="New Users" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2">
                           <BarChartIcon className="w-4 h-4 text-blue-500"/>
                           Transactions {reportStatus !== 'all' ? `(${reportStatus})` : ''} {reportStartDate && reportEndDate ? `(${reportStartDate} — ${reportEndDate})` : '(Last 30 Days)'}
                        </h3>
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
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                 <Area type="monotone" dataKey="transactions" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTxs)" name="Transactions" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>

                  {/* Row 2: Disputes + Volume */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2">
                           <ShieldAlert className="w-4 h-4 text-amber-500"/>
                           Disputes {reportStartDate && reportEndDate ? `(${reportStartDate} — ${reportEndDate})` : '(Last 30 Days)'}
                        </h3>
                        <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData}>
                                 <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                 <Bar dataKey="disputes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Disputes" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                     <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h3 className="text-zinc-100 font-medium text-sm mb-6 flex items-center gap-2">
                           <PieChart className="w-4 h-4 text-purple-500"/>
                           Trade Volume (₱) {reportStartDate && reportEndDate ? `(${reportStartDate} — ${reportEndDate})` : '(Last 30 Days)'}
                        </h3>
                        <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartData}>
                                 <defs>
                                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                 <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} formatter={(value: any) => [`₱${Number(value).toLocaleString()}`, 'Volume']} />
                                 <Area type="monotone" dataKey="volume" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorVolume)" name="Volume" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>

                  {/* Data List with View Selector */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl mb-8">
                     <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="font-semibold text-zinc-100">Filtered Data</h3>
                        <div className="flex gap-1 bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                           {([
                              { id: "TRANSACTIONS", label: "Transactions" },
                              { id: "USERS", label: "Users" },
                              { id: "DISPUTES", label: "Disputes" },
                              { id: "VOLUME", label: "Trade Volume" },
                           ] as const).map(v => (
                              <button
                                 key={v.id}
                                 onClick={() => setReportListView(v.id)}
                                 className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${reportListView === v.id ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                 {v.label}
                              </button>
                           ))}
                        </div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">

                           {/* TRANSACTIONS VIEW */}
                           {reportListView === "TRANSACTIONS" && (<>
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
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No transactions match the current filters.</td></tr>
                                 )}
                              </tbody>
                           </>)}

                           {/* USERS VIEW */}
                           {reportListView === "USERS" && (<>
                              <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                                 <tr>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Joined</th>
                                    <th className="px-6 py-4">Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                 {users.map(u => (
                                    <tr key={u.user_id} className="hover:bg-zinc-800/20 transition-colors">
                                       <td className="px-6 py-4">
                                          <div className="text-zinc-200 font-medium">{u.first_name} {u.last_name}</div>
                                          <div className="text-xs text-zinc-500 mt-0.5">ID: {u.user_id}</div>
                                       </td>
                                       <td className="px-6 py-4 text-zinc-300">{u.email}</td>
                                       <td className="px-6 py-4 text-zinc-400">{new Date(u.created_at).toLocaleDateString()}</td>
                                       <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.is_banned ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                             {u.is_banned ? 'Banned' : 'Active'}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                                 {users.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No users found.</td></tr>
                                 )}
                              </tbody>
                           </>)}

                           {/* DISPUTES VIEW */}
                           {reportListView === "DISPUTES" && (<>
                              <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                                 <tr>
                                    <th className="px-6 py-4">TX ID</th>
                                    <th className="px-6 py-4">Type / Reason</th>
                                    <th className="px-6 py-4">Raised</th>
                                    <th className="px-6 py-4">Resolution</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                 {disputes.map(d => (
                                    <tr key={d.dispute_id} className="hover:bg-zinc-800/20 transition-colors">
                                       <td className="px-6 py-4 font-mono text-zinc-300">#{d.transaction_id}</td>
                                       <td className="px-6 py-4">
                                          <div className="text-zinc-300 text-xs">{d.dispute_type || 'General'}</div>
                                          <div className="text-zinc-500 text-xs mt-0.5 truncate max-w-[200px]">{d.description}</div>
                                       </td>
                                       <td className="px-6 py-4 text-zinc-400 text-xs">{d.raised_at ? new Date(d.raised_at).toLocaleDateString() : 'N/A'}</td>
                                       <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${d.resolution ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                             {d.resolution ? d.resolution.replace(/_/g, ' ') : 'Pending'}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                                 {disputes.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No disputes found.</td></tr>
                                 )}
                              </tbody>
                           </>)}

                           {/* VOLUME VIEW */}
                           {reportListView === "VOLUME" && (<>
                              <thead className="bg-zinc-950/50 text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                                 <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">New Users</th>
                                    <th className="px-6 py-4">Transactions</th>
                                    <th className="px-6 py-4">Disputes</th>
                                    <th className="px-6 py-4 text-right">Volume (₱)</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-800/50">
                                 {chartData.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                                       <td className="px-6 py-3 text-zinc-300 font-medium">{row.date}</td>
                                       <td className="px-6 py-3 text-zinc-400">{row.users}</td>
                                       <td className="px-6 py-3 text-zinc-400">{row.transactions}</td>
                                       <td className="px-6 py-3 text-zinc-400">{row.disputes}</td>
                                       <td className="px-6 py-3 text-right text-zinc-200 font-semibold">₱{Number(row.volume || 0).toLocaleString()}</td>
                                    </tr>
                                 ))}
                                 {chartData.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">No volume data available.</td></tr>
                                 )}
                              </tbody>
                           </>)}

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

            {activeTab === "DISPUTES" && (() => {
               const filteredDisputes = disputes.filter(d => {
                  const matchesTab = disputeSubTab === "ACTIVE" ? !d.resolution : d.resolution;
                  if (!matchesTab) return false;
                  if (!disputeSearchQuery) return true;
                  const q = disputeSearchQuery.toLowerCase();
                  return (
                     String(d.transaction_id).includes(q) ||
                     (d.description || '').toLowerCase().includes(q) ||
                     (d.raiser?.email || '').toLowerCase().includes(q) ||
                     (d.dispute_type || '').toLowerCase().includes(q)
                  );
               });

               return (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Disputes</h1>
                        <p className="text-sm text-zinc-400">Review mediation requests and distribute funds based on transaction evidence.</p>
                     </div>
                     <div className="relative w-full sm:w-auto">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                           type="text" 
                           placeholder="Search by TX ID, reason, email..." 
                           value={disputeSearchQuery}
                           onChange={(e) => setDisputeSearchQuery(e.target.value)}
                           className="w-full sm:w-72 bg-zinc-900/50 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                        />
                     </div>
                  </header>

                  <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-px">
                     <button 
                        onClick={() => setDisputeSubTab("ACTIVE")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${disputeSubTab === "ACTIVE" ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                     >
                        Active Disputes ({disputes.filter(d => !d.resolution).length})
                     </button>
                     <button 
                        onClick={() => setDisputeSubTab("HISTORY")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${disputeSubTab === "HISTORY" ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                     >
                        Resolution History ({disputes.filter(d => d.resolution).length})
                     </button>
                     {disputeSearchQuery && (
                        <span className="ml-auto text-xs text-zinc-500">{filteredDisputes.length} result{filteredDisputes.length !== 1 ? 's' : ''}</span>
                     )}
                  </div>

                  {showSkeleton ? (
                     <div className="space-y-6">
                        <DisputeCardSkeleton />
                        <DisputeCardSkeleton />
                     </div>
                  ) : filteredDisputes.length === 0 ? (
                     <div className="text-center py-16 border border-zinc-800 rounded-xl flex flex-col items-center bg-zinc-900/10">
                        <ShieldAlert className="w-8 h-8 text-zinc-600 mb-3" />
                        <h3 className="text-zinc-200 font-medium text-sm">{disputeSubTab === "ACTIVE" ? "No Active Disputes" : "No Dispute History"}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{disputeSubTab === "ACTIVE" ? "All escrow transactions are resolving smoothly." : "No disputes have been resolved yet."}</p>
                     </div>
                  ) : (
                     <div className="space-y-6">
                        {filteredDisputes.map(d => (
                           <div key={d.dispute_id} className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden">
                              <div className="p-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
                                 <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-1">
                                       <span className="text-zinc-100 font-medium text-base">Transaction #{d.transaction_id}</span>
                                       <a href={`/trade/${d.transaction_id}`} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 text-xs">View Hub <ExternalLink className="w-3 h-3"/></a>
                                       <button onClick={() => handleViewTradeTimeline(d.transaction_id)} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                          <Clock className="w-3 h-3"/> Forensic Timeline
                                       </button>
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
                                 
                                 {disputeSubTab === "ACTIVE" && (
                                    <div className="lg:w-1/3 flex flex-col justify-center gap-3">
                                       <h4 className="text-zinc-100 text-sm font-medium mb-1">Resolution Action</h4>
                                       <p className="text-xs text-zinc-400 mb-4">Review the activity logs. Resolving the dispute relies on human discretion and cannot be reversed.</p>
                                       
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
                                 )}
                                 
                                 {disputeSubTab === "HISTORY" && (
                                    <div className="lg:w-1/3 flex flex-col justify-center gap-3">
                                       <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
                                          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                          <h4 className="text-zinc-100 text-sm font-medium">Resolved</h4>
                                          <p className="text-xs text-zinc-400 mt-1 capitalize">{d.resolution?.replace(/_/g, ' ')}</p>
                                       </div>
                                    </div>
                                 )}
                              </div>
                              
                              <div className="p-5 border-t border-zinc-800 bg-zinc-950/30">
                                 <h4 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"><ImageIcon className="w-3 h-3"/> Submitted Evidence</h4>
                                 {d.evidence && d.evidence.length > 0 ? (
                                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                       {d.evidence.map((ev: any) => (
                                          <div 
                                             key={ev.id} 
                                             onClick={() => {
                                                if (ev.mime_type === 'application/pdf') window.open(ev.file_url, '_blank');
                                                else setHoveredImage(ev.file_url);
                                             }}
                                             className="flex-shrink-0 group relative block w-40 h-28 rounded-lg overflow-hidden border border-zinc-800 hover:border-blue-500/50 transition-colors bg-zinc-900 cursor-pointer"
                                          >
                                             {ev.mime_type === 'application/pdf' ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 group-hover:text-blue-400">
                                                   <FileText className="w-8 h-8 mb-2" />
                                                   <span className="text-[10px] truncate max-w-[90%]">{ev.original_name}</span>
                                                </div>
                                             ) : (
                                                <>
                                                   <img src={ev.file_url} alt="Evidence" className="w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300" />
                                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                      <span className="text-white text-xs font-medium">Click to expand</span>
                                                   </div>
                                                </>
                                             )}
                                             <div className="absolute top-1 left-1 bg-black/60 text-[9px] px-1.5 py-0.5 rounded text-zinc-300">
                                                {ev.uploaded_by === d.transaction.buyer_id ? 'Buyer' : 'Seller'}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 ) : (
                                    <p className="text-xs text-zinc-600">No evidence files provided.</p>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            );})()}

            {activeTab === "KYC" && (() => {
               const filteredKycs = kycs.filter(k => {
                  const matchesTab = kycSubTab === "ACTIVE" ? k.status === 'pending_review' : k.status !== 'pending_review';
                  if (!matchesTab) return false;
                  if (!kycSearchQuery) return true;
                  const q = kycSearchQuery.toLowerCase();
                  return (
                     (k.user?.email || '').toLowerCase().includes(q) ||
                     (k.user?.first_name || '').toLowerCase().includes(q) ||
                     (k.user?.last_name || '').toLowerCase().includes(q) ||
                     (k.id_type || '').toLowerCase().includes(q) ||
                     (k.status || '').toLowerCase().includes(q)
                  );
               });

               return (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Identity Verification</h1>
                        <p className="text-sm text-zinc-400">Manual review pipeline for users requiring human confirmation.</p>
                     </div>
                     <div className="relative w-full sm:w-auto">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                           type="text" 
                           placeholder="Search by email, name, ID type..." 
                           value={kycSearchQuery}
                           onChange={(e) => setKycSearchQuery(e.target.value)}
                           className="w-full sm:w-72 bg-zinc-900/50 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
                        />
                     </div>
                  </header>

                  <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-px">
                     <button 
                        onClick={() => setKycSubTab("ACTIVE")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${kycSubTab === "ACTIVE" ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                     >
                        Pending Review ({kycs.filter(k => k.status === 'pending_review').length})
                     </button>
                     <button 
                        onClick={() => setKycSubTab("HISTORY")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${kycSubTab === "HISTORY" ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                     >
                        Verified / Rejected ({kycs.filter(k => k.status !== 'pending_review').length})
                     </button>
                     {kycSearchQuery && (
                        <span className="ml-auto text-xs text-zinc-500">{filteredKycs.length} result{filteredKycs.length !== 1 ? 's' : ''}</span>
                     )}
                  </div>

                  {filteredKycs.length === 0 ? (
                     <div className="text-center py-16 border border-zinc-800 rounded-xl flex flex-col items-center bg-zinc-900/10">
                        <CheckCircle className="w-8 h-8 text-zinc-600 mb-3" />
                        <h3 className="text-zinc-200 font-medium text-sm">{kycSubTab === "ACTIVE" ? "Review Queue Empty" : "No History Found"}</h3>
                        <p className="text-xs text-zinc-500 mt-1">{kycSubTab === "ACTIVE" ? "All identities are verified by the automated system." : "No processed records yet."}</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredKycs.map((k: any) => (
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

                              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-5">
                                 <h4 className="text-[10px] uppercase font-semibold text-zinc-500 mb-2 flex items-center gap-2"><Key className="w-3 h-3"/> Documents</h4>
                                 <div className="grid grid-cols-2 gap-2">
                                    {['Front', 'Selfie'].map((type) => {
                                       const img = k.images?.find((i: any) => i.image_type === type);
                                       const imgUrl = img ? (() => {
                                          const fp = img.file_path || '';
                                          return `${API_URL}/api/kyc/files/${fp.split('/').pop()}?token=${token}`;
                                       })() : null;

                                       return (
                                          <div key={type} className="relative aspect-video bg-zinc-900 rounded border border-zinc-800 overflow-hidden group cursor-pointer" onClick={() => imgUrl && setHoveredImage(imgUrl)}>
                                             <div className="absolute top-1 left-1 z-10">
                                                <span className="bg-zinc-900/80 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded uppercase">{type === 'Front' ? 'ID Document' : 'Live Selfie'}</span>
                                             </div>
                                             {imgUrl ? (
                                                <img src={imgUrl} className="w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300" alt={type}/>
                                             ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs flex-col gap-1">
                                                   <ImageIcon className="w-4 h-4 opacity-50" />
                                                   <span>Missing</span>
                                                </div>
                                             )}
                                             {imgUrl && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                   <span className="text-white text-xs font-medium">Click to expand</span>
                                                </div>
                                             )}
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>

                              {kycSubTab === "ACTIVE" && (
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
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            );})()}

            {/* TAB: RISK */}
            {activeTab === "RISK" && (
               <div className="animate-in fade-in duration-300">
                  <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h1 className="text-2xl font-semibold text-zinc-100 mb-1">Risk & Fraud</h1>
                        <p className="text-sm text-zinc-500">Monitor flagged transactions and suspicious behaviors across the platform.</p>
                     </div>
                  </header>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-zinc-950/50 border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wider">
                              <th className="px-6 py-4 font-medium">Tx ID</th>
                              <th className="px-6 py-4 font-medium">Risk Score</th>
                              <th className="px-6 py-4 font-medium">Status</th>
                              <th className="px-6 py-4 font-medium">Buyer</th>
                              <th className="px-6 py-4 font-medium">Seller</th>
                              <th className="px-6 py-4 font-medium">Risk Flags</th>
                              <th className="px-6 py-4 font-medium text-right">Actions</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-sm">
                           {riskTransactions.length === 0 ? (
                              <tr>
                                 <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    No high-risk transactions detected.
                                 </td>
                              </tr>
                           ) : riskTransactions.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                                 <td className="px-6 py-4 font-mono text-zinc-300">#{tx.transaction_id}</td>
                                 <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${tx.risk_score >= 80 ? 'bg-red-500/10 text-red-500' : tx.risk_score >= 60 ? 'bg-orange-500/10 text-orange-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                       {tx.risk_score} / 100
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                       tx.status === 'frozen' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    }`}>
                                       {tx.status}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-zinc-300">
                                    <div className="flex flex-col">
                                       <span>{tx.buyer?.email}</span>
                                       <button onClick={() => handleViewTimeline(tx.buyer_id)} className="text-xs text-green-500 hover:text-green-400 text-left mt-1">View Timeline</button>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-zinc-300">
                                    <div className="flex flex-col">
                                       <span>{tx.seller?.email}</span>
                                       <button onClick={() => handleViewTimeline(tx.seller_id)} className="text-xs text-green-500 hover:text-green-400 text-left mt-1">View Timeline</button>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-zinc-400 text-xs">
                                    <ul className="list-disc pl-4 space-y-1">
                                       {tx.risk_flags?.map((f: string, i: number) => <li key={i}>{f}</li>)}
                                    </ul>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button 
                                       onClick={() => handleToggleFreeze(tx.transaction_id, tx.status)}
                                       className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                                          tx.status === 'frozen' 
                                             ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                                             : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                                       }`}
                                    >
                                       {tx.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
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

      {/* ADMIN RESOLVE MODAL */}
      {resolveModalState.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
               <div className="p-6 border-b border-zinc-800 bg-zinc-950/50">
                  <h3 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                     <ShieldAlert className="w-5 h-5 text-amber-500" /> Confirm Resolution
                  </h3>
                  <p className="text-zinc-400 text-sm mt-2">You are about to manually resolve this dispute and release the escrowed funds.</p>
               </div>
               
               <div className="p-6 space-y-4">
                  <div className="p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                     <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Target Action</p>
                     <p className="text-white font-medium">
                        {resolveModalState.action === 'REFUND_BUYER' ? (
                           <span className="text-red-400">Refund funds to the BUYER.</span>
                        ) : (
                           <span className="text-emerald-400">Release funds to the SELLER.</span>
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

      {/* TIMELINE MODAL */}
      {timelineModal.isOpen && timelineModal.data && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
               <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950/50">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Clock className="w-5 h-5 text-green-500" />
                     User Behavioral Timeline
                  </h3>
                  <button onClick={() => setTimelineModal({isOpen: false, userId: null, data: null})} className="text-zinc-400 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto space-y-6">
                  {/* Logins */}
                  <div>
                     <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Logins</h4>
                     <ul className="space-y-2">
                        {timelineModal.data.logins.map((l: any, i: number) => (
                           <li key={i} className="text-xs text-zinc-300 flex justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
                              <span><strong className="text-zinc-100">{l.ip_address}</strong> ({l.user_agent})</span>
                              <span className="text-zinc-500">{new Date(l.created_at).toLocaleString()}</span>
                           </li>
                        ))}
                     </ul>
                  </div>

                  {/* Trades */}
                  <div>
                     <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Trades</h4>
                     <ul className="space-y-2">
                        {timelineModal.data.trades.map((t: any, i: number) => (
                           <li key={i} className="text-xs text-zinc-300 flex justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
                              <span>
                                 <strong className={t.buyer_id === timelineModal.userId ? 'text-blue-400' : 'text-orange-400'}>
                                    {t.buyer_id === timelineModal.userId ? 'BUY' : 'SELL'}
                                 </strong> - ₱{t.total_amount} ({t.item_type})
                              </span>
                              <div className="text-right">
                                 <span className="text-zinc-500 block">{new Date(t.created_at).toLocaleString()}</span>
                                 <span className="text-zinc-400">Score: {t.risk_score} | Status: {t.status}</span>
                              </div>
                           </li>
                        ))}
                     </ul>
                  </div>

                  {/* Withdrawals */}
                  <div>
                     <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Withdrawals</h4>
                     <ul className="space-y-2">
                        {timelineModal.data.withdrawals.map((w: any, i: number) => (
                           <li key={i} className="text-xs text-zinc-300 flex justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
                              <span className="text-red-400 font-bold">₱{Math.abs(Number(w.amount))}</span>
                              <span className="text-zinc-500">{new Date(w.created_at).toLocaleString()}</span>
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* TRADE TIMELINE MODAL */}
      {tradeTimelineModal.isOpen && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
               <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-950/50">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <Clock className="w-5 h-5 text-blue-500" />
                     Forensic Trade Timeline #{tradeTimelineModal.txId}
                  </h3>
                  <button onClick={() => setTradeTimelineModal({isOpen: false, txId: null, logs: []})} className="text-zinc-400 hover:text-white transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto">
                  <div className="space-y-4">
                     {tradeTimelineModal.logs.length === 0 ? (
                        <p className="text-zinc-500 text-center py-8">No audit logs found for this transaction.</p>
                     ) : (
                        <div className="relative border-l border-zinc-800 ml-3 md:ml-6 space-y-6">
                           {tradeTimelineModal.logs.map((log: any, idx: number) => (
                              <div key={log.log_id} className="relative pl-6">
                                 <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-900 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                 <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-2">
                                       <div className="flex items-center gap-3">
                                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                                             {log.action_type?.replace(/_/g, ' ') || 'SYSTEM EVENT'}
                                          </span>
                                          <span className="text-zinc-500 text-xs font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                       </div>
                                       <div className="text-xs text-zinc-400 flex items-center gap-2">
                                          <span>IP: <span className="font-mono">{log.ip_address}</span></span>
                                          {log.risk_score > 0 && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.risk_score > 70 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>Risk: {log.risk_score}</span>}
                                       </div>
                                    </div>
                                    <p className="text-sm text-zinc-200 font-medium">{log.action_description}</p>
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                       <div className="mt-3 bg-zinc-900 rounded p-3 overflow-x-auto">
                                          <pre className="text-[10px] text-zinc-400 font-mono m-0">{JSON.stringify(log.metadata, null, 2)}</pre>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}
