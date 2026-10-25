import { describe, expect, it } from 'vitest';
import { normalizeOrders } from '../data/normalize';
import { compileFilter } from './compile';
import type { FilterState } from './model';

const mk = (id: number, o: Record<string, unknown>) => ({ id: `ORD-${String(id).padStart(7, '0')}`, schemaVersion: 2, customerName: 'N', customerEmail: 'e@x.y', currency: 'INR', channel: 'web', paymentMethod: 'upi', itemCount: 1, notes: '', ...o });
const { orders } = normalizeOrders([
  mk(1, { status: 'shipped', region: 'NORTH', amount: 6000, createdAt: '2025-03-14T10:00:00Z', priority: 1 }),
  mk(2, { status: 'delivered', region: 'SOUTH', amount: 100, createdAt: '2025-03-15T00:00:00Z' }),
  mk(3, { status: 'pending', region: 'SOUTH', amount: 9000, createdAt: '2025-03-16T00:00:00Z', priority: 3 }),
]);
const ids = (f: FilterState) => orders.filter(compileFilter(f) ?? (() => true)).map((o) => o.id.slice(-1));
const c = (field: string, op: string, value: string[], n = 1) => ({ id: `c${field}${n}`, field, op: op as never, value });

describe('compileFilter', () => {
  it('ORs inside a group and ANDs between groups', () => {
    const f: FilterState = [
      { id: 'g1', conditions: [c('status', 'in', ['shipped']), c('status', 'in', ['delivered'], 2)] },
      { id: 'g2', conditions: [c('amount', 'gt', ['5000'])] },
    ];
    expect(ids(f)).toEqual(['1']);
  });
  it('supports the None priority option', () => {
    expect(ids([{ id: 'g', conditions: [c('priority', 'in', ['none'])] }])).toEqual(['2']);
  });
  it('filters dates by UTC day, inclusive for between', () => {
    expect(ids([{ id: 'g', conditions: [c('createdAt', 'between', ['2025-03-14', '2025-03-15'])] }])).toEqual(['1', '2']);
    expect(ids([{ id: 'g', conditions: [c('createdAt', 'after', ['2025-03-14'])] }])).toEqual(['2', '3']);
    expect(ids([{ id: 'g', conditions: [c('createdAt', 'before', ['2025-03-15'])] }])).toEqual(['1']);
  });
  it('ignores incomplete conditions', () => {
    expect(compileFilter([{ id: 'g', conditions: [c('amount', 'between', ['5'])] }])).toBeNull();
  });
});
