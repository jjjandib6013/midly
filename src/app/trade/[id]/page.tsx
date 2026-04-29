"use client";
import { useSession } from 'next-auth/react';

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, MessageSquare, CheckCircle2, ShieldAlert, Paperclip, ImageIcon, ArrowRight, Copy, Wallet, Smartphone, CreditCard, Lock, Timer, Unlock, XCircle, Key, Eye, EyeOff } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { API_URL } from "@/lib/api";


type Message = { id: string; text: string; sender: "user" | "other" | "ai"; timestamp: string };

export default function TradeHub() {
   const { data: session } = useSession();
   const token = (session as any)?.accessToken;

   const params = useParams();
   const tradeId = params.id as string;

   const [trade, setTrade] = useState<any>(null);
   const [myRole, setMyRole] = useState<"BUY" | "SELL" | null>(null);
   const [isInitiator, setIsInitiator] = useState(false);
   const [counterparty, setCounterparty] = useState<any>(null);
   const [messages, setMessages] = useState<Message[]>([]);
   const [inputText, setInputText] = useState("");
   const [currentStep, setCurrentStep] = useState(1);
   const [paymentMethod, setPaymentMethod] = useState("midly_wallet");
   const [myWalletBalance, setMyWalletBalance] = useState<number>(0);
   const [isPaymentSimulating, setIsPaymentSimulating] = useState(false);
   const [isAiProcessing, setIsAiProcessing] = useState(false);


   const [isLoading, setIsLoading] = useState(true);
   const [hasRated, setHasRated] = useState(false);
   const [credentialsInput, setCredentialsInput] = useState("");
   const [isVaultOpen, setIsVaultOpen] = useState(false);
   const [vaultUser, setVaultUser] = useState("");
   const [vaultPass, setVaultPass] = useState("");
   const fileInputRef = useRef<HTMLInputElement>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);

   // Unified Modal State
   const [isDisputingModalOpen, setIsDisputingModalOpen] = useState(false);
   const [disputeReason, setDisputeReason] = useState("");
   const [isCancelRequestModalOpen, setIsCancelRequestModalOpen] = useState(false);
   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
   const [pendingUpload, setPendingUpload] = useState<File | null>(null);
   const [showCredentials, setShowCredentials] = useState(false);

   const [timeRemaining, setTimeRemaining] = useState({ hours: 24, minutes: 0, seconds: 0, isExpired: false });

   useEffect(() => {
      if (trade?.status === 'verifying' && trade?.item_delivered_at) {
         const end = new Date(trade.item_delivered_at).getTime() + 24 * 60 * 60 * 1000;
         const interval = setInterval(() => {
            const now = Date.now();
            const diff = end - now;
            if (diff <= 0) {
               setTimeRemaining({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
               clearInterval(interval);
            } else {
               setTimeRemaining({
                  hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                  minutes: Math.floor((diff / 1000 / 60) % 60),
                  seconds: Math.floor((diff / 1000) % 60),
                  isExpired: false
               });
            }
         }, 1000);
         return () => clearInterval(interval);
      }
   }, [trade?.status, trade?.item_delivered_at]);

   const fetchTrade = () => {
      fetch(`${API_URL}/api/transactions/${tradeId}`, {
         headers: { "Authorization": `Bearer ${token}` }
      })
         .then(res => res.json())
         .then(data => {
            if (data.trade) {
               setTrade(data.trade);
               setMyRole(data.my_role);
               setIsInitiator(data.is_initiator ?? false);
               setCounterparty(data.my_role === 'BUY' ? data.trade.seller : data.trade.buyer);

               if (data.trade.status === 'pending_invite') setCurrentStep(0);
               else if (data.trade.status === 'agreement') setCurrentStep(1);
               else if (data.trade.status === 'awaiting_payment') setCurrentStep(2);
               else if (data.trade.status === 'active') setCurrentStep(3);
               else if (data.trade.status === 'verifying') setCurrentStep(4);
               else if (data.trade.status === 'completed') setCurrentStep(5);
               else if (data.trade.status === 'disputed') setCurrentStep(6);
               else if (data.trade.status === 'cancelled') setCurrentStep(-1);
               else if (data.trade.status === 'refunded') setCurrentStep(-2);
            }
         })
         .catch(console.error);
   };

   const fetchMessages = () => {
      fetch(`${API_URL}/api/messages/${tradeId}`, {
         headers: { "Authorization": `Bearer ${token}` }
      })
         .then(res => res.json())
         .then(data => {
            if (data.messages && data.messages.length > 0) {
               const myUserId = parseInt(JSON.parse(atob(token?.split('.')[1])).user_id);
               const formatted = data.messages.map((m: any) => ({
                  id: m.message_id.toString(),
                  text: m.message_text,
                  sender: m.is_system_generated ? "ai" : (m.sender_id === myUserId ? "user" : "other"),
                  timestamp: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
               }));
               setMessages(formatted);
            }
         })
         .catch(console.error)
         .finally(() => setIsLoading(false));
   };

   const fetchWallet = () => {
      fetch(`${API_URL}/api/user/wallet`, {
         headers: { "Authorization": `Bearer ${token}` }
      })
         .then(res => res.json())
         .then(data => {
            const bal = data.available_balance ?? data.wallet_balance;
            if (bal !== undefined) setMyWalletBalance(Number(bal));
         })
         .catch(console.error);
   };

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);

   useEffect(() => {
      if (!token) return; // Wait for session to load

      fetchTrade();
      fetchMessages();
      fetchWallet();

      // WebSockets Real-Time Engine (Forced WebSocket transport prevents falling back to CORS-blocked standard polling)
      const socket = io(API_URL, {
         transports: ['websocket', 'polling'], // Prioritize pure websocket
         reconnectionAttempts: 5,
         withCredentials: true
      });
      socket.emit("join_trade", tradeId);

      // Listen for incoming messages
      socket.on("new_message", (msg: any) => {
         const myUserId = parseInt(JSON.parse(atob(token?.split('.')[1])).user_id);
         setMessages(prev => [...prev, {
            id: msg.message_id.toString(),
            text: msg.message_text,
            sender: msg.is_system_generated ? 'ai' : (msg.sender_id === myUserId ? 'user' : 'other'),
            timestamp: new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
         }]);
      });

      // Listen for immediate state updates
      socket.on("trade_updated", (newStatus: string) => {
         if (newStatus === 'awaiting_payment') toast.success("Seller requested payment. Awaiting Buyer deposit.");
         if (newStatus === 'active') toast.success("Payment Secured in Vault! Handover phase started.");
         if (newStatus === 'verifying') toast.success("Items Delivered. Retrieval Lock & Verification started.");
         if (newStatus === 'completed') toast.success("Funds successfully Released!");
         if (newStatus === 'disputed') toast.error("Trade has been officially Disputed. Funds are frozen.");
         if (newStatus === 'cancel_requested') toast.error("A participant requested to mutually cancel the trade.");
         if (newStatus === 'cancelled') toast.success("Trade Cancelled!");
         fetchTrade();
      });

      return () => {
         socket.disconnect();
      };
   }, [tradeId, token]);

   const steps = [
      { id: 1, label: "Agreement", status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "pending" },
      { id: 2, label: "Payment Secured", status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "pending" },
      { id: 3, label: "Item Handover", status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "pending" },
      { id: 4, label: "Verification", status: currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "pending" },
      { id: 5, label: "Release Funds", status: currentStep > 5 ? "completed" : currentStep === 5 ? "current" : "pending" },
   ];

   if (currentStep === 6) steps.push({ id: 6, label: "DISPUTED", status: "current" });
   if (currentStep === -1) steps.splice(0, steps.length, { id: -1, label: "CANCELLED", status: "current" });
   if (currentStep === -2) steps.splice(0, steps.length, { id: -2, label: "REFUNDED", status: "current" });

   const handleSendMessage = async (text: string) => {
      try {
         setIsAiProcessing(true);
         let messageContent = text;
         
         if (pendingUpload) {
            const formData = new FormData();
            formData.append("file", pendingUpload);
            // Upload to trade room specifically
            const uploadRes = await fetch(`${API_URL}/api/upload?type=traderoom`, {
               method: "POST",
               headers: { "Authorization": `Bearer ${token}` },
               body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.url) {
               messageContent = `${uploadData.url} ${text}`.trim();
               setPendingUpload(null);
            } else {
               toast.error("Upload failed.");
               return;
            }
         }

         if (!messageContent.trim()) return;

         const textLower = messageContent.toLowerCase();
         const isHighRisk = textLower.includes("gcash") || textLower.includes("pay me direct")
            || textLower.includes("facebook") || textLower.includes("blue app")
            || textLower.includes("tiktok") || textLower.includes("black app") || textLower.includes("orange app");

         await fetch(`${API_URL}/api/messages/${tradeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ text: messageContent, riskLevel: isHighRisk ? "High" : "Safe" })
         });

         if (isHighRisk) {
            toast.error("AI Warning: High Risk keyword detected.");
            // AI warning message is generated server-side automatically
         }
      } catch (e) {
         console.error("Message failed to send", e);
      } finally {
         setTimeout(() => setIsAiProcessing(false), 1500);
      }
   };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPendingUpload(file);
      e.target.value = ""; // Reset input
   };

   const handleAutoRelease = async () => {
      try {
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/auto-release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ forceDemo: true })
         });
         if (res.ok) {
            toast.success("System Override: Funds Auto-Released");
            fetchTrade();
         } else {
            toast.error("Failed to trigger auto-release.");
         }
      } catch (e) {
         toast.error("Network Error.");
      }
   };

   const handleTradeProgress = async (action: string) => {
      if (action === 'PAY' && (paymentMethod === 'gcash' || paymentMethod === 'credit_card')) {
         setIsPaymentSimulating(true);
         setTimeout(async () => {
            try {
               const res = await fetch(`${API_URL}/api/transactions/${tradeId}/progress`, {
                  method: "PUT",
                  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ action, paymentMethod })
               });
               if (res.ok) fetchTrade();
               else {
                  const data = await res.json();
                  toast.error(data.error || "Action failed");
               }
            } catch (e) { }
            setIsPaymentSimulating(false);
         }, 2000); // simulate gateway auth
         return;
      }

      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/progress`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action, paymentMethod: action === 'PAY' ? paymentMethod : undefined, credentials: action === 'DELIVER' ? (trade?.trade_category === 'Game Account' ? `Username: ${vaultUser} | Password: ${vaultPass}` : credentialsInput) : undefined })
         });
         const data = await res.json();
         if (res.ok) {
            toast.success("Trade status updated.");
            fetchTrade();
         } else {
            toast.error(data.error || "Action failed.");
         }
      } catch (e) {
         console.error(e);
         toast.error("Action error.");
      } finally {
         setIsLoading(false);
      }
   };

   const handleDispute = () => {
      setIsDisputingModalOpen(true);
   };

   const submitDispute = async () => {
      if (!disputeReason.trim()) {
         toast.error("Please provide a reason to file this dispute.");
         return;
      }

      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/dispute`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ reason: disputeReason })
         });
         if (res.ok) {
            toast("Dispute active. Funds locked completely.", { icon: "🔒" });
            setIsDisputingModalOpen(false);
            fetchTrade();
         } else {
            const data = await res.json();
            toast.error(data.error || "Failed to initiate dispute.");
         }
      } catch (e) {
         toast.error("Server error. Please reach out to support.");
      } finally {
         setIsLoading(false);
      }
   };

   const handleCancelTrade = async () => {
      if (!trade || !['pending_invite', 'agreement', 'awaiting_payment'].includes(trade.status)) {
         toast.error("Cannot cancel at this stage."); return;
      }
      setIsCancelModalOpen(true);
   };

   const confirmCancelTrade = async () => {
      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) { toast.success("Trade Permanently Cancelled!"); setIsCancelModalOpen(false); fetchTrade(); }
         else toast.error("Cancellation failed.");
      } catch (e) { } finally { setIsLoading(false); }
   };

   const handleAcceptInvite = async () => {
      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/accept-invite`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) {
            toast.success("Trade Accepted! Agreement Phase is now active.");
            fetchTrade();
         } else {
            const data = await res.json();
            toast.error(data.error || "Failed to accept invite.");
         }
      } catch (e) { toast.error("Server error."); } finally { setIsLoading(false); }
   };

   const confirmRequestCancellation = async () => {
      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/request-cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) { 
            toast.success("Mutual Cancellation Request Sent to Seller."); 
            setIsCancelRequestModalOpen(false);
            fetchTrade();
         }
      } catch (e) { } finally { setIsLoading(false); }
   };

   const handleAcceptCancel = async () => {
      try {
         setIsLoading(true);
         const res = await fetch(`${API_URL}/api/transactions/${tradeId}/accept-cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
         });
         if (res.ok) { toast.success("Refunded and Cancelled."); fetchTrade(); }
         else toast.error("Failed to accept cancellation.");
      } catch (e) { } finally { setIsLoading(false); }
   };

   const handleRateSeller = async (score: number) => {
      try {
         const res = await fetch(`${API_URL}/api/user/rate/${trade.seller_id}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ score })
         });
         if (res.ok) {
            toast.success(`You rated the seller ${score} Stars!`);
            setHasRated(true);
         }
      } catch (e) { }
   };

   if (isLoading || !trade) return <div className="flex-1 flex justify-center items-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

   // =============================================
   // PENDING INVITE: Completely separate page
   // No trade room, no chat, no escrow tracker
   // =============================================
   if (currentStep === 0) {
      return (
         <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center">
            <div className="text-center mb-8">
               <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-primary" />
               </div>
               <h1 className="text-3xl font-bold text-white mb-2">Private Escrow Invitation</h1>
               <p className="text-text-muted">Trade #{tradeId.padStart(6, '0')}</p>
            </div>

            <DynamicCard hoverEffect={false} className="w-full border border-dark-border bg-dark-panel p-8 mb-6">
               <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Trade Details</h3>
               <div className="space-y-3 mb-6">
                  <div className="flex justify-between border-b border-dark-border pb-2">
                     <span className="text-text-muted text-sm">Item</span>
                     <span className="text-white text-sm font-medium">{trade.item_name || trade.item_type}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-2">
                     <span className="text-text-muted text-sm">Category</span>
                     <span className="text-white text-sm font-medium">{trade.game_type}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-2">
                     <span className="text-text-muted text-sm">Your Role</span>
                     <span className="text-white text-sm font-medium">{myRole === 'BUY' ? '🛒 Buyer' : '📦 Seller'}</span>
                  </div>
                  {counterparty && (
                     <div className="flex justify-between border-b border-dark-border pb-2">
                        <span className="text-text-muted text-sm">Counterparty</span>
                        <span className="text-white text-sm font-medium">{counterparty.email}</span>
                     </div>
                  )}
                  <div className="flex justify-between">
                     <span className="text-text-muted text-sm">Agreed Price</span>
                     <span className="text-primary font-bold text-lg">₱ {Number(trade.agreed_price).toLocaleString()}</span>
                  </div>
               </div>

               <div className="border-t border-dark-border pt-6">
                  {isInitiator ? (
                     <>
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3 mb-4">
                           <Timer className="w-5 h-5 text-yellow-500 flex-shrink-0 animate-pulse" />
                           <div>
                              <p className="text-sm font-bold text-yellow-500">Waiting for Counterparty</p>
                              <p className="text-xs text-yellow-500/70 mt-1">The trade room and escrow features will unlock once they accept your invitation.</p>
                           </div>
                        </div>
                        <NeonButton variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                           <XCircle className="w-4 h-4 mr-2" /> Cancel Invitation
                        </NeonButton>
                     </>
                  ) : (
                     <>
                        <p className="text-sm text-text-muted mb-4">You've been invited to a secure escrow trade. By accepting, you agree to enter the negotiation phase where trade terms will be finalized.</p>
                        <NeonButton className="w-full justify-center !py-4 text-lg mb-3" onClick={handleAcceptInvite}>
                           <ShieldCheck className="w-5 h-5 mr-2" /> Accept Trade Invitation
                        </NeonButton>
                        <NeonButton variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                           <XCircle className="w-4 h-4 mr-2" /> Decline & Cancel
                        </NeonButton>
                     </>
                  )}
               </div>
            </DynamicCard>

            <div className="flex items-center gap-2 text-text-muted text-xs">
               <Lock className="w-3 h-3" />
               <span>Trade room, chat, and escrow actions are locked until both parties accept.</span>
            </div>
         </div>
      );
   }

   if (myRole === 'ADMIN') {
      const handleAdminResolve = (action: 'REFUND_BUYER' | 'FORWARD_TO_SELLER') => {
         if (!confirm(`Are you sure you want to FORCE ${action}? This is mathematically binding and irreversible.`)) return;
         fetch(`${API_URL}/api/admin/disputes/${tradeId}/resolve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
         }).then(res => {
            if (res.ok) {
               toast.success("Dispute mathematically resolved.");
               fetchTrade();
            } else toast.error("Failed to resolve dispute.");
         });
      };

      return (
         <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col gap-6 lg:h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-dark-border pb-6 gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-red-500 mb-2 flex items-center gap-3"><ShieldAlert className="w-6 h-6" /> SECURED ADMIN AUDIT VIEW</h1>
                  <p className="text-sm text-text-muted max-w-xl leading-relaxed">You are viewing Hub #{tradeId} as a Platform Administrator. All logs, actions, and timestamps shown are mathematical truths pulled directly from the system ledger. You are observing this trade, not participating in it.</p>
               </div>
               <div className="flex items-center gap-4 shrink-0">
                  <div className="px-5 py-3 bg-dark-panel border border-dark-border rounded-xl shadow-lg">
                     <span className="text-text-muted text-xs uppercase tracking-widest font-bold">System State:</span> 
                     <span className={`font-bold uppercase tracking-widest ml-3 px-3 py-1 rounded text-xs ${
                        trade.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        trade.status === 'disputed' ? 'bg-red-500/10 text-red-500' :
                        'bg-zinc-800 text-zinc-300'
                     }`}>{trade.status}</span>
                  </div>
               </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Timeline Panel */}
               <div className="col-span-1 bg-dark-panel border border-dark-border rounded-xl p-6 shadow-xl">
                  <h3 className="font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-primary"/> Event Timeline</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px before:h-full before:w-0.5 before:bg-dark-border">
                     
                     <div className="relative flex items-start gap-4">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-primary bg-dark-bg text-primary shrink-0 z-10 mt-0.5"></div>
                        <div className="flex-1 pb-4">
                           <p className="font-bold text-sm text-white">Hub Provisioned</p>
                           <time className="block mt-1 text-[11px] font-mono text-text-muted bg-dark-bg border border-dark-border px-2 py-1 rounded inline-block">{new Date(trade.created_at).toLocaleString()}</time>
                        </div>
                     </div>

                     {trade.item_delivered_at && (
                        <div className="relative flex items-start gap-4">
                           <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-yellow-500 bg-dark-bg text-yellow-500 shrink-0 z-10 mt-0.5"></div>
                           <div className="flex-1 pb-4">
                              <p className="font-bold text-sm text-white">Item Handover Action</p>
                              <time className="block mt-1 text-[11px] font-mono text-text-muted bg-dark-bg border border-dark-border px-2 py-1 rounded inline-block">{new Date(trade.item_delivered_at).toLocaleString()}</time>
                           </div>
                        </div>
                     )}

                     {trade.buyer_approved_at && (
                        <div className="relative flex items-start gap-4">
                           <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-emerald-500 bg-dark-bg text-emerald-500 shrink-0 z-10 mt-0.5"></div>
                           <div className="flex-1 pb-4">
                              <p className="font-bold text-sm text-white">Buyer Acceptance</p>
                              <time className="block mt-1 text-[11px] font-mono text-text-muted bg-dark-bg border border-dark-border px-2 py-1 rounded inline-block">{new Date(trade.buyer_approved_at).toLocaleString()}</time>
                           </div>
                        </div>
                     )}

                     {trade.status === 'refunded' && (
                        <div className="relative flex items-start gap-4">
                           <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-red-500 bg-dark-bg text-red-500 shrink-0 z-10 mt-0.5"></div>
                           <div className="flex-1 pb-4">
                              <p className="font-bold text-sm text-white">Vault Refunded</p>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-dark-border space-y-3">
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted font-bold uppercase">Buyer</span>
                        <span className="text-white font-mono">{trade.buyer?.email}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted font-bold uppercase">Seller</span>
                        <span className="text-white font-mono">{trade.seller?.email}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-text-muted font-bold uppercase">Escrow Locked</span>
                        <span className="text-primary font-bold">₱{Number(trade.total_amount).toLocaleString()}</span>
                     </div>
                  </div>
               </div>

               {/* Logs Panel */}
               <div className="col-span-1 lg:col-span-2 bg-dark-panel border border-dark-border rounded-xl p-6 flex flex-col h-[700px] shadow-xl">
                  <h3 className="font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2 text-sm"><Server className="w-4 h-4 text-primary"/> Immutable System Logs</h3>
                  
                  <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4 bg-dark-bg rounded-lg border border-dark-border p-4">
                     {messages.map((m: any) => (
                        <div key={m.id} className={`p-4 rounded-xl border text-sm transition-colors ${m.sender === 'ai' ? 'bg-red-500/5 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.05)]' : 'bg-dark-panel border-dark-border'}`}>
                           <div className="flex justify-between items-center mb-2">
                              <span className={`font-bold text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${m.sender === 'ai' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                                 {m.sender === 'ai' ? 'SYSTEM TRIGGER' : 'PARTICIPANT'}
                              </span>
                              <span className="font-mono text-xs text-text-muted">{m.timestamp}</span>
                           </div>
                           <p className={`whitespace-pre-wrap leading-relaxed ${m.sender === 'ai' ? 'text-red-400 font-mono text-xs' : 'text-zinc-200'}`}>{m.text}</p>
                        </div>
                     ))}
                  </div>

                  {trade.status === 'disputed' && (
                     <div className="mt-6 p-5 rounded-xl border border-red-500/50 bg-[#1A0B0B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                           <h4 className="text-red-500 font-bold text-sm uppercase tracking-widest mb-1 flex items-center gap-2"><Lock className="w-4 h-4" /> Root Override Controls</h4>
                           <p className="text-xs text-red-400/80">Use these commands to forcefully resolve the frozen smart vault. This is mathematically irreversible.</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                           <button onClick={() => handleAdminResolve('FORWARD_TO_SELLER')} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                              Release to Seller
                           </button>
                           <button onClick={() => handleAdminResolve('REFUND_BUYER')} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase rounded-lg transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                              Refund to Buyer
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 lg:h-[calc(100vh-64px)] lg:max-h-[calc(100vh-64px)] lg:overflow-hidden">

         {/* Left Column: Flow & Details */}
         <div className="order-2 lg:order-1 flex flex-col gap-4 sm:gap-6 lg:overflow-y-auto lg:pr-2 custom-scrollbar lg:min-h-0 lg:max-h-full" data-lenis-prevent>

            {/* COUNTERPARTY IDENTITY */}
            {counterparty && (
               <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-5 shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary/10 text-primary rounded-bl-lg text-[10px] font-bold uppercase tracking-widest border-b border-l border-primary/20">
                     {myRole === 'BUY' ? "Seller" : "Buyer"}
                  </div>
                  <h3 className="text-xs font-bold text-text-muted mb-4 uppercase tracking-wider">Trading Partner</h3>
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-full bg-dark-bg border border-primary/30 flex items-center justify-center font-bold text-xl text-primary shadow-[0_0_15px_rgba(63,229,108,0.2)] uppercase">
                        {counterparty.email.charAt(0)}
                     </div>
                     <div>
                        <h4 className="font-bold text-white text-lg leading-tight truncate w-32">{counterparty.email.split('@')[0]}</h4>
                        <div className="flex items-center gap-1 mt-1">
                           <span className="text-yellow-400 text-sm">★</span>
                           <span className="text-sm font-medium text-text-muted">{(Number(counterparty.reputation_score) || 5.0).toFixed(1)}</span>
                        </div>
                     </div>
                  </div>
               </DynamicCard>
            )}

            {/* TRADE PAYLOAD (Moved up for visibility) */}
            <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg/50 p-6 shrink-0">
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-text-muted">Trade Summary</h3>
               <div className="space-y-3">
                  <div className="flex justify-between border-b border-dark-border pb-2">
                     <span className="text-text-muted text-sm">Item ID</span>
                     <span className="text-white text-sm font-medium">#{tradeId.padStart(6, '0')}</span>
                  </div>
                  <div className="flex justify-between border-b border-dark-border pb-2">
                     <span className="text-text-muted text-sm">Description</span>
                     <span className="text-white text-sm font-medium truncate max-w-[150px]" title={trade.item_type}>{trade.item_type}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-text-muted text-sm">Base Price</span>
                     <span className="text-primary font-bold">₱ {Number(trade.agreed_price).toLocaleString()}</span>
                  </div>
               </div>
            </DynamicCard>

            {/* ESCROW TRACKER */}
            <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-6 shrink-0 mb-4">
               <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck className="w-6 h-6 text-primary glow-icon" />
                  <h2 className="text-xl font-bold text-white tracking-tight">Transaction Status</h2>
               </div>

               <div className="relative border-l-2 border-dark-border ml-3 space-y-8 pb-4">
                  {steps.map((s, i) => (
                     <div key={s.id} className="relative pl-6">
                        <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-dark-bg transition-colors ${s.status === "completed" ? "border-primary text-primary" :
                           s.status === "current" ? "border-primary bg-primary shadow-[0_0_10px_rgba(63,229,108,0.5)]" :
                              "border-dark-border text-dark-border"
                           }`}>
                           {s.status === "completed" && <CheckCircle2 className="w-3 h-3 text-primary" />}
                        </div>
                        <h3 className={`font-bold transition-colors ${s.status === "current" ? (s.id === 6 ? "text-red-500" : "text-white") :
                           s.status === "completed" ? "text-text-muted" : "text-dark-border"
                           }`}>{s.label}</h3>
                     </div>
                  ))}
               </div>

               <div className="mt-8 pt-6 border-t border-dark-border space-y-4">
                  {currentStep === -1 && (
                     <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                        <div className="flex items-start gap-3">
                           <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                           <div>
                              <h4 className="text-red-500 font-bold text-sm">Trade Cancelled</h4>
                              <p className="text-xs text-red-400 mt-1">This trade has been permanently cancelled. No funds were transferred.</p>
                           </div>
                        </div>
                     </div>
                  )}
                  {currentStep === -2 && (
                     <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
                        <div className="flex items-start gap-3">
                           <ShieldAlert className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                           <div>
                              <h4 className="text-yellow-500 font-bold text-sm">Trade Refunded</h4>
                              <p className="text-xs text-yellow-400 mt-1">This dispute has been resolved. Funds have been refunded to the buyer's wallet.</p>
                           </div>
                        </div>
                     </div>
                  )}
                  {currentStep === 1 && (
                     <>
                        <h4 className="text-white font-bold text-sm">Agreement Phase</h4>
                        {myRole === 'SELL' ? (
                           <>
                              <p className="text-sm text-text-muted">Verify terms with the buyer. When ready, lock the terms to request funds into the Vault.</p>
                              <div className="flex gap-2">
                                 <NeonButton className="flex-[2] justify-center !py-3 bg-dark-bg" onClick={() => handleTradeProgress('REQUEST_PAYMENT')}>
                                    Lock Terms & Request Payment <ArrowRight className="w-4 h-4 ml-2" />
                                 </NeonButton>
                                 <button className="flex-1 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors" onClick={handleCancelTrade}>
                                    Cancel Trade
                                 </button>
                              </div>
                           </>
                        ) : (
                           <>
                              <button className="w-full text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors mt-4" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </button>
                           </>
                        )}
                     </>
                  )}
                  {currentStep === 2 && (
                     <>
                        <h4 className="text-white font-bold text-sm">Payment Secured Phase</h4>
                        {myRole === 'BUY' ? (
                           <>
                              <p className="text-sm text-text-muted mb-4">The Seller has locked the terms. Please secure the funds into the Vault.</p>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                                 <div
                                    onClick={() => setPaymentMethod('midly_wallet')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'midly_wallet' ? 'border-primary bg-primary/10 glow-icon' : 'border-dark-border bg-dark-bg hover:border-primary/50'}`}
                                 >
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <Wallet className={`w-6 h-6 mb-2 ${paymentMethod === 'midly_wallet' ? 'text-primary' : 'text-text-muted'}`} />
                                       <h4 className="text-sm font-bold text-white">Midly Wallet</h4>
                                       <p className="text-xs mt-1 text-text-muted">Balance: ₱{myWalletBalance.toLocaleString()}</p>
                                    </div>
                                 </div>

                                 <div className="p-4 rounded-xl border-2 border-dark-border bg-dark-bg/50 opacity-50 cursor-not-allowed transition-all relative overflow-hidden group">
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <Smartphone className="w-6 h-6 mb-2 text-text-muted" />
                                       <h4 className="text-sm font-bold text-white">GCash Direct</h4>
                                       <div className="mt-1 px-2 py-0.5 bg-dark-border rounded text-[10px] font-bold text-text-muted uppercase tracking-wider">Coming Soon</div>
                                    </div>
                                 </div>

                                 <div className="p-4 rounded-xl border-2 border-dark-border bg-dark-bg/50 opacity-50 cursor-not-allowed transition-all relative overflow-hidden group">
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <CreditCard className="w-6 h-6 mb-2 text-text-muted" />
                                       <h4 className="text-sm font-bold text-white">Credit / Debit</h4>
                                       <div className="mt-1 px-2 py-0.5 bg-dark-border rounded text-[10px] font-bold text-text-muted uppercase tracking-wider">Coming Soon</div>
                                    </div>
                                 </div>
                              </div>

                              {paymentMethod === 'midly_wallet' && (myWalletBalance < Number(trade.total_amount)) ? (
                                 <div className="text-center p-4 rounded-xl border border-red-500/30 bg-red-500/10 mb-4">
                                    <p className="text-red-500 text-sm mb-2 font-bold flex items-center justify-center gap-2">
                                       <ShieldAlert className="w-4 h-4" /> Insufficient Midly Wallet Balance
                                    </p>
                                    <a href="/wallet" target="_blank" className="text-primary hover:underline text-xs font-medium">Deposit Funds in Wallet Dashboard</a>
                                 </div>
                              ) : (
                                 <NeonButton
                                    className="w-full justify-center !py-3 text-lg relative overflow-hidden group"
                                    onClick={() => handleTradeProgress('PAY')}
                                    disabled={isPaymentSimulating}
                                 >
                                    {isPaymentSimulating ? (
                                       <span className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" /> Authenticating...
                                       </span>
                                    ) : (
                                       <span className="flex items-center gap-2">
                                          <Lock className="w-5 h-5" /> Secure ₱{Number(trade.total_amount).toLocaleString()}
                                       </span>
                                    )}
                                 </NeonButton>
                              )}
                              <button className="w-full text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors mt-4" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </button>
                           </>
                        ) : (
                           <>
                              <p className="text-sm text-text-muted pb-2">Waiting for the Buyer to deposit funds into the Midly Smart Vault.</p>
                              <button className="w-full text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-colors mt-4" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </button>
                           </>
                        )}
                     </>
                  )}
                  {currentStep === 3 && (
                     <>
                        <h4 className="text-white font-bold text-sm">Item Handover</h4>
                        {myRole === 'SELL' ? (
                           <div className="flex flex-col gap-4">
                              <p className="text-sm text-text-muted">The Midly Vault has secured the funds. {trade?.trade_category === 'Game Account' ? 'Please input the account details into the Secure Credential Vault below to process Handover automatically.' : 'Please deliver the item in-game, upload screenshot proof in the chat, and click confirm.'}</p>

                              {trade?.trade_category === 'Game Account' ? (
                                 !isVaultOpen ? (
                                    <NeonButton className="w-full justify-center !py-3 mt-2" onClick={() => setIsVaultOpen(true)}>
                                       <Key className="w-4 h-4 mr-2" /> Open Secure Credential Vault
                                    </NeonButton>
                                 ) : (
                                    <div className="p-5 bg-dark-bg/80 backdrop-blur-md border border-primary/50 rounded-xl space-y-4 relative overflow-hidden shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] transition-all animate-in fade-in zoom-in-95 duration-200">
                                       <div className="absolute -top-4 -right-4 p-2 opacity-10"><Key className="w-24 h-24 text-primary" /></div>
                                       <div className="flex items-center gap-2 mb-2 relative z-10">
                                          <ShieldCheck className="w-5 h-5 text-primary" />
                                          <p className="text-sm text-primary font-bold uppercase tracking-wider">Account Credentials</p>
                                       </div>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                          <div>
                                             <label className="text-xs text-text-muted font-bold mb-1 block">Username / Email</label>
                                             <input
                                                type="text"
                                                placeholder="Enter username"
                                                className="w-full bg-dark-panel border border-dark-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary/50 transition-colors"
                                                value={vaultUser}
                                                onChange={e => setVaultUser(e.target.value)}
                                             />
                                          </div>
                                          <div>
                                             <label className="text-xs text-text-muted font-bold mb-1 block">Password</label>
                                             <input
                                                type="text"
                                                placeholder="Enter password"
                                                className="w-full bg-dark-panel border border-dark-border rounded-lg px-4 py-3 text-white text-sm focus:border-primary/50 transition-colors"
                                                value={vaultPass}
                                                onChange={e => setVaultPass(e.target.value)}
                                             />
                                          </div>
                                       </div>
                                       <div className="text-xs text-text-muted bg-dark-panel p-3 rounded border border-dark-border relative z-10">
                                          <span className="text-yellow-500 font-bold uppercase mr-2 flex items-center gap-1 inline-flex mb-1"><ShieldAlert className="w-3 h-3" /> Warning</span>
                                          <p>These credentials are end-to-end encrypted. Upon submission, they are permanently locked into the Smart Escrow and revealed to the Buyer. Any false credentials will result in an immediate permanent ban.</p>
                                       </div>
                                       <div className="flex gap-2 relative z-10 mt-2">
                                          <NeonButton variant="ghost" className="flex-1 border border-dark-border hover:bg-white/5" onClick={() => setIsVaultOpen(false)}>
                                             Cancel
                                          </NeonButton>
                                          <NeonButton className="flex-[2] justify-center" onClick={() => handleTradeProgress('DELIVER')} disabled={!vaultUser || !vaultPass || isLoading}>
                                             Lock & Deliver <ArrowRight className="w-4 h-4 ml-2" />
                                          </NeonButton>
                                       </div>
                                    </div>
                                 )
                              ) : (
                                 <NeonButton className="w-full justify-center !py-3 mt-2" onClick={() => handleTradeProgress('DELIVER')}>
                                    Confirm Item Delivered <ArrowRight className="w-4 h-4 ml-2" />
                                 </NeonButton>
                              )}
                           </div>
                        ) : (
                           <div className="flex flex-col gap-3">
                              <p className="text-sm text-text-muted">Funds securely locked in Vault. Waiting for Seller to deliver the {trade?.trade_category === 'Game Account' ? 'credentials' : 'item'}.</p>
                              <NeonButton variant="ghost" className="w-full mt-2 text-yellow-500 hover:bg-yellow-500/10 border border-yellow-500/50 group" onClick={() => setIsCancelRequestModalOpen(true)}>
                                 <XCircle className="w-4 h-4 mr-2" /> Request Mutual Cancellation
                              </NeonButton>
                           </div>
                        )}
                     </>
                  )}
                  {currentStep === 4 && (
                     <>
                        <h4 className="text-white font-bold text-sm">Verification Phase</h4>

                        {trade.status === 'disputed' ? (
                           <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-4 animate-pulse">
                              <ShieldAlert className="w-8 h-8 text-red-500 shrink-0" />
                              <div>
                                 <h4 className="text-red-500 font-bold">FUNDS FROZEN - Escrow Suspended</h4>
                                 <p className="text-xs text-red-400 mt-1 leading-relaxed">A dispute was filed. The 24-hour Auto-Release timer has been completely dismantled. This vault is now legally frozen and awaits Admin Mediation.</p>
                              </div>
                           </div>
                        ) : (
                           <>
                              <div className="flex items-center justify-between bg-dark-bg border border-dark-border p-4 rounded-xl mb-4 shadow-inner">
                                 <div className="flex items-center gap-3">
                                    <Timer className="w-6 h-6 text-yellow-500" />
                                    <div>
                                       <p className="text-xs text-text-muted font-bold uppercase tracking-wider">Escrow Auto-Release</p>
                                       <p className="text-sm font-mono text-white mt-1">
                                          {timeRemaining.isExpired ? "00:00:00 - TIME ELAPSED" : `${timeRemaining.hours.toString().padStart(2, '0')}:${timeRemaining.minutes.toString().padStart(2, '0')}:${timeRemaining.seconds.toString().padStart(2, '0')} REMAINING`}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                              {myRole === 'BUY' ? (
                                 <div className="flex flex-col gap-4">
                                    <p className="text-sm text-text-muted">You have 24 hours to inspect the item. If you don't respond, funds release automatically.</p>

                                    {trade.account_credentials && (
                                       <div className="p-4 bg-dark-bg border border-primary/30 rounded-xl w-full relative overflow-hidden group">
                                          <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px]" />
                                          <div className="relative z-10">
                                             <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                   <Unlock className="w-5 h-5 text-primary" />
                                                   <p className="text-sm text-primary font-black uppercase tracking-widest leading-none">Vault Unlocked</p>
                                                </div>
                                                <button onClick={() => { setShowCredentials(!showCredentials); if (!showCredentials) toast("Credentials Revealed", { icon: "👁️" }); }} className="text-text-muted hover:text-white transition-colors">
                                                   {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                             </div>
                                             <div className="bg-[#050608] border border-primary/20 p-4 rounded-lg relative overflow-hidden">
                                                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-[#050608] to-transparent pointer-events-none" />
                                                <p className="text-primary/90 font-mono text-sm break-all font-bold tracking-tight">
                                                   {showCredentials ? trade.account_credentials : "••••••••••••••••"}
                                                </p>
                                             </div>
                                             <NeonButton onClick={() => { navigator.clipboard.writeText(trade.account_credentials); toast.success("Credentials Copied to Clipboard"); }} className="w-full mt-3 !py-2.5 text-xs">
                                                Copy Credentials <Copy className="w-3 h-3 ml-2" />
                                             </NeonButton>
                                          </div>
                                       </div>
                                    )}

                                    <div className="flex gap-2">
                                       <NeonButton variant="ghost" className="flex-1 text-red-500 border border-red-500 hover:bg-red-500/10" onClick={handleDispute}>
                                          Dispute
                                       </NeonButton>
                                       <NeonButton className="flex-[2] justify-center text-sm px-2" onClick={() => handleTradeProgress('APPROVE')}>
                                          Approve Delivery & Release Funds
                                       </NeonButton>
                                    </div>
                                    {process.env.NODE_ENV === 'development' && (
                                       <button onClick={handleAutoRelease} className="w-full mt-2 text-[10px] text-primary bg-primary/10 border border-primary/20 py-2 rounded font-bold hover:bg-primary/20 transition-all uppercase tracking-widest">
                                          [Developer Tool] Force 24h Skip
                                       </button>
                                    )}
                                 </div>
                              ) : (
                                 <>
                                    <p className="text-sm text-text-muted pb-2">Delivery confirmed. 24-hr Retrieval Lock active. Awaiting Buyer override or auto-release.</p>
                                    {process.env.NODE_ENV === 'development' && (
                                       <button onClick={handleAutoRelease} className="w-full mt-4 text-xs text-primary bg-primary/10 border border-primary/20 py-2 rounded font-bold hover:bg-primary/20 transition-all">
                                          [Developer Tool] Force 24h Auto-Release Simulation
                                       </button>
                                    )}
                                 </>
                              )}
                           </>
                        )}
                     </>
                  )}
                  {currentStep === 5 && (
                     <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                           <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
                           <div>
                              <h4 className="text-white font-bold text-sm">Escrow Complete</h4>
                              <p className="text-xs text-text-muted mt-1 leading-relaxed">Funds have been successfully released to the seller's wallet. Thank you for using Midly.</p>
                           </div>
                        </div>

                        {/* Reputation System (Buyers Only) */}
                        {myRole === 'BUY' && !hasRated && (
                           <div className="pt-3 border-t border-primary/20 text-center">
                              <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Rate Seller</p>
                              <div className="flex justify-center gap-2">
                                 {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => handleRateSeller(star)} className="text-2xl text-dark-border hover:text-yellow-400 transition-colors">
                                       ★
                                    </button>
                                 ))}
                              </div>
                           </div>
                        )}
                        {hasRated && <p className="text-xs text-center text-primary mt-2">Rating Submitted ✓</p>}
                     </div>
                  )}
               </div>
            </DynamicCard>
         </div>

         {/* Right Column: Intelligent Chat */}
         <div className="order-1 lg:order-2 lg:col-span-2 flex flex-col h-[60vh] sm:h-[65vh] lg:h-full lg:max-h-full min-h-0 bg-dark-panel border border-dark-border rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-dark-border bg-dark-bg flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary glow-icon" />
                  <h2 className="font-bold text-white">Intelligent Negotiation Hub</h2>
               </div>
               <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => {
                     navigator.clipboard.writeText(window.location.href);
                     toast.success("Room Invite Link Copied!");
                  }} className="px-2 sm:px-3 py-1 bg-dark-panel hover:bg-dark-border cursor-pointer transition-colors rounded-full border border-dark-border text-xs text-white flex items-center gap-1.5 sm:gap-2 touch-manipulation min-h-[36px]">
                     <Copy className="w-3 h-3 text-text-muted" /> <span className="hidden sm:inline">Copy Invite Link</span><span className="sm:hidden">Copy</span>
                  </button>
                  <div className="hidden sm:flex px-3 py-1 bg-dark-panel rounded-full border border-dark-border text-xs text-text-muted items-center gap-2">
                     End-to-End Encrypted <ShieldCheck className="w-3 h-3 text-primary" />
                  </div>
               </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar" data-lenis-prevent>
               {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                     <p className="text-text-muted text-sm border border-dark-border p-4 rounded-xl bg-dark-bg">No messages yet. Say hello securely!</p>
                  </div>
               )}
               {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : m.sender === "ai" ? "justify-center" : "justify-start"}`}>
                     {m.sender === "ai" ? (
                        <div className="max-w-[90%] bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm flex items-start gap-3 my-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                           <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                           <p className="leading-relaxed">{m.text}</p>
                        </div>
                     ) : (
                        <div className={`max-w-[70%] p-4 rounded-2xl ${m.sender === "user"
                           ? "bg-primary text-black rounded-tr-sm shadow-[0_0_15px_rgba(63,229,108,0.2)]"
                           : "bg-dark-bg border border-dark-border text-white rounded-tl-sm"
                           }`}>
                           {m.text.startsWith('http') && m.text.includes('/uploads/') ? (
                              <img src={m.text} className="max-w-[200px] rounded-lg border border-white/20" alt="Proof" />
                           ) : (
                              <p className="text-[15px] leading-relaxed">{m.text}</p>
                           )}
                           <span className={`text-[10px] mt-2 block ${m.sender === "user" ? "text-black/60" : "text-text-muted"}`}>
                              {m.timestamp}
                           </span>
                        </div>
                     )}
                  </div>
               ))}
               <div ref={messagesEndRef} />
            </div>

            {/* Cancel Request Banner */}
            {trade?.cancel_requested_by && currentStep === 3 && (
               <div className="bg-yellow-500/10 border-t border-yellow-500/30 p-4 shrink-0 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                     <ShieldAlert className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                     {trade.cancel_requested_by === parseInt(JSON.parse(atob(token?.split('.')[1])).user_id) ? (
                        <div>
                           <p className="text-yellow-500 font-bold text-sm">Mutual Cancellation Requested</p>
                           <p className="text-xs text-yellow-500/70">Waiting for {counterparty?.email.split('@')[0]} to accept.</p>
                        </div>
                     ) : (
                        <div>
                           <p className="text-yellow-500 font-bold text-sm">Cancel Request Received</p>
                           <p className="text-xs text-yellow-500/70">Counterparty wishes to dissolve the escrow.</p>
                        </div>
                     )}
                  </div>
                  {trade.cancel_requested_by !== parseInt(JSON.parse(atob(token?.split('.')[1])).user_id) && (
                     <NeonButton className="!py-2 !px-4 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black border-yellow-500/50" onClick={handleAcceptCancel}>
                        Accept Cancellation
                     </NeonButton>
                  )}
               </div>
            )}

            {/* Pending Upload Banner */}
            {pendingUpload && (
               <div className="px-6 py-3 bg-[#0a0d14] border-t border-dark-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded overflow-hidden relative border border-primary/30">
                        <img src={URL.createObjectURL(pendingUpload)} alt="Preview" className="object-cover w-full h-full" />
                     </div>
                     <p className="text-sm font-medium text-white truncate max-w-[150px]">{pendingUpload.name}</p>
                  </div>
                  <button onClick={() => setPendingUpload(null)} className="text-text-muted hover:text-white p-1">
                     <XCircle className="w-4 h-4" />
                  </button>
               </div>
            )}

            <div className="p-4 bg-dark-bg border-t border-dark-border shrink-0">
               <div className="relative flex items-center">
                  <input
                     type="text"
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === "Enter" && (inputText.trim() || pendingUpload)) {
                           handleSendMessage(inputText);
                           setInputText("");
                        }
                     }}
                     disabled={currentStep >= 5 || currentStep <= -1}
                     placeholder={currentStep >= 5 || currentStep <= -1 ? "Escrow closed..." : "Send a secure message..."}
                     className="w-full bg-dark-panel border border-dark-border rounded-full pl-5 pr-24 py-4 text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-muted disabled:opacity-50"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                     <button className="p-2 text-text-muted hover:text-white transition-colors" title="Attach Proof" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="w-5 h-5" />
                     </button>
                     <NeonButton
                        className="!py-2 !px-4 !rounded-full"
                        disabled={(!inputText.trim() && !pendingUpload) || currentStep >= 5 || isAiProcessing}
                        onClick={() => {
                           handleSendMessage(inputText);
                           setInputText("");
                        }}
                     >
                        Send
                     </NeonButton>
                  </div>
               </div>
               {isAiProcessing && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-primary animate-pulse bg-dark-bg px-3 py-1 rounded-full border border-primary/20">AI is screening message...</div>}
            </div>
         </div>

         {/* DISPUTE MODAL */}
         {isDisputingModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <DynamicCard className="w-full max-w-lg bg-[#0a0d14] border border-red-500/30 p-6 md:p-8 flex flex-col gap-6" hoverEffect={false}>
                  <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
                     <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-red-500 glow-icon" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Initiate Dispute</h2>
                        <p className="text-xs text-red-400 mt-1">This will permanently lock the Smart Vault.</p>
                     </div>
                  </div>

                  <div className="space-y-4 text-sm font-medium">
                     <p className="text-text-muted">
                        Midly administrators will be pulled into the chat to review evidence and determine a refund or funds release mathematically. 
                     </p>

                     <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest text-text-muted font-bold">Primary Reason for Dispute</label>
                        <textarea
                           rows={4}
                           value={disputeReason}
                           onChange={(e) => setDisputeReason(e.target.value)}
                           placeholder="Explain specifically why you are disputing this transaction. Include any missing items, fraudulent actions, or failed delivery specs..."
                           className="w-full bg-dark-bg border border-dark-border text-white rounded-xl focus:border-red-500 p-4 transition-colors resize-none placeholder:text-white/20 custom-scrollbar"
                        />
                     </div>
                     <p className="text-xs text-white/40 italic">Note: Your entire chat history will be automatically provided to the Admin as evidence.</p>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border">
                     <NeonButton variant="ghost" className="flex-1 border-white/10 hover:bg-white/5 text-text-muted" onClick={() => setIsDisputingModalOpen(false)}>
                        Cancel
                     </NeonButton>
                     <NeonButton className="flex-1 bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500 hover:text-white" onClick={submitDispute} isLoading={isLoading}>
                        Freeze Vault & Dispute
                     </NeonButton>
                  </div>
               </DynamicCard>
            </div>
         )}

         {/* CANCEL REQUEST MODAL */}
         {isCancelRequestModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <DynamicCard className="w-full max-w-lg bg-[#0a0d14] border border-yellow-500/30 p-6 md:p-8 flex flex-col gap-6" hoverEffect={false}>
                  <div className="flex items-center gap-3 border-b border-yellow-500/20 pb-4">
                     <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-yellow-500 glow-icon" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Request Escrow Dissolution</h2>
                        <p className="text-xs text-yellow-400 mt-1">This requires mutual agreement.</p>
                     </div>
                  </div>

                  <div className="space-y-4 text-sm font-medium">
                     <p className="text-text-muted">
                        Your funds are securely locked in the Midly Vault. By submitting this request, the counterparty will be asked to accept the cancellation. If accepted, the Smart Escrow will dissolve and your funds will instantly route back to your wallet.
                     </p>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border">
                     <NeonButton variant="ghost" className="flex-1 border-white/10 hover:bg-white/5 text-text-muted" onClick={() => setIsCancelRequestModalOpen(false)}>
                        Go Back
                     </NeonButton>
                     <NeonButton className="flex-[1.5] bg-yellow-500/10 text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black" onClick={confirmRequestCancellation} isLoading={isLoading}>
                        Submit Cancellation Request
                     </NeonButton>
                  </div>
               </DynamicCard>
            </div>
         )}

         {/* CANCEL MODAL */}
         {isCancelModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <DynamicCard className="w-full max-w-lg bg-[#0a0d14] border border-red-500/30 p-6 md:p-8 flex flex-col gap-6" hoverEffect={false}>
                  <div className="flex items-center gap-3 border-b border-red-500/20 pb-4">
                     <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-red-500 glow-icon" />
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Cancel Trade</h2>
                        <p className="text-xs text-red-400 mt-1">This action cannot be undone.</p>
                     </div>
                  </div>

                  <div className="space-y-4 text-sm font-medium">
                     <p className="text-text-muted">
                        Are you sure you want to completely cancel this trade? This is permanent. No funds will be transferred and the Smart Escrow will be dissolved.
                     </p>
                  </div>

                  <div className="flex gap-3 mt-4 pt-4 border-t border-dark-border">
                     <NeonButton variant="ghost" className="flex-1 border-white/10 hover:bg-white/5 text-text-muted" onClick={() => setIsCancelModalOpen(false)}>
                        Go Back
                     </NeonButton>
                     <NeonButton className="flex-1 bg-red-500/10 text-red-500 border-red-500 hover:bg-red-500 hover:text-white" onClick={confirmCancelTrade} isLoading={isLoading}>
                        Cancel Trade
                     </NeonButton>
                  </div>
               </DynamicCard>
            </div>
         )}
      </div>
   );
}
