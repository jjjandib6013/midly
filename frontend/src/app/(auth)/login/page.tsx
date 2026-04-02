"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Lock, Mail, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Login Failed");

      // Store token
      localStorage.setItem("token", data.token);

      // Redirect to Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Secure Gateway</h1>
          <p className="text-text-muted">No Blind Trust. Only Verified Traders.</p>
        </div>

        <DynamicCard className="border border-dark-border/50 bg-dark-panel p-8" hoverEffect={false}>
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-500 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Verified Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="name@domain.com"
                  required
                />
              </div>
            </div>
            asdasdasdasd
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-muted">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <NeonButton type="submit" className="w-full gap-2 mt-4" isLoading={isLoading}>
              Enter Escrow <ArrowRight className="w-4 h-4" />
            </NeonButton>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted">
              First time here?{" "}
              <Link href="/register" className="text-primary hover:text-white transition-colors font-medium">
                Create Secure Identity
              </Link>
            </p>
          </div>
        </DynamicCard>
      </motion.div>
    </div>
  );
}
