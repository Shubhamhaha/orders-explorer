import type { Order } from '../types';
import { formatDate, formatINR, titleCase } from '../utils/format';

export type ColumnKey =
  | 'id' | 'customer' | 'email' | 'status' | 'amount' | 'createdAt' | 'updatedAt'
  | 'region' | 'channel' | 'priority' | 'paymentMethod' | 'itemCount' | 'notes';

export interface Column {
  key: ColumnKey;
  label: string;
  width: number;
  align: 'left' | 'right';
  /** Text shown in the cell. */
  text: (o: Order) => string;
}

export const MIN_COL_WIDTH = 56;
export const NOTES_PREVIEW_CHARS = 140;

const payment = (v: string) => (v === 'upi' || v === 'cod' ? v.toUpperCase() : v === 'netbanking' ? 'Net banking' : titleCase(v));

export const COLUMNS: Column[] = [
  { key: 'id', label: 'Order ID', width: 112, align: 'left', text: (o) => o.id },
  { key: 'customer', label: 'Customer', width: 150, align: 'left', text: (o) => o.customer || '—' },
  { key: 'email', label: 'Email', width: 220, align: 'left', text: (o) => o.email || '—' },
  { key: 'status', label: 'Status', width: 100, align: 'left', text: (o) => titleCase(o.status) },
  { key: 'amount', label: 'Amount', width: 124, align: 'right', text: (o) => formatINR(o.amount) },
  { key: 'createdAt', label: 'Created (UTC)', width: 132, align: 'left', text: (o) => formatDate(o.createdAt) },
  { key: 'updatedAt', label: 'Updated (UTC)', width: 132, align: 'left', text: (o) => formatDate(o.updatedAt) },
  { key: 'region', label: 'Region', width: 96, align: 'left', text: (o) => titleCase(o.region) },
  { key: 'channel', label: 'Channel', width: 80, align: 'left', text: (o) => titleCase(o.channel) },
  { key: 'priority', label: 'Priority', width: 76, align: 'right', text: (o) => (o.priority === null ? 'None' : String(o.priority)) },
  { key: 'paymentMethod', label: 'Payment', width: 100, align: 'left', text: (o) => payment(o.paymentMethod) },
  { key: 'itemCount', label: 'Items', width: 60, align: 'right', text: (o) => (o.itemCount === null ? '—' : String(o.itemCount)) },
  {
    key: 'notes',
    label: 'Notes',
    width: 280,
    align: 'left',
    // Long notes are cut to a short preview (and collapsed to one line); the full text is in the details panel.
    text: (o) => {
      const flat = o.notes.replace(/\s+/g, ' ').trim();
      if (!flat) return '—';
      return flat.length > NOTES_PREVIEW_CHARS ? `${flat.slice(0, NOTES_PREVIEW_CHARS)}…` : flat;
    },
  },
];

export const COLUMN_KEYS = new Set<string>(COLUMNS.map((c) => c.key));
export const isColumnKey = (s: string): s is ColumnKey => COLUMN_KEYS.has(s);
export { payment as paymentLabel };
