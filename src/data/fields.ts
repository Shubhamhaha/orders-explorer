import type { Order } from '../types';

export type FieldType = 'text' | 'number' | 'date' | 'enum';

export interface Option {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: Option[];
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const opts = (values: string[], label: (v: string) => string = title): Option[] =>
  values.map((value) => ({ value, label: label(value) }));

export const STATUS_OPTIONS = opts(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const REGION_OPTIONS = opts(['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTHEAST']);
export const CHANNEL_OPTIONS = opts(['web', 'app', 'phone', 'store']);
export const PAYMENT_OPTIONS = opts(['upi', 'card', 'netbanking', 'cod', 'wallet'], (v) =>
  v === 'upi' || v === 'cod' ? v.toUpperCase() : v === 'netbanking' ? 'Net banking' : title(v),
);
export const PRIORITY_OPTIONS: Option[] = [
  { value: '1', label: '1 (highest)' },
  { value: '2', label: '2' },
  { value: '3', label: '3 (lowest)' },
  { value: 'none', label: 'None' },
];

/** Fields the filter builder can use. Keys match Order properties. */
export const FIELDS: FieldDef[] = [
  { key: 'status', label: 'Status', type: 'enum', options: STATUS_OPTIONS },
  { key: 'region', label: 'Region', type: 'enum', options: REGION_OPTIONS },
  { key: 'channel', label: 'Channel', type: 'enum', options: CHANNEL_OPTIONS },
  { key: 'paymentMethod', label: 'Payment', type: 'enum', options: PAYMENT_OPTIONS },
  { key: 'priority', label: 'Priority', type: 'enum', options: PRIORITY_OPTIONS },
  { key: 'amount', label: 'Amount (₹)', type: 'number' },
  { key: 'itemCount', label: 'Items', type: 'number' },
  { key: 'createdAt', label: 'Created', type: 'date' },
  { key: 'updatedAt', label: 'Updated', type: 'date' },
  { key: 'id', label: 'Order ID', type: 'text' },
  { key: 'customer', label: 'Customer', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

export function optionLabel(field: FieldDef, value: string): string {
  return field.options?.find((o) => o.value === value)?.label ?? value;
}

/** Enum value of an order as the string used by filter options. */
export function enumValue(o: Order, key: string): string {
  if (key === 'priority') return o.priority === null ? 'none' : String(o.priority);
  return String((o as unknown as Record<string, unknown>)[key] ?? '');
}
