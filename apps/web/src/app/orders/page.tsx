'use client';
// S7 — Orders: your real orders from the Trade Engine (GET /orders).
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { StateScreen } from '@/components/ui';

type Order = {
  id: string; title: string; quantity: number; totalPriceMinor: number;
  currency: string; state: string; paymentMethod: string; paymentState: string;
};

export default function OrdersPage() {
  return <Suspense fallback={null}><OrdersInner /></Suspense>;
}

function OrdersInner() {
  const params = useSearchParams();
  const { user } = useAuth();
  const auth = { currentUser: user };
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (user) apiFetch(auth, '/orders').then((r) => setOrders((r as { items: Order[] }).items)).catch(() => setOrders([]));
    else setOrders([]);
  }, [user, auth]);

  if (!user) return (
    <StateScreen emoji="🔐" title="Sign in to see your orders" body="Phone OTP login lives in Account." />
  );
  if (!orders) return <StateScreen emoji="⏳" title="Loading orders…" body="" />;
  if (!orders.length) return (
    <StateScreen emoji={params.get('placed') ? '✅' : '📦'} title={params.get('placed') ? 'Order placed!' : 'No orders yet'}
      body={params.get('placed') ? 'The seller has been notified. Track it here.' : 'Your placed orders will appear here.'} />
  );

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-xl font-bold">My orders</h1>
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{o.title} × {o.quantity}</p>
              <p className="text-xs text-neutral-500">{o.paymentMethod.replace('_', ' ')} · escrow</p>
            </div>
            <span className="rounded-full bg-market-50 px-2 py-1 text-xs font-bold text-market-700">{o.state}</span>
          </div>
          <p className="mt-2 text-right font-black text-market-600">UGX {o.totalPriceMinor.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
