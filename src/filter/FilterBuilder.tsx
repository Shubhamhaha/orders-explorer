import { ConditionRow } from './ConditionRow';
import { defaultCondition, newGroup, uid, type FilterState } from './model';

interface Props {
  filter: FilterState;
  onChange: (f: FilterState) => void;
}

/** Groups are AND-ed together; conditions inside a group are OR-ed. */
export function FilterBuilder({ filter, onChange }: Props) {
  const patchGroup = (gi: number, fn: (conds: FilterState[number]['conditions']) => FilterState[number]['conditions']) =>
    onChange(filter.map((g, i) => (i === gi ? { ...g, conditions: fn(g.conditions) } : g)).filter((g) => g.conditions.length > 0));

  return (
    <div className="builder">
      {filter.length === 0 ? <p className="hint">No filters. Add a condition to narrow the {`orders`}.</p> : null}
      {filter.map((g, gi) => (
        <div key={g.id}>
          {gi > 0 ? <div className="join">AND</div> : null}
          <section className="group" aria-label={`Group ${gi + 1}`}>
            <header className="group-head">
              <span>Group {gi + 1}</span>
              <span className="muted">match any</span>
            </header>
            {g.conditions.map((c, ci) => (
              <div key={c.id}>
                {ci > 0 ? <div className="join or">OR</div> : null}
                <ConditionRow
                  condition={c}
                  onChange={(next) => patchGroup(gi, (cs) => cs.map((x) => (x.id === c.id ? next : x)))}
                  onRemove={() => patchGroup(gi, (cs) => cs.filter((x) => x.id !== c.id))}
                />
              </div>
            ))}
            <button type="button" className="link-btn" onClick={() => patchGroup(gi, (cs) => [...cs, { ...defaultCondition('status'), id: uid('c') }])}>
              + Add condition (OR)
            </button>
          </section>
        </div>
      ))}
      <button type="button" className="btn add-group" onClick={() => onChange([...filter, newGroup()])}>
        + Add {filter.length ? 'group (AND)' : 'condition'}
      </button>
    </div>
  );
}
