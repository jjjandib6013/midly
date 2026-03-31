"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Copy, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import EscrowTracker, { EscrowStep } from "@/components/ui/EscrowTracker";
import ChatBox, { Message } from "@/components/ui/ChatBox";

export default function TradeHub() {
  const params = useParams();
  const tradeId = params?.id || "1095";

  // Mock State for the UI
  const [currentStep, setCurrentStep] = useState<number>(3); // 1 to 5
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Secure Trade Room Initialized. MIDLY AI is monitoring this chat.", sender: "ai", timestamp: "10:00 AM" },
    { id: "2", text: "Hi, I have locked the funds. Send the account details when ready.", sender: "other", timestamp: "10:02 AM", riskLevel: "Safe" },
    { id: "3", text: "Awesome, I see the payment is secured. Sending info now.", sender: "user", timestamp: "10:05 AM" }
  ]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const steps: EscrowStep[] = [
    { id: 1, label: "Agreement", status: currentStep > 1 ? "completed" : currentStep === 1 ? "current" : "pending" },
    { id: 2, label: "Payment Secured", status: currentStep > 2 ? "completed" : currentStep === 2 ? "current" : "pending" },
    { id: 3, label: "Item Handover", status: currentStep > 3 ? "completed" : currentStep === 3 ? "current" : "pending" },
    { id: 4, label: "Verification", status: currentStep > 4 ? "completed" : currentStep === 4 ? "current" : "pending" },
    { id: 5, label: "Release Funds", status: currentStep > 5 ? "completed" : currentStep === 5 ? "current" : "pending" },
  ];

  const handleSendMessage = (text: string) => {
    // Add user message
    const newMsg: Message = { id: Date.now().toString(), text, sender: "user", timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, newMsg]);

    // Simulate AI Moderation
    setIsAiProcessing(true);
    setTimeout(() => {
      setIsAiProcessing(false);
      // AI check for scam keywords
      if (text.toLowerCase().includes("gcash") || text.toLowerCase().includes("pay me direct") || text.toLowerCase().includes("facebook")) {
        setMessages(prev => [
            ...prev,
            { id: Date.now().toString()+"ai", text: "Warning: Attempting to take payments outside Midly violates terms and voids escrow protection.", sender: "ai", timestamp: new Date().toLocaleTimeString() }
        ]);
      }
    }, 1500);
  };

  const handleConfirmAction = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Escrow Hub <span className="text-primary glow-icon text-lg px-2 rounded bg-primary/10">#{tradeId}</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">Valorant ASIA - Immortal Rank • Total: ₱ 12,500.00</p>
        </div>
        <div className="flex gap-2">
           <NeonButton variant="secondary" className="gap-2 text-sm !px-4 !py-2">
             <AlertTriangle className="w-4 h-4 text-yellow-500" /> Open Dispute
           </NeonButton>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-y-auto pb-10 custom-scrollbar">
        {/* Left Column: Flow & Details */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Tracker Card */}
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel p-8">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Live Transaction Status
            </h3>
            <EscrowTracker steps={steps} className="py-2 mb-8" />
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6 border-t border-dark-border">
              <div className="text-center sm:text-left text-sm text-text-muted flex-1">
                {currentStep === 3 && "You need to send the account credentials. Waiting for your action."}
                {currentStep === 4 && "Buyer is currently inspecting the asset. They have 24 hours to approve."}
                {currentStep === 5 && "Funds have been released to your wallet seamlessly!"}
              </div>
              
              {currentStep === 3 && (
                <NeonButton onClick={handleConfirmAction} className="w-full sm:w-auto mt-4 sm:mt-0 glow-icon">
                  Confirm Items Delivered
                </NeonButton>
              )}
              {currentStep === 4 && (
                <NeonButton onClick={handleConfirmAction} variant="secondary" className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center gap-2 pointer-events-none opacity-50">
                  <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-primary rounded-full"/>
                  Waiting for Buyer...
                </NeonButton>
              )}
              {currentStep === 5 && (
                <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-2 rounded glow-icon">
                  <CheckCircle2 className="w-5 h-5" /> Escrow Complete
                </div>
              )}
            </div>
          </DynamicCard>

          {/* Trade Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel">
               <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Buyer Info</h3>
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-dark-bg rounded-lg border border-primary/30 flex items-center justify-center glow-icon relative">
                    <span className="text-lg font-bold text-primary">J</span>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-dark-panel animate-pulse"/>
                 </div>
                 <div>
                    <p className="text-white font-medium">Juan Buyer</p>
                    <p className="text-xs text-primary glow-icon flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> KYC Verified ID</p>
                 </div>
               </div>
            </DynamicCard>
            <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel">
               <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Contract Link</h3>
               <p className="text-xs text-text-muted mb-2">Share this private link for buyers to deposit.</p>
               <div className="flex items-center p-2 rounded bg-dark-bg border border-dark-border gap-2">
                 <p className="flex-1 truncate text-sm text-text-main font-mono">midly.com/t/val-1095</p>
                 <button className="p-2 bg-dark-panel hover:bg-dark-border rounded text-text-muted hover:text-white transition-colors">
                    <Copy className="w-4 h-4" />
                 </button>
               </div>
            </DynamicCard>
          </div>
        </div>

        {/* Right Column: Chat Box */}
        <div className="col-span-1 h-full max-h-[700px]">
          <ChatBox 
            initialMessages={messages} 
            onSendMessage={handleSendMessage}
            isProcessingText={isAiProcessing ? "AI Verifying..." : undefined}
          />
        </div>
      </div>
    </div>
  );
}
