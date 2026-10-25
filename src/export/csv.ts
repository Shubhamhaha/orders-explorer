import type { Order } from '../types';
import { isoDate } from '../utils/format';

const HEADERS = ['id', 'customer', 'email', 'status', 'amount_inr', 'created_at_utc', 'updated_at_utc', 'region', 'channel', 'priority', 'payment_method', 'item_count', 'notes'];

/** Quote, and neutralise spreadsheet formulas (=, +, -, @) that staff-written text could contain. */
function cell(v: string | number | null): string {
  let s = v === null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ordersToCsv(orders: Order[]): string {
  const lines = [HEADERS.join(',')];
  for (const o of orders) {
    lines.push(
      [
        o.id, o.customer, o.email, o.status, o.amount, isoDate(o.createdAt), isoDate(o.updatedAt),
        o.region, o.channel, o.priority === null ? 'None' : o.priority, o.paymentMethod, o.itemCount, o.notes,
      ].map(cell).join(','),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`; // BOM so Excel reads UTF-8
}

export function downloadCsv(orders: Order[], filename: string): void {
  const url = URL.createObjectURL(new Blob([ordersToCsv(orders)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
