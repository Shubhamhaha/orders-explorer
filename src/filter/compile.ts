import { FIELD_BY_KEY, enumValue } from '../data/fields';
import type { Order } from '../types';
import { isActive, type Condition, type FilterState } from './model';

type Pred = (o: Order) => boolean;

const DAY = 86_400_000;
const dayStart = (s: string) => Date.parse(`${s}T00:00:00Z`);

const TEXT_KEYS: Record<string, 'idKey' | 'customerKey' | 'emailKey' | 'notesKey'> = {
  id: 'idKey',
  customer: 'customerKey',
  email: 'emailKey',
  notes: 'notesKey',
};

function compileCondition(c: Condition): Pred {
  const def = FIELD_BY_KEY[c.field];
  const [a, b] = c.value;
  switch (def.type) {
    case 'text': {
      const key = TEXT_KEYS[c.field];
      const needle = a.trim().toLowerCase();
      if (c.op === 'equals') return (o) => o[key] === needle;
      if (c.op === 'not_contains') return (o) => !o[key].includes(needle);
      return (o) => o[key].includes(needle);
    }
    case 'number': {
      const key = c.field as 'amount' | 'itemCount';
      const x = Number(a);
      if (c.op === 'between') {
        const y = Number(b);
        const lo = Math.min(x, y);
        const hi = Math.max(x, y);
        return (o) => o[key] !== null && o[key] >= lo && o[key] <= hi;
      }
      if (c.op === 'gt') return (o) => o[key] !== null && o[key] > x;
      if (c.op === 'lt') return (o) => o[key] !== null && o[key] < x;
      return (o) => o[key] !== null && Math.abs(o[key] - x) < 0.005; // equals, to the paisa
    }
    case 'date': {
      const key = c.field as 'createdAt' | 'updatedAt';
      // Dates are whole UTC days, matching how the grid displays them.
      if (c.op === 'between') {
        const lo = Math.min(dayStart(a), dayStart(b));
        const hi = Math.max(dayStart(a), dayStart(b)) + DAY;
        return (o) => o[key] !== null && o[key] >= lo && o[key] < hi;
      }
      if (c.op === 'before') {
        const t = dayStart(a);
        return (o) => o[key] !== null && o[key] < t;
      }
      const t = dayStart(a) + DAY;
      return (o) => o[key] !== null && o[key] >= t;
    }
    case 'enum': {
      const set = new Set(c.value);
      return (o) => set.has(enumValue(o, c.field));
    }
  }
}

/** (g1.c1 OR g1.c2) AND (g2.c1 ...). Returns null when nothing is active (= show everything). */
export function compileFilter(filter: FilterState): Pred | null {
  const groups = filter
    .map((g) => g.conditions.filter(isActive).map(compileCondition))
    .filter((preds) => preds.length > 0);
  if (groups.length === 0) return null;
  const groupPreds: Pred[] = groups.map((preds) =>
    preds.length === 1 ? preds[0] : (o) => preds.some((p) => p(o)),
  );
  if (groupPreds.length === 1) return groupPreds[0];
  return (o) => {
    for (let i = 0; i < groupPreds.length; i++) if (!groupPreds[i](o)) return false;
    return true;
  };
}
