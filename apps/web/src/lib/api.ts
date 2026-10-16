// DeryMarket data access.
// Public READS go straight to Firestore (security rules allow active listings
// to everyone — fast and cheap). All WRITES go through the Unified Trade API
// so validation, authorization and idempotency always apply.
import { fbApp } from './firebase';
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy, limit as fsLimit } from 'firebase/firestore';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001/western-market-c3163/europe-west1/api/api/v1';

export type Listing = {
  id: string;
  workspaceId: string;
  title: string;
  kind: string;
  description?: string;
  priceMinor: number;
  currency: string;
  unit?: string;
  stock?: number;
  status?: string;
};

export async function browseListings(kind: string, q: string, size: number): Promise<Listing[]> {
  const fs = getFirestore(fbApp());
  const snap = await getDocs(query(collection(fs, 'listings'), orderBy('createdAt', 'desc'), fsLimit(50)));
  const items = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Listing))
    .filter(l => l.status === 'active' && l.kind === kind);
  if (q) return items.filter(l => (l.title ?? '').toLowerCase().includes(q.toLowerCase()));
  return items.slice(0, size);
}

export async function getListing(id: string): Promise<Listing | null> {
  const fs = getFirestore(fbApp());
  const snap = await getDoc(doc(fs, 'listings', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Listing) : null;
}

export async function apiFetch(
  auth: { currentUser: { getIdToken: () => Promise<string> } | null } | null,
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `Request failed (${res.status})`);
  }
  return res.json();
}
