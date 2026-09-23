import type { KerfUiContent } from '@kerfjs/ui';
import { List } from '@kerfjs/ui/list';
import { ListInsetControl } from '@kerfjs/ui/list-inset-control';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import type { SafeHtml } from 'kerfjs';
import { signal } from 'kerfjs';

const field = (id: string): SafeHtml => <input id={id} />;
const direct = <ListInsetControl>{field('direct')}</ListInsetControl>;
const includeIntro: boolean = true;
const conditional = includeIntro ? (
  <ListInsetText>Introduction</ListInsetText>
) : null;
const booleanAnd = includeIntro && (
  <ListInsetControl>{field('boolean')}</ListInsetControl>
);
const mutable: SafeHtml[] = [field('mutable-one'), field('mutable-two')];
const readonlyRows = [field('readonly-one'), field('readonly-two')] as const;
const nested: KerfUiContent = [
  direct,
  [conditional, false, [undefined, mutable]],
  readonlyRows,
];

List({ children: direct });
List({ children: conditional });
List({ children: booleanAnd });
List({ children: mutable });
List({ children: readonlyRows });
List({ children: nested });

const spec: {
  intro?: string;
  fields: readonly { id: string }[];
} = {
  intro: 'Account details',
  fields: [{ id: 'name' }, { id: 'email' }],
};

// Exact regression: nullable and mapped siblings compose directly. A Fragment
// is optional grouping syntax, not a workaround for the public List contract.
const unfragmented = (
  <List gap="m">
    {spec.intro !== undefined ? (
      <ListInsetText className="muted small">{spec.intro}</ListInsetText>
    ) : null}
    {spec.fields.map((entry) => (
      <ListInsetControl>{field(entry.id)}</ListInsetControl>
    ))}
  </List>
);
void unfragmented;

// Explicit text positions retain their text exception.
<ListInsetText>Plain explanatory text</ListInsetText>;

// Semantic component zones remain narrower than core JSX children.
// @ts-expect-error KUI-T011 List content rejects arbitrary raw text.
<List>plain text</List>;
// @ts-expect-error KUI-T011 List content rejects arbitrary numbers.
<List>{42}</List>;
// @ts-expect-error KUI-T011 List content rejects signals.
<List>{signal('text')}</List>;
// @ts-expect-error KUI-T011 nested raw strings remain invalid.
List({ children: [[field('valid'), 'invalid']] });
// @ts-expect-error KUI-T011 named semantic zones reject raw strings too.
Toolbar({ leading: 'Title' });
