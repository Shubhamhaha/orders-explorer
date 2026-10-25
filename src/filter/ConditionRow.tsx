import { FIELDS, FIELD_BY_KEY } from '../data/fields';
import { OPS_BY_TYPE, defaultCondition, type Condition, type Op } from './model';

interface Props {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}

export function ConditionRow({ condition: c, onChange, onRemove }: Props) {
  const def = FIELD_BY_KEY[c.field];
  const set = (value: string[]) => onChange({ ...c, value });

  const changeField = (field: string) => {
    if (field !== c.field) onChange({ ...defaultCondition(field), id: c.id });
  };
  const changeOp = (op: Op) => onChange({ ...c, op, value: op === 'between' ? c.value.slice(0, 2) : c.value.slice(0, 1) });

  const inputs = (() => {
    switch (def.type) {
      case 'text':
        return <input type="text" value={c.value[0] ?? ''} placeholder="Value" aria-label="Value" onChange={(e) => set([e.target.value])} />;
      case 'number':
      case 'date': {
        const type = def.type === 'number' ? 'number' : 'date';
        const two = c.op === 'between';
        return (
          <span className="pair">
            <input type={type} step="any" value={c.value[0] ?? ''} aria-label={two ? 'From' : 'Value'} onChange={(e) => set([e.target.value, c.value[1] ?? ''])} />
            {two ? (
              <>
                <span className="and">and</span>
                <input type={type} step="any" value={c.value[1] ?? ''} aria-label="To" onChange={(e) => set([c.value[0] ?? '', e.target.value])} />
              </>
            ) : null}
          </span>
        );
      }
      case 'enum':
        return (
          <div className="toggles" role="group" aria-label={`${def.label} values`}>
            {def.options!.map((o) => {
              const on = c.value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`toggle${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => set(on ? c.value.filter((v) => v !== o.value) : [...c.value, o.value])}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
    }
  })();

  return (
    <div className="cond">
      <div className="cond-top">
        <select value={c.field} aria-label="Field" onChange={(e) => changeField(e.target.value)}>
          {FIELDS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
        <select value={c.op} aria-label="Operator" disabled={def.type === 'enum'} onChange={(e) => changeOp(e.target.value as Op)}>
          {OPS_BY_TYPE[def.type].map((o) => (
            <option key={o.op} value={o.op}>{o.label}</option>
          ))}
        </select>
        <button type="button" className="icon-btn" aria-label="Remove condition" title="Remove condition" onClick={onRemove}>×</button>
      </div>
      <div className="cond-value">{inputs}</div>
    </div>
  );
}
