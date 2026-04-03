"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ShieldCheck, MessageSquare, CheckCircle2, ShieldAlert, Paperclip, ImageIcon, ArrowRight, Copy, Wallet, Smartphone, CreditCard, Lock, Timer, Unlock, XCircle, Key } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

type Message = { id: string; text: string; sender: "user" | "other" | "ai"; timestamp: string };

export default function TradeHub() {
   const params = useParams();
   const tradeId = params.id as string;

   const [trade, setTrade] = useState<any>(null);
   const [myRole, setMyRole] = useState<"BUY" | "SELL" | null>(null);
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
      fetch(`http://localhost:5000/api/transactions/${tradeId}`, {
         headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      })
         .then(res => res.json())
         .then(data => {
            if (data.trade) {
               setTrade(data.trade);
               setMyRole(data.my_role);
               setCounterparty(data.my_role === 'BUY' ? data.trade.seller : data.trade.buyer);

               if (data.trade.status === 'agreement') setCurrentStep(1);
               else if (data.trade.status === 'awaiting_payment') setCurrentStep(2);
               else if (data.trade.status === 'active') setCurrentStep(3);
               else if (data.trade.status === 'verifying') setCurrentStep(4);
               else if (data.trade.status === 'completed') setCurrentStep(5);
               else if (data.trade.status === 'disputed') setCurrentStep(6);
            }
         })
         .catch(console.error);
   };

   const fetchMessages = () => {
      fetch(`http://localhost:5000/api/messages/${tradeId}`, {
         headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
      })
         .then(res => res.json())
         .then(data => {
            if (data.messages && data.messages.length > 0) {
               const myUserId = parseInt(JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).user_id);
               const formatted = data.messages.map((m: any) => ({
                  id: m.message_id.toString(),
                  text: m.message_text,
                  sender: m.sender_id === myUserId ? "user" : (m.is_system_generated ? "ai" : "other"),
                  timestamp: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
               }));
               setMessages(formatted);
            }
         })
         .catch(console.error)
         .finally(() => setIsLoading(false));
   };

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);

   useEffect(() => {
      fetchTrade();
      fetchMessages();

      // WebSockets Real-Time Engine
      const socket = io("http://localhost:5000");
      socket.emit("join_trade", tradeId);

      // Listen for incoming messages
      socket.on("new_message", (msg: any) => {
         const myUserId = parseInt(JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).user_id);
         setMessages(prev => [...prev, {
            id: msg.message_id.toString(),
            text: msg.message_text,
            sender: msg.sender_id === myUserId ? 'user' : (msg.is_system_generated ? 'ai' : 'other'),
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
         fetchTrade();
      });

      return () => {
         socket.disconnect();
      };
   }, [tradeId]);

   const steps = [
      { id: 1, label: "Agreement", status: currentStep > 1 ? "completed" : "current" },
      { id: 2, label: "Payment Secured", status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "pending" },
      { id: 3, label: "Item Handover", status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "pending" },
      { id: 4, label: "Verification", status: currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "pending" },
      { id: 5, label: "Release Funds", status: currentStep > 5 ? "completed" : currentStep === 5 ? "current" : "pending" },
   ];

   if (currentStep === 6) steps.push({ id: 6, label: "DISPUTED", status: "current" });

   const handleSendMessage = async (text: string) => {
      try {
         setIsAiProcessing(true);
         const textLower = text.toLowerCase();
         const isHighRisk = textLower.includes("gcash") || textLower.includes("pay me direct")
            || textLower.includes("facebook")
            || textLower.includes("blue app")
            || textLower.includes("tiktok")
            || textLower.includes("black app")
            || textLower.includes("orange app");

         await fetch(`http://localhost:5000/api/messages/${tradeId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ text, riskLevel: isHighRisk ? "High" : "Safe" })
         });

         if (isHighRisk) {
            toast.error("AI Warning: High Risk keyword detected.");
            setTimeout(async () => {
               const aiMsgText = "Warning: Attempting to take payments outside Midly violates terms and voids escrow protection.";
               await fetch(`http://localhost:5000/api/messages/${tradeId}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
                  body: JSON.stringify({ text: aiMsgText, isAi: true, riskLevel: "High" })
               });
            }, 1500);
         }
      } catch (e) {
         console.error("Message failed to send", e);
      } finally {
         setTimeout(() => setIsAiProcessing(false), 1500);
      }
   };

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      try {
         setIsAiProcessing(true); // Re-use spinner for UI feedback
         toast.success("Uploading image proof...");
         const uploadRes = await fetch("http://localhost:5000/api/upload", {
            method: "POST",
            body: formData
         });
         const data = await uploadRes.json();
         if (data.url) {
            handleSendMessage(data.url); // Send the image URL physically as a message
         } else {
            toast.error("Upload failed.");
         }
      } catch (err) {
         toast.error("Server error during upload.");
      } finally {
         setIsAiProcessing(false);
      }
   };

   const handleAutoRelease = async () => {
      try {
         const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/auto-release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
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
               const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/progress`, {
                  method: "PUT",
                  headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
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
         const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/progress`, {
            method: "PUT",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
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

   const handleDispute = async () => {
      const reason = prompt("Enter a specific reason for Disputing this Escrow transaction:");
      if (!reason) return;

      try {
         setIsLoading(true);
         const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/dispute`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
            body: JSON.stringify({ reason })
         });
         if (res.ok) {
            toast.error("Dispute active. Funds locked immediately.");
            fetchTrade();
         } else {
            toast.error("Failed to initiate dispute.");
         }
      } catch (e) {
         toast.error("Server error.");
      } finally {
         setIsLoading(false);
      }
   };

   const handleCancelTrade = async () => {
      if (!confirm("Are you sure you want to completely cancel this trade? No funds have been secured yet.")) return;
      try {
         setIsLoading(true);
         const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
         });
         if (res.ok) { toast.success("Trade Permanently Cancelled!"); fetchTrade(); }
         else toast.error("Cancellation failed.");
      } catch (e) { } finally { setIsLoading(false); }
   };

   const handleRequestCancellation = async () => {
      if (!confirm("Your funds are locked in the Vault. Do you want to request the Seller for a Mutual Cancellation?")) return;
      try {
         setIsLoading(true);
         const res = await fetch(`http://localhost:5000/api/transactions/${tradeId}/request-cancel`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
         });
         if (res.ok) { toast.success("Mutual Cancellation Request Sent to Seller."); }
      } catch (e) { } finally { setIsLoading(false); }
   };

   const handleRateSeller = async (score: number) => {
      try {
         const res = await fetch(`http://localhost:5000/api/user/rate/${trade.seller_id}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
            body: JSON.stringify({ score })
         });
         if (res.ok) {
            toast.success(`You rated the seller ${score} Stars!`);
            setHasRated(true);
         }
      } catch (e) { }
   };

   if (isLoading || !trade) return <div className="flex-1 flex justify-center items-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;

   return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-3 gap-8 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden">

         {/* Left Column: Flow & Details */}
         <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar min-h-0 max-h-full">

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
               <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-text-muted">Trade Payload</h3>
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
                  <h2 className="text-xl font-bold text-white tracking-tight">Escrow Tracker</h2>
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
                                 <NeonButton variant="ghost" className="flex-1 text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                                    Cancel Trade
                                 </NeonButton>
                              </div>
                           </>
                        ) : (
                           <>
                              <p className="text-sm text-text-muted pb-2">Waiting for the Seller to lock terms and send the payment request.</p>
                              <NeonButton variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </NeonButton>
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

                                 <div
                                    onClick={() => setPaymentMethod('gcash')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'gcash' ? 'border-blue-500 bg-blue-500/10' : 'border-dark-border bg-dark-bg hover:border-blue-500/50'}`}
                                 >
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <Smartphone className={`w-6 h-6 mb-2 ${paymentMethod === 'gcash' ? 'text-blue-500' : 'text-text-muted'}`} />
                                       <h4 className="text-sm font-bold text-white">GCash Direct</h4>
                                       <p className="text-xs mt-1 text-text-muted">External Gateway</p>
                                    </div>
                                 </div>

                                 <div
                                    onClick={() => setPaymentMethod('credit_card')}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-purple-500 bg-purple-500/10' : 'border-dark-border bg-dark-bg hover:border-purple-500/50'}`}
                                 >
                                    <div className="flex flex-col items-center justify-center text-center">
                                       <CreditCard className={`w-6 h-6 mb-2 ${paymentMethod === 'credit_card' ? 'text-purple-500' : 'text-text-muted'}`} />
                                       <h4 className="text-sm font-bold text-white">Credit / Debit</h4>
                                       <p className="text-xs mt-1 text-text-muted">Powered by Stripe</p>
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
                              <NeonButton variant="ghost" className="w-full mt-2 text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </NeonButton>
                           </>
                        ) : (
                           <>
                              <p className="text-sm text-text-muted pb-2">Waiting for the Buyer to deposit funds into the Midly Smart Vault.</p>
                              <NeonButton variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 border border-red-500/50" onClick={handleCancelTrade}>
                                 Cancel Trade
                              </NeonButton>
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
                                          <p className="text-sm text-primary font-bold uppercase tracking-wider">Secure Credential Payload</p>
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
                              <NeonButton variant="ghost" className="w-full mt-2 text-yellow-500 hover:bg-yellow-500/10 border border-yellow-500/50 group" onClick={handleRequestCancellation}>
                                 <XCircle className="w-4 h-4 mr-2" /> Request Mutual Cancellation
                              </NeonButton>
                           </div>
                        )}
                     </>
                  )}
                  {currentStep === 4 && (
                     <>
                        <h4 className="text-white font-bold text-sm">Retrieval Lock & Verification</h4>

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
                                       <div className="p-4 bg-dark-bg border border-primary/30 rounded-xl w-full">
                                          <div className="flex items-center gap-2 mb-2">
                                             <Unlock className="w-4 h-4 text-primary" />
                                             <p className="text-xs text-primary font-bold uppercase tracking-wider">Revealed Vault Credentials</p>
                                          </div>
                                          <div className="bg-dark-panel p-3 rounded border border-dark-border">
                                             <p className="text-white font-mono text-sm break-all select-all">{trade.account_credentials}</p>
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
                                    <button onClick={handleAutoRelease} className="w-full mt-2 text-[10px] text-primary bg-primary/10 border border-primary/20 py-2 rounded font-bold hover:bg-primary/20 transition-all uppercase tracking-widest">
                                       [Developer Tool] Force 24h Skip
                                    </button>
                                 </div>
                              ) : (
                                 <>
                                    <p className="text-sm text-text-muted pb-2">Delivery confirmed. 24-hr Retrieval Lock active. Awaiting Buyer override or auto-release.</p>
                                    <button onClick={handleAutoRelease} className="w-full mt-4 text-xs text-primary bg-primary/10 border border-primary/20 py-2 rounded font-bold hover:bg-primary/20 transition-all">
                                       [Developer Tool] Force 24h Auto-Release Simulation
                                    </button>
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
         <div className="col-span-2 flex flex-col h-full max-h-full min-h-0 bg-dark-panel border border-dark-border rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-dark-border bg-dark-bg flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary glow-icon" />
                  <h2 className="font-bold text-white">Intelligent Negotiation Hub</h2>
               </div>
               <div className="flex items-center gap-3">
                  <button onClick={() => {
                     navigator.clipboard.writeText(window.location.href);
                     toast.success("Room Invite Link Copied!");
                  }} className="px-3 py-1 bg-dark-panel hover:bg-dark-border cursor-pointer transition-colors rounded-full border border-dark-border text-xs text-white flex items-center gap-2">
                     <Copy className="w-3 h-3 text-text-muted" /> Copy Invite Link
                  </button>
                  <div className="px-3 py-1 bg-dark-panel rounded-full border border-dark-border text-xs text-text-muted flex items-center gap-2">
                     End-to-End Encrypted <ShieldCheck className="w-3 h-3 text-primary" />
                  </div>
               </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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

            <div className="p-4 bg-dark-bg border-t border-dark-border shrink-0">
               <div className="relative flex items-center">
                  <input
                     type="text"
                     value={inputText}
                     onChange={(e) => setInputText(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === "Enter" && inputText.trim()) {
                           handleSendMessage(inputText);
                           setInputText("");
                        }
                     }}
                     disabled={currentStep >= 5}
                     placeholder={currentStep >= 5 ? "Escrow closed..." : "Send a secure message..."}
                     className="w-full bg-dark-panel border border-dark-border rounded-full pl-5 pr-24 py-4 text-white focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-muted disabled:opacity-50"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                     <button className="p-2 text-text-muted hover:text-white transition-colors" title="Attach Proof" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="w-5 h-5" />
                     </button>
                     <NeonButton
                        className="!py-2 !px-4 !rounded-full"
                        disabled={!inputText.trim() || currentStep >= 5 || isAiProcessing}
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
      </div>
   );
}
