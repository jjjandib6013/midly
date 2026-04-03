"use client";

import { useState, useEffect } from "react";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, History } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";

type Transaction = { id: number; amount: string; type: string; date: string; status: string };

import { useRouter } from "next/navigation";

export default function Wallet() {
  const router = useRouter();
  const [balance, setBalance] = useState("0.00");
  const [isVerified, setIsVerified] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const fetchWallet = () => {
    fetch(`http://localhost:5000/api/user/wallet`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.wallet_balance !== undefined) setBalance(Number(data.wallet_balance).toFixed(2));
      });

    fetch(`http://localhost:5000/api/user/profile`, {
      headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.kyc?.status === 'approved') setIsVerified(true);
      });
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/wallet/deposit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        toast.success(`Successfully deposited ₱${amount}`);
        setAmount("");
        setIsDepositModalOpen(false);
        fetchWallet();
      } else { toast.error("Deposit failed"); }
    } catch (e) { toast.error("Server error"); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error("AML Law: Identity Verification Required to withdraw funds.");
      router.push("/kyc");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/wallet/withdraw`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully withdrew ₱${amount} to bank`);
        setAmount("");
        setIsWithdrawModalOpen(false);
        fetchWallet();
      } else { toast.error(data.error || "Withdrawal failed"); }
    } catch (e) { toast.error("Server error"); }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Wallet Card */}
        <div className="lg:col-span-2 space-y-8">
          <DynamicCard className="border border-dark-border bg-dark-panel p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <WalletIcon className="w-48 h-48" />
            </div>

            <div className="relative z-10">
              <h2 className="text-text-muted font-medium mb-2 flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-primary" /> Total Balance (PHP)
              </h2>
              <div className="text-6xl font-bold text-white tracking-tight mb-8">
                ₱{Number(balance).toLocaleString()}
              </div>

              <div className="flex gap-4">
                <NeonButton onClick={() => setIsDepositModalOpen(true)} className="flex-1 justify-center gap-2 !py-4 text-lg">
                  <ArrowDownLeft className="w-5 h-5" /> Deposit Funds
                </NeonButton>
                <NeonButton onClick={() => {
                  if (!isVerified) {
                    toast.error("AML Law: Identity Verification Required to withdraw funds.");
                    router.push("/kyc");
                  } else {
                    setIsWithdrawModalOpen(true);
                  }
                }} variant="ghost" className="flex-1 justify-center gap-2 !py-4 text-lg border border-text-muted hover:border-white">
                  <ArrowUpRight className="w-5 h-5" /> Withdraw to Bank
                </NeonButton>
              </div>
            </div>
          </DynamicCard>

          {/* Security Banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-white font-bold mb-1">Bank-Grade Security Encryption</h3>
              <p className="text-text-muted text-sm leading-relaxed">
                Your funds are secured in the Midly Smart Vault. All deposits and withdrawals map to your hardware-verified identity, preventing any money laundering or fraudulent exits.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Ledger */}
        <DynamicCard hoverEffect={false} className="border border-dark-border bg-dark-bg p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dark-border">
            <History className="w-5 h-5 text-text-muted" />
            <h3 className="text-lg font-bold text-white">Recent Ledger</h3>
          </div>
          <div className="space-y-4">
            <div className="text-center text-text-muted text-sm py-10">Ledger API coming soon...</div>
          </div>
        </DynamicCard>
      </div>

      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsDepositModalOpen(false)}>
          <div className="bg-dark-panel border border-dark-border p-8 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Deposit via GCash/Bank</h2>
            <form onSubmit={handleDeposit} className="space-y-4">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="100" placeholder="Amount (₱)" className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-white focus:outline-none focus:border-primary text-xl font-bold" />
              <NeonButton type="submit" className="w-full justify-center !py-4">Confirm Deposit</NeonButton>
            </form>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsWithdrawModalOpen(false)}>
          <div className="bg-dark-panel border border-dark-border p-8 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Withdraw to Bank</h2>
            <p className="text-sm text-text-muted mb-4">Available: ₱{Number(balance).toLocaleString()}</p>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="100" placeholder="Amount (₱)" className="w-full bg-dark-bg border border-dark-border rounded-xl p-4 text-white focus:outline-none focus:border-primary text-xl font-bold" />
              <NeonButton type="submit" className="w-full justify-center !py-4 border border-white text-white" variant="ghost">Request Withdrawal</NeonButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
