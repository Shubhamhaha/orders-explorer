import type { LoadStats, Order } from '../types';

/**
 * The ONLY place where messy source data is repaired (see docs/data-notes.md).
 * Nothing downstream (grid, filter, export) knows about schema versions, paise,
 * date formats, casing, nulls or duplicates.
 */

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Rules 4 + 5: four date formats (plus a defensive ms/numeric-string case). Always UTC. */
export function parseDate(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return null;
    return v > 1e11 ? v : v * 1000; // epoch seconds (ms tolerated)
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^\d{9,13}$/.test(s)) return parseDate(Number(s));
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) {
    const [, d, m, y] = dmy;
    const t = Date.UTC(Number(y), Number(m) - 1, Number(d));
    const back = new Date(t);
    // reject overflow such as 31/02/2025
    return back.getUTCDate() === Number(d) && back.getUTCMonth() === Number(m) - 1 ? t : null;
  }
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/i.test(s);
  const t = Date.parse(hasTz ? s : `${s}Z`); // no timezone => UTC
  return Number.isNaN(t) ? null : t;
}

/** Rule 3: number or numeric string. */
function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parsePriority(v: unknown): number | null {
  const n = parseNumber(v);
  return n === 1 || n === 2 || n === 3 ? n : null; // Rule 8
}

function normalizeOne(r: Raw, seq: number): Order | null {
  const id = str(r.id);
  if (!id) return null;

  const version = r.schemaVersion === 1 || r.schemaVersion === '1' ? 1 : 2;
  let amount = parseNumber(r.amount);
  if (amount !== null && version === 1) amount = amount / 100; // Rule 2: paise -> rupees

  const customer = str(r.customerName) || str(r.customer_name); // Rule 1
  const email = str(r.customerEmail);
  const notes = typeof r.notes === 'string' ? r.notes : ''; // Rule 9: plain text, null -> ''
  const idMatch = /^ORD-(\d+)$/.exec(id);

  // Rule 10 (currency "INR ") needs no field: the currency is always INR and is not stored.
  return {
    id,
    seq,
    customer,
    email,
    status: str(r.status).toLowerCase(), // Rule 6
    amount,
    createdAt: parseDate(r.createdAt),
    updatedAt: parseDate(r.updatedAt), // Rule 5: null and missing behave the same
    region: str(r.region).toUpperCase(), // Rule 6
    channel: str(r.channel).toLowerCase(),
    priority: parsePriority(r.priority),
    paymentMethod: str(r.paymentMethod).toLowerCase(),
    itemCount: parseNumber(r.itemCount),
    notes,
    idKey: id.toLowerCase(),
    customerKey: customer.toLowerCase(),
    emailKey: email.toLowerCase(),
    notesKey: notes.toLowerCase(),
    idNum: idMatch ? Number(idMatch[1]) : null,
  };
}

/** Rule 7. `b` appears later in the file than `a`. */
export function pickDuplicate(a: Order, b: Order): Order {
  if (a.updatedAt !== null && b.updatedAt !== null) return b.updatedAt >= a.updatedAt ? b : a;
  if (a.updatedAt !== null) return a;
  if (b.updatedAt !== null) return b;
  return b;
}

export function normalizeOrders(raw: unknown): { orders: Order[]; stats: LoadStats } {
  if (!Array.isArray(raw)) throw new Error('orders.json must contain a JSON array.');
  const byId = new Map<string, Order>();
  let skipped = 0;
  let duplicates = 0;
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const order = isObject(item) ? normalizeOne(item, i) : null;
    if (!order) {
      skipped++;
      continue;
    }
    const existing = byId.get(order.id);
    if (existing) {
      duplicates++;
      byId.set(order.id, pickDuplicate(existing, order));
    } else {
      byId.set(order.id, order);
    }
  }
  const orders = [...byId.values()].sort((a, b) => a.seq - b.seq);
  return { orders, stats: { rawCount: raw.length, duplicatesRemoved: duplicates, skipped } };
}
