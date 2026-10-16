// Thin client for the DeryMarket Unified Trade API (Cloud Function).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:5001/western-market-c3163/europe-west1/api/api/v1';

export type Listing = {
  id: string;
  workspaceId: string;
  title: string;
  kind: string;
  description?: string;
  price: number;
  currency: string;
  unit?: string;
  stock?: number;
  status?: string;
};

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
