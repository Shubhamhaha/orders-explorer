import { describe, expect, it } from 'vitest';
import { normalizeOrders, parseDate } from './normalize';

const base = { currency: 'INR', region: 'north', channel: 'web', paymentMethod: 'upi', itemCount: 1, customerEmail: 'a@b.c' };

describe('parseDate', () => {
  const t = Date.UTC(2025, 2, 14, 9, 30, 0);
  it('reads all four formats', () => {
    expect(parseDate('2025-03-14T09:30:00.000Z')).toBe(t);
    expect(parseDate('2025-03-14T09:30:00')).toBe(t); // no timezone = UTC
    expect(parseDate(t / 1000)).toBe(t);
    expect(parseDate('14/03/2025')).toBe(Date.UTC(2025, 2, 14));
  });
  it('rejects junk', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate('31/02/2025')).toBeNull();
    expect(parseDate('nope')).toBeNull();
  });
});

describe('normalizeOrders', () => {
  it('applies the data-notes rules', () => {
    const { orders } = normalizeOrders([
      { ...base, id: 'ORD-0000001', schemaVersion: 1, customer_name: 'Asha', status: 'SHIPPED', amount: 12345650, createdAt: '14/03/2025', currency: 'INR ' },
      { ...base, id: 'ORD-0000002', schemaVersion: 2, customerName: 'Ravi', status: 'Delivered', amount: '4599.5', createdAt: 1741944600, updatedAt: null, region: 'SOUTH', priority: 2 },
    ]);
    expect(orders[0]).toMatchObject({ customer: 'Asha', status: 'shipped', amount: 123456.5, region: 'NORTH', priority: null, updatedAt: null });
    expect(orders[1]).toMatchObject({ customer: 'Ravi', status: 'delivered', amount: 4599.5, priority: 2 });
  });

  it('keeps one record per ID using the duplicate rules', () => {
    const rec = (id: string, note: string, updatedAt?: string) => ({ ...base, id, schemaVersion: 2, customerName: 'x', status: 'pending', amount: 1, createdAt: '14/03/2025', notes: note, ...(updatedAt ? { updatedAt } : {}) });
    const { orders, stats } = normalizeOrders([
      rec('ORD-0000001', 'older', '2025-01-01T00:00:00Z'), rec('ORD-0000001', 'newer', '2025-02-01T00:00:00Z'), // later updatedAt wins
      rec('ORD-0000002', 'has-updated', '2025-01-01T00:00:00Z'), rec('ORD-0000002', 'none'), //                    only one has it
      rec('ORD-0000003', 'first'), rec('ORD-0000003', 'second'), //                                               neither: later in file
      rec('ORD-0000004', 'later-in-file', '2025-01-01T00:00:00Z'), rec('ORD-0000004', 'earlier-date-later-file', '2024-01-01T00:00:00Z'),
    ]);
    expect(Object.fromEntries(orders.map((o) => [o.id, o.notes]))).toEqual({
      'ORD-0000001': 'newer', 'ORD-0000002': 'has-updated', 'ORD-0000003': 'second', 'ORD-0000004': 'later-in-file',
    });
    expect(stats.duplicatesRemoved).toBe(4);
  });

  it('keeps notes as plain text', () => {
    const { orders } = normalizeOrders([{ ...base, id: 'ORD-0000001', schemaVersion: 2, status: 'pending', amount: 1, createdAt: 0, notes: '<script>x</script>' }]);
    expect(orders[0].notes).toBe('<script>x</script>');
  });
});
