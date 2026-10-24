import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { Order } from '../types';
import { COLUMNS, MIN_COL_WIDTH, type Column, type ColumnKey } from './columns';
import { GridRow } from './GridRow';
import { CHECK_W, HEADER_H, OVERSCAN, ROW_H } from './layout';
import type { SortState } from './sorting';

interface Props {
  /** Already filtered and sorted. */
  rows: Order[];
  sort: SortState;
  onSort: (key: ColumnKey) => void;
  pin: ColumnKey | null;
  onPin: (key: ColumnKey | null) => void;
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  /** How many of the currently visible rows are selected. */
  visibleSelected: number;
  onOpen: (order: Order) => void;
  empty: ReactNode;
  stale?: boolean;
}

interface Focus {
  row: number;
  col: ColumnKey;
}

export const GRID_ID = 'orders-grid';

/**
 * Hand-written virtualised grid: one scroll container, absolutely positioned rows,
 * and only the rows inside the viewport (+ a small overscan) exist in the DOM.
 */
export function DataGrid({ rows, sort, onSort, pin, onPin, selected, onSelectionChange, visibleSelected, onOpen, empty, stale }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<string | null>(null);
  const [view, setView] = useState({ top: 0, h: 600, w: 1000 });
  const [widths, setWidths] = useState<Partial<Record<ColumnKey, number>>>({});
  const [focus, setFocus] = useState<Focus | null>(null);

  const n = rows.length;

  // ---- columns: pinned column is moved to the front and made sticky ----
  const cols: Column[] = useMemo(() => {
    const base = COLUMNS.map((c) => ({ ...c, width: widths[c.key] ?? c.width }));
    const p = pin ? base.find((c) => c.key === pin) : undefined;
    return p ? [p, ...base.filter((c) => c !== p)] : base;
  }, [widths, pin]);
  const lefts = useMemo(() => {
    let x = CHECK_W;
    return cols.map((c) => {
      const l = x;
      x += c.width;
      return l;
    });
  }, [cols]);
  const totalW = lefts[cols.length - 1] + cols[cols.length - 1].width;
  const hasPin = pin !== null;

  // ---- viewport tracking ----
  useLayoutEffect(() => {
    const el = scroller.current!;
    const measure = () =>
      setView((v) => (v.h === el.clientHeight && v.w === el.clientWidth ? v : { ...v, h: el.clientHeight, w: el.clientWidth }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const top = scroller.current!.scrollTop;
    setView((v) => (v.top === top ? v : { ...v, top }));
  }, []);

  // New result set (filter or sort changed): go back to the top and keep focus in range.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (scroller.current) scroller.current.scrollTop = 0;
    setFocus((f) => (f && n > 0 ? { ...f, row: Math.min(f.row, n - 1) } : null));
  }, [rows, n]);

  const first = Math.max(0, Math.floor((view.top - HEADER_H) / ROW_H) - OVERSCAN);
  const last = Math.min(n - 1, Math.ceil((view.top + view.h) / ROW_H) + OVERSCAN);

  // ---- keep the focused cell inside the viewport ----
  const reveal = useCallback(
    (row: number, key: ColumnKey) => {
      const el = scroller.current;
      if (!el) return;
      const rowTop = HEADER_H + row * ROW_H;
      if (rowTop < el.scrollTop + HEADER_H) el.scrollTop = rowTop - HEADER_H;
      else if (rowTop + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = rowTop + ROW_H - el.clientHeight;
      const ci = cols.findIndex((c) => c.key === key);
      if (ci <= 0 && hasPin) return; // pinned column is always visible
      const stickyW = CHECK_W + (hasPin ? cols[0].width : 0);
      const left = lefts[ci];
      const right = left + cols[ci].width;
      if (left < el.scrollLeft + stickyW) el.scrollLeft = left - stickyW;
      else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth;
    },
    [cols, lefts, hasPin],
  );

  const moveFocus = (row: number, key: ColumnKey) => {
    setFocus({ row, col: key });
    reveal(row, key);
  };

  // ---- selection ----
  const selectOnly = (i: number) => {
    anchor.current = rows[i].id;
    onSelectionChange(new Set([rows[i].id]));
  };
  const toggleAt = (i: number) => {
    const id = rows[i].id;
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    anchor.current = id;
    onSelectionChange(next);
  };
  const rangeTo = (i: number, additive: boolean) => {
    const ai = anchor.current ? rows.findIndex((r) => r.id === anchor.current) : -1;
    if (ai < 0) return selectOnly(i);
    const next = additive ? new Set(selected) : new Set<string>();
    for (let k = Math.min(ai, i); k <= Math.max(ai, i); k++) next.add(rows[k].id);
    onSelectionChange(next);
  };
  const selectAllVisible = () => {
    const next = new Set(selected);
    for (const r of rows) next.add(r.id);
    onSelectionChange(next);
  };
  const deselectVisible = () => {
    const next = new Set(selected);
    for (const r of rows) next.delete(r.id);
    onSelectionChange(next);
  };

  // ---- mouse (delegated: one handler for all rows) ----
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>('.grid-row');
    if (!rowEl) return;
    const i = Number(rowEl.dataset.row);
    const cellEl = (e.target as HTMLElement).closest<HTMLElement>('[data-col]');
    const key = cellEl ? cols[Number(cellEl.dataset.col)].key : focus?.col ?? cols[0].key;
    setFocus({ row: i, col: key });
    if ((e.target as HTMLElement).closest('[data-check]') || e.ctrlKey || e.metaKey) {
      if (e.shiftKey) rangeTo(i, true);
      else toggleAt(i);
    } else if (e.shiftKey) rangeTo(i, false);
    else selectOnly(i);
  };
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rowEl = (e.target as HTMLElement).closest<HTMLElement>('.grid-row');
    if (rowEl) onOpen(rows[Number(rowEl.dataset.row)]);
  };

  // ---- keyboard ----
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || n === 0) return;
    const cur: Focus = focus ?? { row: 0, col: cols[0].key };
    const ci = Math.max(0, cols.findIndex((c) => c.key === cur.col));
    const page = Math.max(1, Math.floor((view.h - HEADER_H) / ROW_H) - 1);
    let row = cur.row;
    let col = ci;
    let handled = true;
    const mod = e.ctrlKey || e.metaKey;

    switch (e.key) {
      case 'ArrowDown': row = Math.min(n - 1, row + 1); break;
      case 'ArrowUp': row = Math.max(0, row - 1); break;
      case 'ArrowRight': col = Math.min(cols.length - 1, col + 1); break;
      case 'ArrowLeft': col = Math.max(0, col - 1); break;
      case 'PageDown': row = Math.min(n - 1, row + page); break;
      case 'PageUp': row = Math.max(0, row - page); break;
      case 'Home': col = 0; if (mod) row = 0; break;
      case 'End': col = cols.length - 1; if (mod) row = n - 1; break;
      case 'Enter': onOpen(rows[row]); break;
      case ' ': toggleAt(row); break;
      case 'a': case 'A':
        if (mod) selectAllVisible(); else handled = false;
        break;
      case 's': case 'S':
        if (!mod) onSort(cols[col].key); else handled = false;
        break;
      case 'p': case 'P':
        if (!mod) onPin(pin === cols[col].key ? null : cols[col].key); else handled = false;
        break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    if (e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') {
      if (e.shiftKey && row !== cur.row) {
        if (!anchor.current) anchor.current = rows[cur.row].id;
        rangeTo(row, false);
      }
      moveFocus(row, cols[col].key);
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !focus && n > 0) setFocus({ row: 0, col: cols[0].key });
  };

  // ---- column resize (pointer capture on the handle) ----
  const resize = useRef<{ key: ColumnKey; x: number; w: number } | null>(null);
  const onResizeDown = (e: PointerEvent<HTMLDivElement>, c: Column) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resize.current = { key: c.key, x: e.clientX, w: c.width };
  };
  const onResizeMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = resize.current;
    if (!r) return;
    const w = Math.max(MIN_COL_WIDTH, Math.round(r.w + e.clientX - r.x));
    setWidths((prev) => (prev[r.key] === w ? prev : { ...prev, [r.key]: w }));
  };
  const onResizeUp = () => {
    resize.current = null;
  };

  const allSelected = n > 0 && visibleSelected === n;
  const checkRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkRef.current) checkRef.current.indeterminate = visibleSelected > 0 && !allSelected;
  }, [visibleSelected, allSelected]);

  const focusedKey = focus ? focus.col : null;

  return (
    <div
      id={GRID_ID}
      ref={scroller}
      className={`grid${stale ? ' stale' : ''}`}
      role="grid"
      aria-label="Orders"
      aria-rowcount={n + 1}
      aria-colcount={cols.length}
      aria-multiselectable="true"
      aria-activedescendant={focus && n > 0 ? `cell-${focus.row}-${focus.col}` : undefined}
      tabIndex={0}
      onScroll={onScroll}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
    >
      <div className="grid-inner" style={{ width: totalW, height: HEADER_H + n * ROW_H }}>
        <div className="grid-header" role="row" aria-rowindex={1} style={{ width: totalW, height: HEADER_H }}>
          <div className="hcell check sticky" style={{ width: CHECK_W, left: 0 }}>
            <input
              ref={checkRef}
              type="checkbox"
              tabIndex={-1}
              aria-label="Select all visible rows"
              checked={allSelected}
              disabled={n === 0}
              onChange={() => (allSelected ? deselectVisible() : selectAllVisible())}
            />
          </div>
          {cols.map((c, ci) => {
            const pinned = hasPin && ci === 0;
            const sorted = sort.key === c.key;
            return (
              <div
                key={c.key}
                role="columnheader"
                aria-sort={sorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={`hcell${c.align === 'right' ? ' right' : ''}${pinned ? ' sticky pinned' : ''}${sorted ? ' sorted' : ''}`}
                style={{ width: c.width, left: pinned ? CHECK_W : undefined }}
              >
                <button type="button" className="hlabel" tabIndex={-1} onClick={() => onSort(c.key)} title={`Sort by ${c.label} (focus a cell and press S)`}>
                  <span className="hlabel-text">{c.label}</span>
                  {sorted ? <span className="arrow" aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span> : null}
                </button>
                <button
                  type="button"
                  className={`pinbtn${pinned ? ' on' : ''}`}
                  tabIndex={-1}
                  aria-pressed={pinned}
                  title={pinned ? 'Unpin column (P)' : 'Pin column (focus a cell and press P)'}
                  onClick={() => onPin(pinned ? null : c.key)}
                >
                  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M9.5 1.5l5 5-1.6.6-2.6 2.6.3 3.3-1 1-3-3-4.2 4.2-.7-.7 4.2-4.2-3-3 1-1 3.3.3 2.6-2.6z" fill="currentColor" /></svg>
                </button>
                <div
                  className="resizer"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${c.label}`}
                  onPointerDown={(e) => onResizeDown(e, c)}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeUp}
                  onPointerCancel={onResizeUp}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setWidths((p) => ({ ...p, [c.key]: undefined }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>

        {n === 0 ? (
          <div className="grid-empty" style={{ width: view.w }}>{empty}</div>
        ) : (
          rows.slice(first, last + 1).map((o, k) => {
            const i = first + k;
            return (
              <GridRow
                key={o.id}
                order={o}
                index={i}
                selected={selected.has(o.id)}
                focusKey={focus && focus.row === i ? focusedKey : null}
                cols={cols}
                hasPin={hasPin}
                width={totalW}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
