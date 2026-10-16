// Reusable card + banner components (wireframe principle: shared components across all modes).
import Link from 'next/link';
import type { Listing } from '@/lib/api';

export function ListingCard({ l }: { l: Listing }) {
  return (
    <Link href={`/listing/${l.id}`} className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-market-500">
      {/* text-first, low-bandwidth card: no image dependency in the slice */}
      <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-market-50 text-2xl" aria-hidden>🛍️</div>
      <h3 className="truncate text-sm font-semibold">{l.title}</h3>
      <p className="text-xs text-neutral-500 capitalize">{l.kind?.replace('_', ' ')}</p>
      <p className="mt-1 font-bold text-market-600">UGX {l.price.toLocaleString()}</p>
      <span className="mt-1 inline-block rounded-full bg-market-50 px-2 py-0.5 text-[10px] font-semibold text-market-700">
        Escrow protected
      </span>
    </Link>
  );
}

export function EscrowBanner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gold-400 bg-amber-50 px-3 py-2 text-xs text-neutral-800">
      <span aria-hidden>🛡️</span>{text}
    </div>
  );
}

export function StateScreen({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="text-4xl" aria-hidden>{emoji}</span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="max-w-sm text-sm text-neutral-500">{body}</p>
    </div>
  );
}
