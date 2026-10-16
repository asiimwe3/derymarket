'use client';
// Shared app shell: search-first header (S2) + buyer bottom nav (per wireframe spec).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const NAV = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/browse', label: 'Browse', icon: '🔍' },
  { href: '/orders', label: 'Orders', icon: '📦' },
  { href: '/chats', label: 'Chats', icon: '💬' },
  { href: '/account', label: 'Account', icon: '👤' }
];

export function Header() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-10 bg-market-600 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-black tracking-tight">DeryMarket</Link>
        <form action="/browse" className="flex-1">
          <input
            name="q"
            placeholder="Search products, wholesale, services..."
            className="w-full rounded-full bg-white px-4 py-2 text-sm text-neutral-900 outline-none"
            aria-label="Search"
          />
        </form>
        <nav className="hidden gap-4 text-sm md:flex">
          <Link href="/orders" className="opacity-90 hover:opacity-100">Orders</Link>
          <Link href="/account" className="opacity-90 hover:opacity-100">Account</Link>
          {!user && <Link href="/login" className="rounded-full bg-gold-400 px-3 py-1 font-semibold text-neutral-900">Sign in</Link>}
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white md:hidden" aria-label="Primary">
      <div className="mx-auto flex max-w-6xl">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={`flex flex-1 flex-col items-center py-2 text-[11px] ${pathname === n.href ? 'text-market-600 font-semibold' : 'text-neutral-500'}`}>
            <span aria-hidden>{n.icon}</span>{n.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
