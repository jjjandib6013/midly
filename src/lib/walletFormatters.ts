import { ArrowDownLeft, ArrowUpRight, Clock, History, ShieldAlert } from 'lucide-react';
import React from 'react';

export type TransactionFormat = {
   title: string;
   icon: React.ElementType;
   colorClass: string;
   bgClass: string;
   isPositive: boolean;
};

export const getTransactionUIInfo = (type: string, amount: string | number, description: string): TransactionFormat => {
   const numericAmount = Number(amount);
   const isPositive = numericAmount > 0;

   // Common defaults based on positive or negative amount
   const defaultPositive = { title: 'Funds Added', icon: ArrowDownLeft, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10 border-emerald-500/30', isPositive: true };
   const defaultNegative = { title: 'Funds Sent', icon: ArrowUpRight, colorClass: 'text-zinc-100', bgClass: 'bg-white/5 border-white/10', isPositive: false };

   switch(type) {
      case 'deposit':
         return { ...defaultPositive, title: 'Wallet Top-Up' };
      case 'deposit_pending':
         return { title: 'Pending Top-Up', icon: Clock, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/30', isPositive: true };
      case 'deposit_fulfilled':
         return { ...defaultPositive, title: 'Wallet Top-Up' };
      case 'withdrawal':
         return { ...defaultNegative, title: 'Funds Withdrawn' };
      case 'withdrawal_pending':
         return { title: 'Pending Withdrawal', icon: Clock, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10 border-amber-500/30', isPositive: false };
      case 'trade_escrow_lock':
         return { title: 'Escrow Locked', icon: ArrowUpRight, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10 border-blue-500/30', isPositive: false };
      case 'trade_escrow_release':
         return { ...defaultPositive, title: 'Escrow Released' };
      case 'trade_refund':
         return { ...defaultPositive, title: 'Escrow Refunded' };
      case 'penalty_fee':
         return { title: 'Penalty Fee', icon: ShieldAlert, colorClass: 'text-red-400', bgClass: 'bg-red-500/10 border-red-500/30', isPositive: false };
      default:
         // If we don't recognize the type, fallback to a clean title or generic layout
         // If description is clean enough, we can use it, but typically we want a generic fallback
         return isPositive ? defaultPositive : defaultNegative;
   }
};

export const formatCurrency = (amount: number | string): string => {
   return Math.abs(Number(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const groupTransactionsByDate = (transactions: any[]) => {
   const groups: { [key: string]: any[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Older': []
   };

   const today = new Date();
   today.setHours(0, 0, 0, 0);
   
   const yesterday = new Date(today);
   yesterday.setDate(yesterday.getDate() - 1);
   
   const thisWeek = new Date(today);
   thisWeek.setDate(thisWeek.getDate() - 7);

   transactions.forEach(tx => {
      const txDate = new Date(tx.created_at);
      if (txDate >= today) {
         groups['Today'].push(tx);
      } else if (txDate >= yesterday) {
         groups['Yesterday'].push(tx);
      } else if (txDate >= thisWeek) {
         groups['This Week'].push(tx);
      } else {
         groups['Older'].push(tx);
      }
   });

   return groups;
};
