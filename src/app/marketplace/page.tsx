"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, Tag, PlusSquare } from "lucide-react";
import NeonButton from "@/components/ui/NeonButton";
import DynamicCard from "@/components/ui/DynamicCard";
import toast from "react-hot-toast";

type Listing = {
   listing_id: number;
   game_type: string;
   item_name: string;
   price: number;
   seller: { first_name: string, last_name: string, reputation_score: number };
   created_at: string;
};

export default function Marketplace() {
   const router = useRouter();
   const [listings, setListings] = useState<Listing[]>([]);
   const [showModal, setShowModal] = useState(false);
   const [newGameType, setNewGameType] = useState("Valorant");
   const [newItemName, setNewItemName] = useState("");
   const [newPrice, setNewPrice] = useState("");
   const [isVerified, setIsVerified] = useState(false);

   const fetchListings = () => {
      fetch("http://localhost:5000/api/listings")
         .then(res => res.json())
         .then(data => {
            if (data.listings) setListings(data.listings);
         })
         .catch(console.error);
   };

   useEffect(() => {
      fetchListings();
      if (localStorage.getItem('token')) {
         fetch("http://localhost:5000/api/user/profile", {
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
         })
            .then(res => res.json())
            .then(data => { if (data.kyc?.status === 'approved') setIsVerified(true); })
            .catch(console.error);
      }
   }, []);

   const handleCreateListing = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         const res = await fetch("http://localhost:5000/api/listings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ gameType: newGameType, itemName: newItemName, price: newPrice })
         });
         if (res.ok) {
            toast.success("Listing posted to marketplace!");
            setShowModal(false);
            setNewItemName("");
            setNewPrice("");
            fetchListings();
         } else {
            toast.error("Failed to post listing.");
         }
      } catch (err) {
         toast.error("Server error.");
      }
   };

   const handleBuyNow = async (listingId: number) => {
      if (!localStorage.getItem('token')) {
         toast.error("You must log in to buy items.");
         return router.push('/login');
      }
      if (!isVerified) {
         toast.error("AML Law: Identity Verification Required to trade.");
         return router.push('/kyc');
      }
      try {
         const res = await fetch(`http://localhost:5000/api/listings/buy/${listingId}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem('token')}` }
         });
         const data = await res.json();
         if (res.ok) {
            toast.success("Escrow secured! Redirecting to trade hub...");
            router.push(`/trade/${data.tradeId}`);
         } else {
            toast.error(data.error || "Purchase failed.");
         }
      } catch (err) {
         toast.error("Server error.");
      }
   };

   return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
         <div className="flex justify-between items-center mb-10">
            <div>
               <h1 className="text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                  <Store className="w-10 h-10 text-primary glow-icon" /> P2P Marketplace
               </h1>
               <p className="text-text-muted mt-2 text-lg">Browse public listings. When you buy, Midly locks the Escrow automatically.</p>
            </div>
            <NeonButton onClick={() => {
               if (!localStorage.getItem('token')) return router.push('/login');
               if (!isVerified) {
                  toast.error("AML Law: Identity Verification Required to sell items.");
                  return router.push('/kyc');
               }
               setShowModal(true);
            }} className="gap-2">
               <PlusSquare className="w-5 h-5" /> Post Listing
            </NeonButton>
         </div>

         {listings.length === 0 ? (
            <div className="text-center py-20 border border-dark-border rounded-2xl bg-dark-panel">
               <Tag className="w-12 h-12 text-text-muted mx-auto mb-4" />
               <h2 className="text-xl text-white font-medium">No listings available.</h2>
               <p className="text-text-muted mt-2">Be the first to post a digital asset for sale.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {listings.map(listing => (
                  <DynamicCard key={listing.listing_id} className="border border-dark-border bg-dark-panel p-6 flex flex-col justify-between">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                              {listing.game_type}
                           </span>
                           <div className="text-right">
                              <span className="block text-2xl font-bold text-white">₱{Number(listing.price).toLocaleString()}</span>
                           </div>
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">{listing.item_name}</h3>
                        <div className="flex items-center gap-2 mb-6">
                           <div className="w-6 h-6 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center text-[10px] text-primary">
                              {listing.seller.first_name[0]}
                           </div>
                           <span className="text-sm text-text-muted">{listing.seller.first_name} {listing.seller.last_name}</span>
                           <span className="text-xs text-yellow-500 ml-auto flex items-center gap-1">★ {Number(listing.seller.reputation_score).toFixed(1)}</span>
                        </div>
                     </div>
                     <NeonButton className="w-full justify-center" onClick={() => handleBuyNow(listing.listing_id)}>
                        Buy Now via Escrow
                     </NeonButton>
                  </DynamicCard>
               ))}
            </div>
         )}

         {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
               <div className="bg-dark-panel border border-dark-border p-8 rounded-2xl w-full max-w-md shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h2 className="text-2xl font-bold text-white mb-6">Create P2P Listing</h2>
                  <form onSubmit={handleCreateListing} className="space-y-4">
                     <div>
                        <label className="block text-sm text-text-muted mb-1">Game Category</label>
                        <select value={newGameType} onChange={(e) => setNewGameType(e.target.value)} className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors">
                           <option value="Valorant">Valorant</option>
                           <option value="CS2">CS2</option>
                           <option value="Dota 2">Dota 2</option>
                           <option value="Steam Account">Steam Account</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm text-text-muted mb-1">Item Description</label>
                        <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} required placeholder="e.g. Reaver Vandal Level 4" className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" />
                     </div>
                     <div>
                        <label className="block text-sm text-text-muted mb-1">Asking Price (PHP)</label>
                        <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required min="50" placeholder="5000" className="w-full bg-dark-bg border border-dark-border rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors" />
                     </div>
                     <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-dark-border rounded-xl text-text-muted hover:text-white transition-colors">Cancel</button>
                        <NeonButton type="submit" className="flex-[2] justify-center text-lg !py-3">Post Listing</NeonButton>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
