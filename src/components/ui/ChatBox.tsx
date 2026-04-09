"use client";

import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Send, ShieldAlert, ShieldCheck, ShieldEllipsis } from "lucide-react";
import DynamicCard from "./DynamicCard";
import NeonButton from "./NeonButton";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Message = {
  id: string;
  text: string;
  sender: "user" | "other" | "ai";
  riskLevel?: "Safe" | "Medium" | "High";
  timestamp: string;
};

interface ChatBoxProps {
  initialMessages: Message[];
  onSendMessage: (text: string) => void;
  isProcessingText?: string;
}

export default function ChatBox({
  initialMessages,
  onSendMessage,
  isProcessingText,
}: ChatBoxProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages, isProcessingText]);

  // GSAP Message Entrance Animations
  useGSAP(() => {
     if (messagesContainerRef.current) {
        gsap.fromTo(
           ".message-item",
           { opacity: 0, y: 15, scale: 0.95 },
           { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: "back.out(1.2)" }
        );
     }
  }, [initialMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  const getRiskColor = (level?: "Safe" | "Medium" | "High") => {
    switch (level) {
      case "Safe":
        return "text-[#3FE56C] border-[#3FE56C] bg-[#3FE56C]/10";
      case "Medium":
        return "text-yellow-500 border-yellow-500 bg-yellow-500/10";
      case "High":
        return "text-red-500 border-red-500 bg-red-500/10";
      default:
        return "text-[#8892b0] border-[#0a0d14] bg-[#050608]";
    }
  };

  const getRiskIcon = (level?: "Safe" | "Medium" | "High") => {
    switch (level) {
      case "Safe":
        return <ShieldCheck className="w-4 h-4 text-[#3FE56C]" />;
      case "Medium":
        return <ShieldEllipsis className="w-4 h-4 text-yellow-500" />;
      case "High":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DynamicCard className="flex flex-col h-[600px] p-0 border border-white/5 bg-[#0a0d14]/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden" hoverEffect={false}>
      {/* Chat Header */}
      <div className="p-6 border-b border-white/5 bg-[#030407]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div>
           <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
             Secure Telemetry Chat
             <span className="flex h-3 w-3 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FE56C] opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3FE56C] shadow-[0_0_10px_rgba(63,229,108,0.8)]"></span>
             </span>
           </h3>
           <p className="text-xs font-bold text-[#8892b0] uppercase tracking-widest mt-1">
             End-to-End AI Protected Stream
           </p>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#050608]">
          {initialMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "message-item flex flex-col max-w-[85%]",
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {msg.sender === "ai" ? (
                <div className="w-full flex justify-center my-6">
                  <div className="px-5 py-2.5 rounded-full border border-[#3FE56C]/30 bg-[#3FE56C]/10 flex items-center gap-3 text-sm text-[#3FE56C] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(63,229,108,0.1)]">
                    <ShieldCheck className="w-5 h-5 drop-shadow-[0_0_10px_rgba(63,229,108,0.5)]" />
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "px-6 py-4 relative group text-base font-medium transition-all shadow-lg",
                    msg.sender === "user"
                      ? "bg-[#3FE56C] text-[#030407] rounded-3xl rounded-br-sm shadow-[0_10px_20px_rgba(63,229,108,0.2)]"
                      : "bg-[#0a0d14] border border-white/10 text-white rounded-3xl rounded-bl-sm"
                  )}
                >
                  <p>{msg.text}</p>

                  {/* Risk Badge for Other users */}
                  {msg.sender === "other" && msg.riskLevel && (
                    <div
                      className={cn(
                        "absolute -right-28 top-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
                        getRiskColor(msg.riskLevel)
                      )}
                    >
                      {getRiskIcon(msg.riskLevel)}
                      {msg.riskLevel}
                    </div>
                  )}
                </div>
              )}
              {msg.sender !== "ai" && (
                <span className="text-[10px] text-[#8892b0] mt-2 px-2 font-bold uppercase tracking-widest">
                  {msg.timestamp}
                </span>
              )}
            </div>
          ))}
          
          {isProcessingText && (
            <div className="message-item flex items-center gap-3 text-[#3FE56C]/70 text-xs font-black uppercase tracking-widest ml-6 bg-[#3FE56C]/5 border border-[#3FE56C]/20 px-4 py-2 rounded-xl inline-flex">
              <div className="flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-[#3FE56C] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-[#3FE56C] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-[#3FE56C] rounded-full animate-bounce"></div>
              </div>
              <span>{isProcessingText}</span>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/5 bg-[#030407] mt-auto">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Initialize highly secure message packet..."
            className="flex-1 bg-[#050608] border border-white/10 text-white font-medium px-6 py-4 rounded-2xl focus:outline-none focus:border-[#3FE56C]/50 focus:shadow-[0_0_20px_rgba(63,229,108,0.1)] transition-all placeholder:text-white/20"
          />
          <NeonButton
            type="submit"
            className="rounded-2xl !px-6 !py-4 shadow-xl"
            disabled={!input.trim()}
          >
            <Send className="w-6 h-6 text-[#030407]" />
          </NeonButton>
        </form>
      </div>
    </DynamicCard>
  );
}
