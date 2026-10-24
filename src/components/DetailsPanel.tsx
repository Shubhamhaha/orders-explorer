import { useEffect, useRef } from 'react';
import { GRID_ID } from '../grid/DataGrid';
import { COLUMNS } from '../grid/columns';
import type { Order } from '../types';

interface Props {
  order: Order;
  onClose: () => void;
}

export function DetailsPanel({ order, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    return () => document.getElementById(GRID_ID)?.focus(); // hand focus back to the grid
  }, []);

  return (
    <aside
      className="details"
      role="dialog"
      aria-label={`Order ${order.id} details`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <h2>{order.id}</h2>
        <button ref={closeRef} type="button" className="icon-btn" aria-label="Close details (Esc)" title="Close (Esc)" onClick={onClose}>×</button>
      </header>
      <dl>
        {COLUMNS.filter((c) => c.key !== 'notes').map((c) => (
          <div key={c.key} className="kv">
            <dt>{c.label}</dt>
            <dd>{c.text(order)}</dd>
          </div>
        ))}
      </dl>
      <h3>Notes</h3>
      {/* Plain text only: React escapes it, and pre-wrap keeps staff line breaks. Never dangerouslySetInnerHTML. */}
      <pre className="notes">{order.notes || '—'}</pre>
    </aside>
  );
}
