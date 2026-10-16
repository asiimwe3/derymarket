'use client';
// S6 — Checkout shell: address, payment method list, cost breakdown, escrow box.
// Payment capture (PesaPal) is wired in a later phase; this is the honest UI skeleton.
import { useState } from 'react';
import { getCart, cartTotal } from '@/lib/cart';
import { EscrowBanner } from '@/components/ui';

const PAYMENTS = ['MTN MoMo', 'Airtel Money', 'Card', 'Cash on delivery'];

export default function CheckoutPage() {
  const total = cartTotal(getCart());
  const [payment, setPayment] = useState(PAYMENTS[0]);
  const [address, setAddress] = useState('');

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Checkout</h1>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Delivery address</h2>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
          placeholder="Village / street, town, district" className="w-full rounded-lg border border-neutral-300 p-2 text-sm" />
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Payment method</h2>
        <div className="space-y-2">
          {PAYMENTS.map((p) => (
            <label key={p} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${payment === p ? 'border-market-500 bg-market-50' : 'border-neutral-200'}`}>
              <input type="radio" name="pay" checked={payment === p} onChange={() => setPayment(p)} />
              {p}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <div className="flex justify-between text-sm text-neutral-600"><span>Items</span><span>UGX {total.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm text-neutral-600"><span>Delivery</span><span>UGX 0 (Phase 1)</span></div>
        <div className="mt-2 flex justify-between font-bold"><span>Total</span><span>UGX {total.toLocaleString()}</span></div>
      </section>

      <EscrowBanner text="Your payment is held in escrow by DeryMarket. The seller is paid only after you confirm the order arrived." />
      <button disabled className="w-full rounded-full bg-neutral-300 py-3 font-bold text-neutral-500" title="PesaPal + order lifecycle arrive with the Trade Engine lesson">
        Pay UGX {total.toLocaleString()} (payments land with the Trade Engine lesson)
      </button>
    </div>
  );
}
