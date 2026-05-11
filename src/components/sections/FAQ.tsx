"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

const faqs = [
  {
    question: "How does Midly hold my funds securely?",
    answer: "Funds are deposited into a secure Midly Escrow Vault tied to your specific trade. The money is locked and visible to both parties. Neither side can withdraw the funds mid-trade until mutual verification is complete or an administrator steps in."
  },
  {
    question: "What games does Midly support?",
    answer: "We support a wide variety of games including CS2, Valorant, Dota 2, Roblox, Mobile Legends, and many more. As long as the game allows item or account transfers, you can trade it securely on Midly."
  },
  {
    question: "What happens if a trader tries to scam me?",
    answer: "If a dispute arises, Midly administrators will manually step into your trade room to review the chat logs and screenshot evidence. Since the funds are safely locked in escrow, if a scam attempt is proven, your money is refunded to your wallet and the scammer is permanently banned."
  },
  {
    question: "How long does a trade take?",
    answer: "Trades can be completed in minutes once both parties agree and the buyer funds the escrow. The actual transfer time simply depends on how quickly the seller delivers the asset in-game."
  },
  {
    question: "What fees does Midly charge?",
    answer: "We charge a flat, transparent fee of 5% per successful trade. There are no hidden fees, and creating a trade room is completely free."
  },
  {
    question: "Can I cancel a trade after it's started?",
    answer: "Yes, you can mutually cancel a trade as long as the seller hasn't marked the item as delivered. If funds are already in escrow, they will be immediately refunded to the buyer's Midly wallet."
  },
  {
    question: "How do I withdraw my money?",
    answer: "Once a trade is complete and funds are released to your Midly Wallet, you can withdraw them at any time directly to your preferred local payment methods (such as GCash, Maya, or Bank Transfer)."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section id="faq" className="w-full py-24 sm:py-32 px-4 relative z-10">
      <div className="max-w-3xl mx-auto flex flex-col items-center">
        <p className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-[#8892b0] mb-4 text-center">
          Frequently Asked
        </p>
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-12 sm:mb-16 text-center">
          Questions, answered.
        </h2>

        <div className="w-full flex flex-col gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index} 
                className={`w-full border rounded-2xl transition-colors duration-300 overflow-hidden cursor-pointer ${
                  isOpen ? 'border-white/10 bg-[#0B0C10]' : 'border-white/5 bg-transparent hover:border-white/10 hover:bg-white/[0.01]'
                }`}
                onClick={() => toggleFaq(index)}
              >
                <div className="flex items-center justify-between p-6 sm:p-8">
                  <h3 className="text-sm sm:text-base font-bold text-white pr-8">
                    {faq.question}
                  </h3>
                  <div className={`shrink-0 transition-transform duration-300 ${isOpen ? 'text-primary' : 'text-[#8892b0]'}`}>
                    {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                </div>
                
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="p-6 sm:p-8 pt-0 text-sm sm:text-[15px] text-[#8892b0] leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
