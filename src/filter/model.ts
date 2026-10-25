import { FIELD_BY_KEY, type FieldType } from '../data/fields';

export type Op =
  | 'contains' | 'not_contains' | 'equals' // text
  | 'eq' | 'gt' | 'lt' | 'between' //          number (between also used by dates)
  | 'before' | 'after' //                      date
  | 'in'; //                                   enum

/** All values are kept as strings so they round-trip through inputs and the URL unchanged. */
export interface Condition {
  id: string;
  field: string;
  op: Op;
  value: string[];
}

/** Conditions inside a group are OR-ed. */
export interface Group {
  id: string;
  conditions: Condition[];
}

/** Groups are AND-ed. One level only. */
export type FilterState = Group[];

export const OPS_BY_TYPE: Record<FieldType, { op: Op; label: string }[]> = {
  text: [
    { op: 'contains', label: 'contains' },
    { op: 'not_contains', label: 'does not contain' },
    { op: 'equals', label: 'equals' },
  ],
  number: [
    { op: 'eq', label: 'equals' },
    { op: 'gt', label: 'greater than' },
    { op: 'lt', label: 'less than' },
    { op: 'between', label: 'between' },
  ],
  date: [
    { op: 'before', label: 'before' },
    { op: 'after', label: 'after' },
    { op: 'between', label: 'between' },
  ],
  enum: [{ op: 'in', label: 'is one of' }],
};

export function opLabel(type: FieldType, op: Op): string {
  return OPS_BY_TYPE[type].find((o) => o.op === op)?.label ?? op;
}

let counter = 0;
export const uid = (prefix = 'c') => `${prefix}${++counter}`;

export function defaultCondition(field: string): Condition {
  const def = FIELD_BY_KEY[field];
  const op = OPS_BY_TYPE[def.type][0].op;
  return { id: uid('c'), field, op, value: [] };
}

export const newGroup = (field = 'status'): Group => ({ id: uid('g'), conditions: [defaultCondition(field)] });

export const isIsoDate = (s: string | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

const isNum = (s: string | undefined): s is string => s !== undefined && s.trim() !== '' && Number.isFinite(Number(s));

/** A condition with incomplete input is kept in the builder but does not filter. */
export function isActive(c: Condition): boolean {
  const def = FIELD_BY_KEY[c.field];
  if (!def) return false;
  switch (def.type) {
    case 'text':
      return (c.value[0] ?? '').trim() !== '';
    case 'enum':
      return c.value.length > 0;
    case 'number':
      return c.op === 'between' ? isNum(c.value[0]) && isNum(c.value[1]) : isNum(c.value[0]);
    case 'date':
      return c.op === 'between' ? isIsoDate(c.value[0]) && isIsoDate(c.value[1]) : isIsoDate(c.value[0]);
  }
}

export function activeCount(f: FilterState): number {
  return f.reduce((n, g) => n + g.conditions.filter(isActive).length, 0);
}
