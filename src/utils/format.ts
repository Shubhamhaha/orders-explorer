const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-IN');

/** ₹1,23,456.50 */
export const formatINR = (n: number | null) => (n === null ? '—' : inr.format(n));
export const formatCount = (n: number) => count.format(n);

const p2 = (n: number) => String(n).padStart(2, '0');

/** One format everywhere: 2025-03-14 09:30 (UTC). Filters use the same UTC days. */
export function formatDate(ms: number | null): string {
  if (ms === null) return '—';
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

export const isoDate = (ms: number | null) => (ms === null ? '' : new Date(ms).toISOString());

export const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');
