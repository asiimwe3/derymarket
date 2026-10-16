'use client';
// S6 — Checkout: creates real orders per cart line via POST /orders.
// Money capture (PesaPal) lands in a later phase; orders start in 'created'
// with stock reserved, exactly as the Trade Engine specifies.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCart, cartTotal, clearCart, type CartItem } from '@/lib/cart';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EscrowBanner } from '@/components/ui';

const PAYMENTS: Array<[string, string]> = [
  ['MTN MoMo', 'mtn_momo'],
  ['Airtel Money', 'airtel_money'],
  ['Card', 'card'],
  ['Cash on delivery', 'cod'],
];

export default function CheckoutPage() {
  const total = cartTotal(getCart());
  const [payment, setPayment] = useState(PAYMENTS[0][1]);
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const auth = { currentUser: user };
  const router = useRouter();

  const placeOrders = async () => {
    if (!auth.currentUser) { setError('Sign in first (Account → login).'); return; }
    if (!address.trim()) { setError('Enter a delivery address.'); return; }
    const cart = getCart();
    if (!cart.length) { setError('Your cart is empty.'); return; }
    setBusy(true); setError('');
    try {
      for (const it of cart) {
        await apiFetch(auth, '/orders', {
          method: 'POST',
          body: JSON.stringify({ listingId: it.listingId, quantity: it.qty, paymentMethod: payment, deliveryAddress: address.trim() }),
        });
      }
      clearCart();
      router.push('/orders?placed=1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed.');
    } finally {
      setBusy(false);
    }
  };

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
          {PAYMENTS.map(([label, value]) => (
            <label key={value} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${payment === value ? 'border-market-500 bg-market-50' : 'border-neutral-200'}`}>
              <input type="radio" name="pay" checked={payment === value} onChange={() => setPayment(value)} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <div className="flex justify-between text-sm text-neutral-600"><span>Items</span><span>UGX {total.toLocaleString()}</span></div>
        <div className="flex justify-between text-sm text-neutral-600"><span>Delivery</span><span>UGX 0 (Phase 1)</span></div>
        <div className="mt-2 flex justify-between font-bold"><span>Total</span><span>UGX {total.toLocaleString()}</span></div>
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <EscrowBanner text="Your payment is held in escrow by DeryMarket. The seller is paid only after you confirm the order arrived." />
      <button onClick={placeOrders} disabled={busy}
        className="w-full rounded-full bg-market-600 py-3 font-bold text-white disabled:opacity-60">
        {busy ? 'Placing order…' : `Place order — UGX ${total.toLocaleString()}`}
      </button>
      <p className="text-center text-xs text-neutral-400">Money collection (PesaPal) arrives with the payments phase; this creates the order and reserves stock now.</p>
    </div>
  );
}
