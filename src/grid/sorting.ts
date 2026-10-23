import type { Order } from '../types';
import type { ColumnKey } from './columns';

export interface SortState {
  key: ColumnKey;
  dir: 'asc' | 'desc';
}

export const DEFAULT_SORT: SortState = { key: 'createdAt', dir: 'desc' };

// Typed keys, so dates sort as time, amounts as numbers and text as text.
const NUM: Partial<Record<ColumnKey, (o: Order) => number | null>> = {
  id: (o) => o.idNum,
  amount: (o) => o.amount,
  createdAt: (o) => o.createdAt,
  updatedAt: (o) => o.updatedAt,
  priority: (o) => o.priority,
  itemCount: (o) => o.itemCount,
};

const STR: Partial<Record<ColumnKey, (o: Order) => string>> = {
  customer: (o) => o.customerKey,
  email: (o) => o.emailKey,
  status: (o) => o.status,
  region: (o) => o.region,
  channel: (o) => o.channel,
  paymentMethod: (o) => o.paymentMethod,
  notes: (o) => o.notesKey,
};

/**
 * Sorts a copy. Empty values (null date, missing priority, blank text) always go last,
 * in both directions. `Array.sort` is stable, so ties keep file order.
 * The whole dataset is sorted once per sort change; filtering afterwards keeps that order.
 */
export function sortOrders(orders: Order[], sort: SortState): Order[] {
  const sign = sort.dir === 'asc' ? 1 : -1;
  const out = orders.slice();
  const num = NUM[sort.key];
  if (num) {
    out.sort((a, b) => {
      const x = num(a);
      const y = num(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) * sign;
    });
    return out;
  }
  const str = STR[sort.key]!;
  out.sort((a, b) => {
    const x = str(a);
    const y = str(b);
    if (x === y) return 0;
    if (x === '') return 1;
    if (y === '') return -1;
    return x < y ? -sign : sign;
  });
  return out;
}
