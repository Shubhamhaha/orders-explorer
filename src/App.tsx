import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { DetailsPanel } from './components/DetailsPanel';
import { loadOrders } from './data/loadOrders';
import { downloadCsv } from './export/csv';
import { compileFilter } from './filter/compile';
import { FilterBuilder } from './filter/FilterBuilder';
import { FilterChips } from './filter/FilterChips';
import { activeCount, type FilterState } from './filter/model';
import { DataGrid, GRID_ID } from './grid/DataGrid';
import type { ColumnKey } from './grid/columns';
import { sortOrders, type SortState } from './grid/sorting';
import type { LoadStats, Order } from './types';
import { buildSearch, parseUrl } from './url/urlState';
import { formatCount } from './utils/format';

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orders: Order[]; stats: LoadStats };

export default function App() {
  // URL is read once; after that React state is the source of truth and is written back to the URL.
  const [initial] = useState(() => parseUrl(window.location.search));
  const [filter, setFilter] = useState<FilterState>(initial.state.filter);
  const [sort, setSort] = useState<SortState>(initial.state.sort);
  const [pin, setPin] = useState<ColumnKey | null>(initial.state.pin);
  const [selected, setSelected] = useState<Set<string>>(initial.state.selected);
  const [urlError, setUrlError] = useState<string | null>(initial.error);
  const [showFilters, setShowFilters] = useState(true);
  const [detail, setDetail] = useState<Order | null>(null);
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // ---- data ----
  useEffect(() => {
    const ctrl = new AbortController();
    setLoad({ status: 'loading' });
    loadOrders(ctrl.signal)
      .then(({ orders, stats }) => {
        setLoad({ status: 'ready', orders, stats });
        // Drop selected IDs that do not exist in the data so the count always matches the export.
        const known = new Set(orders.map((o) => o.id));
        setSelected((prev) => {
          let changed = false;
          const next = new Set<string>();
          for (const id of prev) known.has(id) ? next.add(id) : (changed = true);
          return changed ? next : prev;
        });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setLoad({ status: 'error', message: e instanceof Error ? e.message : 'Unknown error while loading orders.' });
      });
    return () => ctrl.abort();
  }, [attempt]);

  const orders = load.status === 'ready' ? load.orders : null;

  // ---- URL sync (debounced; replaceState so Back is not flooded) ----
  useEffect(() => {
    const t = setTimeout(() => {
      const search = buildSearch({ filter, sort, pin, selected });
      if (search !== window.location.search) {
        window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [filter, sort, pin, selected]);

  // ---- derived rows: sort the whole set once per sort change, then filtering keeps that order ----
  const sortedAll = useMemo(() => (orders ? sortOrders(orders, sort) : []), [orders, sort]);
  const deferredFilter = useDeferredValue(filter); // typing stays responsive; the grid catches up
  const rows = useMemo(() => {
    const pred = compileFilter(deferredFilter);
    return pred ? sortedAll.filter(pred) : sortedAll;
  }, [sortedAll, deferredFilter]);
  const stale = deferredFilter !== filter;

  const visibleSelected = useMemo(() => {
    let n = 0;
    for (const r of rows) if (selected.has(r.id)) n++;
    return n;
  }, [rows, selected]);

  const active = activeCount(filter);

  const onSort = useCallback((key: ColumnKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  // Export decision (see README): ALL selected rows are exported, including ones a filter currently hides.
  const exportSelected = () => {
    const picked = sortedAll.filter((o) => selected.has(o.id));
    downloadCsv(picked, `orders-selected-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const resetAll = () => {
    setFilter([]);
  };

  if (load.status === 'loading') {
    return <div className="center-screen" role="status">Loading orders…</div>;
  }
  if (load.status === 'error') {
    return (
      <div className="center-screen" role="alert">
        <p>{load.message}</p>
        <button className="btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
      </div>
    );
  }

  const total = load.orders.length;
  const hiddenSelected = selected.size - visibleSelected;

  return (
    <div className="app">
      <header className="topbar">
        <h1>Orders Explorer</h1>
        <span className="count" aria-live="polite">
          <strong>{formatCount(rows.length)}</strong> of {formatCount(total)} orders
        </span>
        <button
          type="button"
          className={`btn${showFilters ? ' on' : ''}`}
          aria-expanded={showFilters}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters{active ? ` (${active})` : ''}
        </button>
        <span className="spacer" />
        <span className="selcount" aria-live="polite">
          {selected.size > 0 ? (
            <>
              <strong>{formatCount(selected.size)}</strong> selected
              {hiddenSelected > 0 ? <span className="muted"> · {formatCount(hiddenSelected)} hidden by filter</span> : null}
            </>
          ) : (
            <span className="muted">0 selected</span>
          )}
        </span>
        {selected.size > 0 ? (
          <button type="button" className="link-btn" onClick={() => setSelected(new Set())}>Clear selection</button>
        ) : null}
        <button type="button" className="btn primary" disabled={selected.size === 0} onClick={exportSelected} title="Exports every selected row, including ones hidden by the current filter">
          Export CSV{selected.size ? ` (${formatCount(selected.size)})` : ''}
        </button>
      </header>

      {urlError ? (
        <div className="banner" role="alert">
          <span>{urlError}</span>
          <button type="button" className="link-btn" onClick={() => setUrlError(null)}>Dismiss</button>
        </div>
      ) : null}

      <div className="body">
        {showFilters ? (
          <aside className="sidebar" aria-label="Filter builder">
            <h2>Filters</h2>
            <FilterBuilder filter={filter} onChange={setFilter} />
          </aside>
        ) : null}
        <main className="main">
          <FilterChips filter={filter} onChange={setFilter} />
          <DataGrid
            rows={rows}
            sort={sort}
            onSort={onSort}
            pin={pin}
            onPin={setPin}
            selected={selected}
            onSelectionChange={setSelected}
            visibleSelected={visibleSelected}
            onOpen={setDetail}
            stale={stale}
            empty={
              <div className="empty">
                <strong>{active ? 'No orders match these filters' : 'No orders to show'}</strong>
                {active ? (
                  <>
                    <p>Try removing a condition, or start again.</p>
                    <button type="button" className="btn primary" onClick={resetAll}>Clear all filters</button>
                  </>
                ) : null}
              </div>
            }
          />
        </main>
        {detail ? (
          <DetailsPanel
            order={detail}
            onClose={() => {
              setDetail(null);
              document.getElementById(GRID_ID)?.focus();
            }}
          />
        ) : null}
      </div>

      <footer className="statusbar">
        <span><kbd>↑↓←→</kbd> move</span>
        <span><kbd>Space</kbd> select</span>
        <span><kbd>Shift</kbd>+click / arrows range</span>
        <span><kbd>Ctrl</kbd>+<kbd>A</kbd> all visible</span>
        <span><kbd>Enter</kbd> details</span>
        <span><kbd>S</kbd> sort</span>
        <span><kbd>P</kbd> pin</span>
        <span className="spacer" />
        {load.stats.duplicatesRemoved > 0 ? <span className="muted">{load.stats.duplicatesRemoved} duplicate order IDs merged</span> : null}
      </footer>
    </div>
  );
}
