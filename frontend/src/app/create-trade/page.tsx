"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ShieldAlert, ArrowRight, Info, ShieldCheck, Tag, Gamepad2, Coins } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function CreateTrade() {
  const [price, setPrice] = useState("");
  const [game, setGame] = useState("");
  const [itemType, setItemType] = useState("");
  const [tradeRole, setTradeRole] = useState<"BUY" | "SELL" | "">("");

  const fee = price ? (parseFloat(price) * 0.05).toFixed(2) : "0.00";
  const total = price ? (parseFloat(price) + parseFloat(price) * 0.05).toFixed(2) : "0.00";

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          New Secure Trade
          <ShieldCheck className="w-6 h-6 text-primary glow-icon" />
        </h1>
        <p className="text-text-muted mt-2">Initialize a smart escrow contractasd Funds will be held safely until both parties confirm delivery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-dark-border/50 pb-4">
              <Tag className="w-5 h-5 text-primary" /> Contract Details
            </h3>

            <form className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-text-muted">My Role in this Trade</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setTradeRole("BUY")}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${tradeRole === "BUY" ? "border-primary bg-primary/10 glow-icon" : "border-dark-border bg-dark-bg hover:border-text-muted/50"}`}
                  >
                    <h4 className={`font-bold ${tradeRole === "BUY" ? "text-primary" : "text-white"}`}>I am Buying</h4>
                    <p className="text-xs text-text-muted mt-1">You will deposit funds into escrow.</p>
                  </div>
                  <div
                    onClick={() => setTradeRole("SELL")}
                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${tradeRole === "SELL" ? "border-yellow-500 bg-yellow-500/10 glow-icon" : "border-dark-border bg-dark-bg hover:border-text-muted/50"}`}
                  >
                    <h4 className={`font-bold ${tradeRole === "SELL" ? "text-yellow-500" : "text-white"}`}>I am Selling</h4>
                    <p className="text-xs text-text-muted mt-1">You will hand over the asset.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">Game / Platform</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Gamepad2 className="h-5 w-5 text-text-muted" />
                    </div>
                    <select
                      value={game}
                      onChange={(e) => setGame(e.target.value)}
                      className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 appearance-none focus:outline-none focus:border-primary/50"
                    >
                      <option value="" disabled>Select Game...</option>
                      <option value="MLBB">Mobile Legends: Bang Bang</option>
                      <option value="CODM">Call of Duty Mobile</option>
                      <option value="VALORANT">Valorant</option>
                      <option value="DOTA2">Dota 2</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">Item / Asset Description</label>
                  <input
                    type="text"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    placeholder="e.g. Mythical Glory Account (Max Emblems)"
                    className="w-full bg-dark-bg border border-dark-border text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Total Price (₱ PHP)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-xl font-bold text-white">₱</span>
                  </div>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-dark-bg border border-dark-border text-white text-lg font-bold rounded-lg pl-10 pr-4 py-4 focus:outline-none focus:border-primary/50 font-mono"
                  />
                </div>
              </div>
            </form>
          </DynamicCard>

          <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-panel">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-500" /> Security Warning
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Ensure you describe the item accurately. Disputes will be handled directly by Midly admins based on this exact description. Do not communicate outside the Midly platform.
            </p>
          </DynamicCard>
        </div>

        {/* Sidebar Summary */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <DynamicCard hoverEffect={false} className="border-t-2 border-t-primary/50 bg-dark-panel">
              <h3 className="font-bold text-white mb-6">Contract Overview</h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted flex items-center gap-1">Base Price <Info className="w-3 h-3 text-text-muted" /></span>
                  <span className="font-bold text-white">₱ {price ? parseFloat(price).toFixed(2) : "0.00"}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-muted flex items-center gap-1">Midly Escrow Fee (5%)</span>
                  <span className="font-bold text-red-400">+ ₱ {fee}</span>
                </div>

                <div className="h-[1px] w-full bg-dark-border/50 my-2" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">Total Amount</span>
                  <span className="text-xl font-bold text-primary neon-glow">₱ {total}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary leading-relaxed mb-6">
                This amount will be locked and cannot be released until both parties confirm item handover.
              </div>

              <Link href="/trade/1097" className="block">
                <NeonButton
                  className="w-full gap-2 text-sm"
                  disabled={!tradeRole || !price || !game || !itemType}
                >
                  Generate Private Link <ArrowRight className="w-4 h-4" />
                </NeonButton>
              </Link>
            </DynamicCard>
          </div>
        </div>
      </div>
    </div>
  );
}
