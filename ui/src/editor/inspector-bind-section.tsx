// Binding a selected node's prop to a document param or item field.
import type { ViewNode } from '@kerfjs/ui/view';
import type { Signal } from 'kerfjs';

import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { Select } from '../components/forms/select/select.js';
import type { PropsComponent } from './catalog.js';
import type { EditorContext } from './editor-context.js';
import { bindingOptions } from './model/edits.js';
import { propLabel } from './model/fields.js';

export function inspectorBindSection(
  ctx: EditorContext,
  bindProp: Signal<string>,
  node: ViewNode,
  component: PropsComponent,
) {
  const bindable = component.props.filter(
    (prop) => prop.control !== 'hidden' && !prop.zone,
  );
  const prop =
    bindable.find((item) => item.name === bindProp.value) ?? bindable[0];
  if (!prop) return undefined;
  const options = bindingOptions(
    ctx.doc.value,
    ctx.catalog.viewCatalog,
    node.id,
    prop.name,
    [],
    undefined,
    ctx.resolveView,
  );
  const current = node.props?.[prop.name];
  const bound =
    current !== null &&
    typeof current === 'object' &&
    ('$param' in current || '$bind' in current)
      ? JSON.stringify(current)
      : '';
  const choices = [
    { value: '', label: 'Not bound' },
    ...options.map((option) => ({
      value: JSON.stringify(option.value),
      label: option.label,
    })),
  ];
  return (
    <>
      <ListHeader label="Bind a prop" size="xs" />
      <List controlInsets="trbl" gap>
        <Select
          name="bind-prop"
          label="Prop"
          value={prop.name}
          choices={bindable.map((item) => ({
            value: item.name,
            label: propLabel(item.name),
          }))}
          rootAttributes={{ 'data-editor-bind': 'prop' }}
        />
        <Select
          name="bind-source"
          label="Source"
          value={choices.some((choice) => choice.value === bound) ? bound : ''}
          choices={choices}
          hint={
            options.length
              ? undefined
              : 'No param or item field in scope fits this prop.'
          }
          rootAttributes={{
            'data-editor-bind': 'source',
            'data-editor-bind-prop': prop.name,
          }}
        />
      </List>
    </>
  );
}
