import { FIELD_BY_KEY, optionLabel } from '../data/fields';
import { opLabel, type Condition } from './model';

const rupees = new Intl.NumberFormat('en-IN');

/** Short human text for a chip, e.g. "Status is one of Shipped, Delivered". */
export function describeCondition(c: Condition): string {
  const def = FIELD_BY_KEY[c.field];
  const op = opLabel(def.type, c.op);
  const [a, b] = c.value;
  switch (def.type) {
    case 'enum':
      return `${def.label} ${op} ${c.value.map((v) => optionLabel(def, v)).join(', ')}`;
    case 'text':
      return `${def.label} ${op} “${a}”`;
    case 'number': {
      const f = (s: string) => rupees.format(Number(s));
      return c.op === 'between' ? `${def.label} ${op} ${f(a)} and ${f(b)}` : `${def.label} ${op} ${f(a)}`;
    }
    case 'date':
      return c.op === 'between' ? `${def.label} ${op} ${a} and ${b}` : `${def.label} ${op} ${a}`;
  }
}
