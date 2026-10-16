'use client';
// S7 — Orders / trade tracking. Empty state until the Trade Engine lesson ships order creation.
import { StateScreen } from '@/components/ui';

export default function OrdersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>
      <StateScreen
        emoji="📦"
        title="No orders yet"
        body="Once the Trade Engine lesson lands, every order you place will appear here with its escrow status and delivery steps."
      />
    </div>
  );
}
