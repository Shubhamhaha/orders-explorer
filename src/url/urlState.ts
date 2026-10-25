import { FIELD_BY_KEY } from '../data/fields';
import { isColumnKey, type ColumnKey } from '../grid/columns';
import { DEFAULT_SORT, type SortState } from '../grid/sorting';
import { OPS_BY_TYPE, uid, type FilterState, type Op } from '../filter/model';

/** Everything that must survive a refresh / copy-paste of the URL. */
export interface UrlState {
  filter: FilterState;
  sort: SortState;
  pin: ColumnKey | null;
  selected: Set<string>;
}

export const defaultState = (): UrlState => ({ filter: [], sort: { ...DEFAULT_SORT }, pin: null, selected: new Set() });

// ---------- selection <-> compact string ----------
// ORD-0001234 -> base36 number; consecutive numbers collapse to ranges "a-b".
// Selecting all 50,000 rows therefore costs a few hundred characters, not 600 KB.
const ID_RE = /^ORD-(\d{7})$/;
const MAX_SELECTION = 200_000;

export function encodeSelection(ids: Iterable<string>): string {
  const nums: number[] = [];
  const raw: string[] = [];
  for (const id of ids) {
    const m = ID_RE.exec(id);
    if (m) nums.push(Number(m[1]));
    else raw.push(`~${encodeURIComponent(id)}`);
  }
  nums.sort((a, b) => a - b);
  const tokens: string[] = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    tokens.push(j > i ? `${nums[i].toString(36)}-${nums[j].toString(36)}` : nums[i].toString(36));
    i = j + 1;
  }
  return [...tokens, ...raw].join(',');
}

export function decodeSelection(s: string): Set<string> {
  const out = new Set<string>();
  for (const tok of s.split(',')) {
    if (!tok) continue;
    if (tok.startsWith('~')) {
      out.add(decodeURIComponent(tok.slice(1)));
      continue;
    }
    const m = /^([0-9a-z]+)(?:-([0-9a-z]+))?$/.exec(tok);
    if (!m) throw new Error(`bad selection token "${tok.slice(0, 20)}"`);
    const lo = parseInt(m[1], 36);
    const hi = m[2] ? parseInt(m[2], 36) : lo;
    if (!(hi >= lo) || out.size + (hi - lo + 1) > MAX_SELECTION) throw new Error('selection range out of bounds');
    for (let n = lo; n <= hi; n++) out.add(`ORD-${String(n).padStart(7, '0')}`);
  }
  return out;
}

// ---------- filter <-> JSON ----------
// [[ [field, op, [values...]], ... ], ...]  (outer = AND-ed groups, inner = OR-ed conditions)
function encodeFilter(f: FilterState): string {
  return JSON.stringify(f.filter((g) => g.conditions.length).map((g) => g.conditions.map((c) => [c.field, c.op, c.value])));
}

function decodeFilter(s: string): FilterState {
  const data: unknown = JSON.parse(s);
  if (!Array.isArray(data) || data.length > 20) throw new Error('filter must be a list of groups');
  return data.map((g) => {
    if (!Array.isArray(g) || g.length === 0 || g.length > 50) throw new Error('bad filter group');
    return {
      id: uid('g'),
      conditions: g.map((c) => {
        if (!Array.isArray(c) || c.length !== 3) throw new Error('bad condition');
        const [field, op, value] = c as [unknown, unknown, unknown];
        const def = typeof field === 'string' ? FIELD_BY_KEY[field] : undefined;
        if (!def) throw new Error(`unknown field "${String(field)}"`);
        if (!OPS_BY_TYPE[def.type].some((o) => o.op === op)) throw new Error(`operator "${String(op)}" is not valid for ${def.label}`);
        if (!Array.isArray(value) || value.length > 20 || value.some((v) => typeof v !== 'string' || v.length > 200)) {
          throw new Error(`bad value for ${def.label}`);
        }
        if (def.type === 'enum' && value.some((v) => !def.options!.some((o) => o.value === v))) {
          throw new Error(`unknown option for ${def.label}`);
        }
        return { id: uid('c'), field: def.key, op: op as Op, value: value as string[] };
      }),
    };
  });
}

// ---------- whole state ----------
export function parseUrl(search: string): { state: UrlState; error: string | null } {
  const p = new URLSearchParams(search);
  const state = defaultState();
  try {
    const f = p.get('f');
    if (f) state.filter = decodeFilter(f);

    const sort = p.get('sort');
    if (sort) {
      const desc = sort.startsWith('-');
      const key = desc ? sort.slice(1) : sort;
      if (!isColumnKey(key)) throw new Error(`cannot sort by "${key.slice(0, 30)}"`);
      state.sort = { key, dir: desc ? 'desc' : 'asc' };
    }

    const pin = p.get('pin');
    if (pin) {
      if (!isColumnKey(pin)) throw new Error(`cannot pin "${pin.slice(0, 30)}"`);
      state.pin = pin;
    }

    const sel = p.get('sel');
    if (sel) state.selected = decodeSelection(sel);
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown problem';
    return { state: defaultState(), error: `This link has values the app could not read (${reason}). Showing the default view instead.` };
  }
  return { state, error: null };
}

export function buildSearch(s: UrlState): string {
  const p = new URLSearchParams();
  const f = encodeFilter(s.filter);
  if (f !== '[]') p.set('f', f);
  if (s.sort.key !== DEFAULT_SORT.key || s.sort.dir !== DEFAULT_SORT.dir) p.set('sort', (s.sort.dir === 'desc' ? '-' : '') + s.sort.key);
  if (s.pin) p.set('pin', s.pin);
  if (s.selected.size) p.set('sel', encodeSelection(s.selected));
  const q = p.toString();
  return q ? `?${q}` : '';
}
