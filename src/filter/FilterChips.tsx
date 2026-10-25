import { describeCondition } from './describe';
import { isActive, type FilterState } from './model';

interface Props {
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

/** Active filters as removable chips. (…OR…) groups are boxed, and boxes are joined by AND. */
export function FilterChips({ filter, onChange }: Props) {
  const groups = filter
    .map((g) => ({ id: g.id, active: g.conditions.filter(isActive) }))
    .filter((g) => g.active.length > 0);
  if (groups.length === 0) return null;

  const remove = (condId: string) =>
    onChange(filter.map((g) => ({ ...g, conditions: g.conditions.filter((c) => c.id !== condId) })).filter((g) => g.conditions.length > 0));

  return (
    <div className="chips" aria-label="Active filters">
      {groups.map((g, gi) => (
        <span key={g.id} className="chip-group">
          {gi > 0 ? <span className="join-inline">AND</span> : null}
          <span className="chip-box">
            {g.active.map((c, ci) => (
              <span key={c.id} className="chip-wrap">
                {ci > 0 ? <span className="join-inline">or</span> : null}
                <span className="chip">
                  <span className="chip-text">{describeCondition(c)}</span>
                  <button type="button" aria-label={`Remove filter: ${describeCondition(c)}`} onClick={() => remove(c.id)}>×</button>
                </span>
              </span>
            ))}
          </span>
        </span>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([])}>Clear all</button>
    </div>
  );
}
