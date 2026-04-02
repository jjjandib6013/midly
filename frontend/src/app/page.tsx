"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ArrowRight, Lock, CheckCircle2, PackageSearch, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import NeonButton from "@/components/ui/NeonButton";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-start pt-20 px-4">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full text-center mb-24 relative"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
          <ShieldCheck className="w-4 h-4" />
          No Blind Trust. Only Verified Safety.
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          The Ultimate <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300 drop-shadow-[0_0_15px_rgba(63,229,108,0.3)]">
            AI-Powered Escrow
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop risking your digital gaming assets to fake middleman scams. Midly mathematically calculates trust through hardware KYC, locked payment vaults, and algorithmic behavioral analysis.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto">
            <NeonButton className="w-full sm:w-auto gap-2 text-lg !py-4 !px-8">
               Create Secure Identity <ArrowRight className="w-5 h-5" />
            </NeonButton>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <NeonButton variant="ghost" className="w-full sm:w-auto text-lg !py-4 !px-8 border border-text-muted">
               Enter Vault
            </NeonButton>
          </Link>
        </div>
        
        <div className="mt-12 text-sm text-text-muted flex items-center justify-center gap-6">
           <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Dota 2</span>
           <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> CS:GO</span>
           <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Valorant</span>
        </div>
      </motion.div>

      {/* How it Works Diagram */}
      <div className="w-full max-w-5xl mb-24 z-10">
         <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">How Midly Eliminates Scams</h2>
            <p className="text-text-muted max-w-2xl mx-auto">Our automated Escrow State Engine guarantees that neither party can manipulate the transaction flow.</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-[50px] left-[20%] right-[20%] h-[2px] bg-dark-border -z-10" />

            {/* Step 1 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-dark-panel border border-dark-border p-6 rounded-2xl relative text-center">
               <div className="w-16 h-16 rounded-full bg-dark-bg border-2 border-primary mx-auto mb-6 flex items-center justify-center glow-icon shadow-[0_0_15px_rgba(63,229,108,0.3)]">
                  <Lock className="w-8 h-8 text-primary" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">1. Vault Locked</h3>
               <p className="text-sm text-text-muted">The Buyer deposits PHP funds securely into the Midly Smart Vault. Funds are verified and frozen.</p>
            </motion.div>

            {/* Step 2 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-dark-panel border border-dark-border p-6 rounded-2xl relative text-center">
               <div className="w-16 h-16 rounded-full bg-dark-bg border-2 border-primary mx-auto mb-6 flex items-center justify-center glow-icon shadow-[0_0_15px_rgba(63,229,108,0.3)]">
                  <PackageSearch className="w-8 h-8 text-primary" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">2. Secure Handover</h3>
               <p className="text-sm text-text-muted">The Seller safely transfers the digital asset knowing the funds are 100% secured by algorithm.</p>
            </motion.div>

            {/* Step 3 */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-dark-panel border border-dark-border p-6 rounded-2xl relative text-center">
               <div className="w-16 h-16 rounded-full bg-dark-bg border-2 border-primary mx-auto mb-6 flex items-center justify-center glow-icon shadow-[0_0_15px_rgba(63,229,108,0.3)]">
                  <MessageSquareWarning className="w-8 h-8 text-primary" />
               </div>
               <h3 className="text-xl font-bold text-white mb-2">3. Verified Release</h3>
               <p className="text-sm text-text-muted">Buyer inspects the asset. If satisfied, funds are instantly released to Seller. If scammed, instant dispute freezing.</p>
            </motion.div>
         </div>
      </div>
    </div>
  );
}
