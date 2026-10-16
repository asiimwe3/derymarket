'use client';
// S4 — Listing details. GET /listings/:id is the Lesson 1 backend assignment,
// so we try the API first and fall back to the browse-cached item.
import { use, useEffect, useState } from 'react';
import { apiFetch, type Listing } from '@/lib/api';
import { EscrowBanner, StateScreen } from '@/components/ui';
import { getCart, saveCart, type CartItem } from '@/lib/cart';

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Listing | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem(`dm.listing.${id}`) ?? 'null') : null;
    apiFetch(null, `/listings/${id}`)
      .then((r) => setListing(r as Listing))
      .catch(() => {
        if (cached) setListing(cached);
        else setNote('GET /api/v1/listings/:id is your Lesson 1 assignment — build it and this page comes alive.');
      });
  }, [id]);

  const addToCart = () => {
    if (!listing) return;
    const cart = getCart();
    const existing = cart.find((i) => i.listingId === listing.id);
    if (existing) existing.qty += 1;
    else cart.push({ listingId: listing.id, title: listing.title, priceMinor: listing.priceMinor, qty: 1 });
    saveCart(cart);
    setNote('Added to cart ✓');
  };

  if (!listing) return <StateScreen emoji="🧱" title="Listing unavailable" body={note || 'Could not load this listing.'} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex h-56 items-center justify-center rounded-xl bg-market-50 text-6xl" aria-hidden>🛍️</div>
      <h1 className="text-2xl font-bold">{listing.title}</h1>
      <p className="text-2xl font-black text-market-600">UGX {listing.priceMinor?.toLocaleString()}</p>
      <p className="text-sm capitalize text-neutral-500">{String(listing.kind).replace('_', ' ')} · {listing.stock ?? 0} in stock</p>
      {listing.description && <p className="text-sm text-neutral-700">{listing.description}</p>}
      <EscrowBanner text="Pay via MTN MoMo, Airtel Money, card or cash on delivery. Money is held in escrow until you confirm delivery." />
      <div className="flex gap-2">
        <button onClick={addToCart} className="flex-1 rounded-full bg-market-600 py-3 font-bold text-white hover:bg-market-700">Add to cart</button>
        <button className="rounded-full border border-market-600 px-6 font-semibold text-market-700" aria-label="Chat with seller (coming in a later lesson)">💬 Chat</button>
      </div>
      {note && <p className="text-center text-sm font-semibold text-market-600">{note}</p>}
    </div>
  );
}
