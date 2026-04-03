"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages, isProcessingText]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  const getRiskColor = (level?: "Safe" | "Medium" | "High") => {
    switch (level) {
      case "Safe":
        return "text-primary border-primary bg-primary/10";
      case "Medium":
        return "text-yellow-500 border-yellow-500 bg-yellow-500/10";
      case "High":
        return "text-red-500 border-red-500 bg-red-500/10";
      default:
        return "text-text-muted border-dark-border bg-dark-panel";
    }
  };

  const getRiskIcon = (level?: "Safe" | "Medium" | "High") => {
    switch (level) {
      case "Safe":
        return <ShieldCheck className="w-4 h-4 text-primary" />;
      case "Medium":
        return <ShieldEllipsis className="w-4 h-4 text-yellow-500" />;
      case "High":
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <DynamicCard className="flex flex-col h-[600px] p-0" hoverEffect={false}>
      {/* Chat Header */}
      <div className="p-4 border-b border-dark-border bg-dark-bg/50 backdrop-blur-md sticky top-0 z-10">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Secure Negotiation Chat
          <span className="flex h-3 w-3 relative ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </h3>
        <p className="text-xs text-text-muted">
          Messages are protected by AI Fraud Detection
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        <AnimatePresence initial={false}>
          {initialMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              {msg.sender === "ai" ? (
                <div className="w-full flex justify-center my-4">
                  <div className="glass-panel px-4 py-2 rounded-full border border-primary/30 flex items-center gap-2 text-sm text-primary neon-glow">
                    <ShieldCheck className="w-4 h-4" />
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl relative group",
                    msg.sender === "user"
                      ? "bg-primary text-black rounded-br-sm"
                      : "bg-dark-panel border border-dark-border text-text-main rounded-bl-sm"
                  )}
                >
                  <p className="text-sm">{msg.text}</p>

                  {/* Risk Badge for Other users */}
                  {msg.sender === "other" && msg.riskLevel && (
                    <div
                      className={cn(
                        "absolute -right-24 top-2 text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap",
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
                <span className="text-[10px] text-text-muted mt-1 px-1">
                  {msg.timestamp}
                </span>
              )}
            </motion.div>
          ))}
          
          {isProcessingText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-primary/70 text-xs ml-4"
            >
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce"></div>
              </div>
              <span>{isProcessingText}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-dark-border bg-dark-bg/50 mt-auto">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a secure message..."
            className="flex-1 bg-dark-panel border border-dark-border text-white px-4 py-3 rounded-xl focus:outline-none focus:border-primary/50 transition-colors"
          />
          <NeonButton
            type="submit"
            className="rounded-xl px-4 py-3"
            disabled={!input.trim()}
          >
            <Send className="w-5 h-5 text-black" />
          </NeonButton>
        </form>
      </div>
    </DynamicCard>
  );
}
