import { describe, expect, it } from 'vitest';
import { buildSearch, decodeSelection, encodeSelection, parseUrl } from './urlState';

describe('selection encoding', () => {
  it('round-trips and compresses ranges', () => {
    const ids = ['ORD-0000001', 'ORD-0000002', 'ORD-0000003', 'ORD-0000010', 'WEIRD id'];
    const s = encodeSelection(ids);
    expect(s.length).toBeLessThan(30);
    expect([...decodeSelection(s)].sort()).toEqual([...ids].sort());
  });
});

describe('url state', () => {
  it('round-trips filter, sort, pin and selection', () => {
    const search = buildSearch({
      filter: [{ id: 'g', conditions: [{ id: 'c', field: 'status', op: 'in', value: ['shipped'] }] }],
      sort: { key: 'amount', dir: 'desc' }, pin: 'customer', selected: new Set(['ORD-0000005']),
    });
    const { state, error } = parseUrl(search);
    expect(error).toBeNull();
    expect(state.filter[0].conditions[0]).toMatchObject({ field: 'status', op: 'in', value: ['shipped'] });
    expect(state.sort).toEqual({ key: 'amount', dir: 'desc' });
    expect(state.pin).toBe('customer');
    expect([...state.selected]).toEqual(['ORD-0000005']);
  });
  it.each(['?f=%7Bnot-json', '?f=[[["nope","in",[]]]]', '?sort=-bogus', '?pin=zzz', '?sel=%21%21', '?f=[[["status","gt",["1"]]]]'])('falls back to the default view for %s', (q) => {
    const { state, error } = parseUrl(q);
    expect(error).toMatch(/default view/);
    expect(state.filter).toEqual([]);
    expect(state.selected.size).toBe(0);
  });
});
