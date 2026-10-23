import type { LoadStats, Order } from '../types';
import { normalizeOrders } from './normalize';

/**
 * orders.json lives in /public and is fetched at runtime instead of being imported:
 * it stays out of the JS bundle (tiny, fast-parsing bundle), the browser caches it
 * separately, and the UI can paint a loading state while it downloads.
 */
export async function loadOrders(signal?: AbortSignal): Promise<{ orders: Order[]; stats: LoadStats }> {
  const res = await fetch(`${import.meta.env.BASE_URL}orders.json`, { signal });
  if (!res.ok) throw new Error(`Could not load orders.json (HTTP ${res.status}).`);
  const raw: unknown = await res.json();
  return normalizeOrders(raw);
}
