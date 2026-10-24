import { memo } from 'react';
import type { Order } from '../types';
import { CHECK_W, HEADER_H, ROW_H } from './layout';
import type { Column, ColumnKey } from './columns';

interface Props {
  order: Order;
  index: number;
  selected: boolean;
  /** Key of the focused column when this row holds the focused cell, else null. */
  focusKey: ColumnKey | null;
  cols: Column[];
  hasPin: boolean;
  width: number;
}

/** One visible row. Memoised: scrolling only mounts/unmounts rows, it never re-renders the others. */
export const GridRow = memo(function GridRow({ order, index, selected, focusKey, cols, hasPin, width }: Props) {
  return (
    <div
      className={`grid-row${selected ? ' selected' : ''}${index % 2 ? ' odd' : ''}`}
      role="row"
      aria-rowindex={index + 2}
      aria-selected={selected}
      data-row={index}
      style={{ top: HEADER_H + index * ROW_H, height: ROW_H, width }}
    >
      <div className="cell check sticky" style={{ width: CHECK_W, left: 0 }} data-check>
        <span className={`checkbox${selected ? ' on' : ''}`} aria-hidden="true" />
      </div>
      {cols.map((c, ci) => {
        const text = c.text(order);
        const pinned = hasPin && ci === 0;
        const title = c.key === 'notes' ? order.notes.slice(0, 600) : text;
        return (
          <div
            key={c.key}
            id={`cell-${index}-${c.key}`}
            role="gridcell"
            data-col={ci}
            className={`cell${c.align === 'right' ? ' right' : ''}${pinned ? ' sticky pinned' : ''}${focusKey === c.key ? ' focused' : ''}`}
            style={{ width: c.width, left: pinned ? CHECK_W : undefined }}
            title={title && title !== '—' ? title : undefined}
          >
            {c.key === 'status' ? <span className={`dot st-${order.status}`} aria-hidden="true" /> : null}
            <span className="cell-text">{text}</span>
          </div>
        );
      })}
    </div>
  );
});
