'use client';
// S9 — Account: identity, role-onboarding shortcuts (FR-ACC-03), sign out.
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const ROLES = [
  { label: 'Start selling', icon: '🏷️' },
  { label: 'Register a business', icon: '🏢' },
  { label: 'Sell wholesale', icon: '📦' },
  { label: 'Offer services', icon: '🛠️' },
  { label: 'Farm produce', icon: '🌾' }
];

export default function AccountPage() {
  const { user, ready, logout } = useAuth();

  if (!ready) return <p className="py-16 text-center text-sm text-neutral-500">Loading…</p>;

  if (!user)
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <span className="text-4xl" aria-hidden>👤</span>
        <h1 className="mt-2 text-lg font-bold">You're signed out</h1>
        <p className="text-sm text-neutral-500">Sign in with your phone number to buy, sell and track orders.</p>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-market-600 px-6 py-2 font-semibold text-white">Sign in</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="flex items-center gap-3 rounded-xl bg-white p-4 shadow">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-market-100 text-xl" aria-hidden>👤</div>
        <div>
          <p className="font-bold">{user.phoneNumber ?? user.email ?? 'DeryMarket user'}</p>
          <p className="text-xs text-market-600">✓ Verified</p>
        </div>
        <button onClick={logout} className="ml-auto rounded-full border border-neutral-300 px-4 py-1.5 text-sm">Sign out</button>
      </section>

      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-bold">What do you want to do?</h2>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <Link key={r.label} href="/sell" className="rounded-lg border border-neutral-200 p-3 text-sm font-semibold hover:border-market-500">
              <span className="mr-1" aria-hidden>{r.icon}</span>{r.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
