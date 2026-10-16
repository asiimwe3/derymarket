'use client';
import Link from 'next/link';
// Seller flow — POST /api/v1/listings (the worked endpoint from the course).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

export default function SellPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('product');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      await apiFetch(user ? { currentUser: user } : null, '/listings', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          workspaceId, title, kind, description,
          price: Number(price), currency: 'UGX', unit: 'each', stock: Number(stock)
        })
      });
      router.push('/browse');
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  if (!user)
    return (
      <div className="mx-auto max-w-sm py-12 text-center">
        <h1 className="text-lg font-bold">Sign in to sell</h1>
        <Link href="/login" className="mt-3 inline-block rounded-full bg-market-600 px-6 py-2 font-semibold text-white">Sign in</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="text-xl font-bold">List an item</h1>
      <input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="Workspace ID (from POST /workspaces)" className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (min 3 characters)" className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm" />
      <div className="grid grid-cols-3 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-neutral-300 p-2.5 text-sm">
          <option value="product">Product</option>
          <option value="used_good">Used / deal</option>
          <option value="produce">Farm produce</option>
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="Price UGX" className="rounded-lg border border-neutral-300 p-2.5 text-sm" />
        <input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" placeholder="Stock" className="rounded-lg border border-neutral-300 p-2.5 text-sm" />
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description (optional)" className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm" />
      <button onClick={submit} disabled={busy || !workspaceId || title.length < 3 || !price}
        className="w-full rounded-full bg-market-600 py-3 font-bold text-white disabled:bg-neutral-300">
        {busy ? 'Publishing…' : 'Publish listing'}
      </button>
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
