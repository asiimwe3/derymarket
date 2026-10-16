'use client';
// S3 — Browse / search results: mode toggle + filter chips + result cards.
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiFetch, type Listing } from '@/lib/api';
import { ListingCard, StateScreen } from '@/components/ui';

const KINDS = [{ k: 'product', label: 'Market' }, { k: 'used_good', label: 'Deals' }, { k: 'produce', label: 'Agriculture' }];

function Browse() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [kind, setKind] = useState(params.get('kind') ?? 'product');
  const [items, setItems] = useState<Listing[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    setState('loading');
    apiFetch(null, `/listings?kind=${kind}&size=24&q=${encodeURIComponent(q)}`)
      .then((r) => { setItems((r as { items: Listing[] }).items); setState('ready'); })
      .catch(() => setState('error'));
  }, [kind, q]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {KINDS.map((m) => (
          <button key={m.k} onClick={() => setKind(m.k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${kind === m.k ? 'bg-market-600 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
            {m.label}
          </button>
        ))}
        {q && <span className="self-center text-sm text-neutral-500">Results for &quot;{q}&quot;</span>}
      </div>

      {state === 'loading' && <StateScreen emoji="⏳" title="Loading…" body="Fetching listings from the market." />}
      {state === 'error' && <StateScreen emoji="📡" title="Can't reach the market" body="Start the backend emulators (apps/api: npm run serve) and refresh." />}
      {state === 'ready' && items.length === 0 && (
        <StateScreen emoji="🔍" title="Nothing found" body="No active listings match. Try another mode or search term." />
      )}
      {state === 'ready' && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return <Suspense><Browse /></Suspense>;
}
