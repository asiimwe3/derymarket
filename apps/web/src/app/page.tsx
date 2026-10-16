'use client';
// S2 — Home / Discover: mode chips, category strip, featured grid.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { browseListings, type Listing } from '@/lib/api';
import { ListingCard, EscrowBanner, StateScreen } from '@/components/ui';

const MODES = [
  { label: 'Market', q: '', kind: 'product' },
  { label: 'Deals', q: '', kind: 'used_good' },
  { label: 'Bulk', q: '', kind: 'product' },
  { label: 'Agriculture', q: '', kind: 'produce' }
];
const CATEGORIES = ['Electronics', 'Fashion', 'Home & Living', 'Groceries', 'Farm Produce', 'Building', 'Vehicles'];

export default function Home() {
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    browseListings('product', '', 8)
      .then((items) => setFeatured(items))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-5">
      <EscrowBanner text="Every order is protected: your money stays in escrow until you confirm delivery." />

      <section>
        <h2 className="mb-2 text-sm font-bold text-neutral-700">Trade modes</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MODES.map((m) => (
            <Link key={m.label} href={`/browse?kind=${m.kind}`}
              className="whitespace-nowrap rounded-full border border-market-500 bg-white px-4 py-1.5 text-sm font-semibold text-market-700 hover:bg-market-50">
              {m.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-neutral-700">Categories</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/browse?q=${encodeURIComponent(c)}`}
              className="whitespace-nowrap rounded-full bg-neutral-100 px-4 py-1.5 text-sm text-neutral-700 hover:bg-market-100">
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-neutral-700">Featured near you</h2>
        {error ? (
          <StateScreen emoji="📡" title="Can't reach the market" body={`${error}. Is the backend emulator running (npm run serve)?`} />
        ) : featured.length === 0 ? (
          <StateScreen emoji="🌱" title="No listings yet" body="The marketplace is brand new. Be the first to sell something — open Account and tap Start selling." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </section>
    </div>
  );
}
