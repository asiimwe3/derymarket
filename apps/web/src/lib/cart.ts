// Cart lives in localStorage for now (Phase 1 slice, no account required to browse).
export type CartItem = { listingId: string; title: string; priceMinor: number; qty: number };
const KEY = 'derymarket.cart.v1';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.priceMinor * i.qty, 0);
}

export function clearCart() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}