'use client';
// S5 — Cart: line items, money summary, escrow banner, sticky checkout CTA.
import Link from 'next/link';
import { useState } from 'react';
import { getCart, saveCart, cartTotal, type CartItem } from '@/lib/cart';
import { EscrowBanner } from '@/components/ui';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(getCart());
  const total = cartTotal(items);

  const setQty = (i: number, qty: number) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, qty: Math.max(0, qty) } : it)).filter((it) => it.qty > 0);
    setItems(next); saveCart(next);
  };

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <span className="text-4xl" aria-hidden>🛒</span>
        <h1 className="mt-2 text-xl font-bold">Your cart is empty</h1>
        <p className="text-sm text-neutral-500">Browse the market and add something you like.</p>
        <Link href="/browse" className="mt-4 inline-block rounded-full bg-market-600 px-6 py-2 font-semibold text-white">Browse listings</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Cart ({items.length})</h1>
      {items.map((it, idx) => (
        <div key={it.listingId} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3">
          <div>
            <p className="font-semibold">{it.title}</p>
            <p className="text-sm text-neutral-500">UGX {it.priceMinor.toLocaleString()} each</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(idx, it.qty - 1)} className="h-8 w-8 rounded-full bg-neutral-100" aria-label="Decrease">−</button>
            <span className="w-6 text-center font-semibold">{it.qty}</span>
            <button onClick={() => setQty(idx, it.qty + 1)} className="h-8 w-8 rounded-full bg-neutral-100" aria-label="Increase">+</button>
          </div>
        </div>
      ))}
      <EscrowBanner text="Buyer protection: money is only released to the seller after you confirm delivery." />
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="flex justify-between text-sm text-neutral-600"><span>Subtotal</span><span>UGX {total.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm text-neutral-600"><span>Delivery</span><span>Set at checkout</span></div>
        <div className="mt-2 flex justify-between font-bold"><span>Total</span><span>UGX {total.toLocaleString()}</span></div>
        <Link href="/checkout" className="mt-4 block rounded-full bg-market-600 py-3 text-center font-bold text-white">Checkout</Link>
      </div>
    </div>
  );
}
