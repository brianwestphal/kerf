// Binding a selected node's prop to a document param or item field.
import type { ViewNode } from '@kerfjs/ui/view';
import type { Signal } from 'kerfjs';

import { Button } from '../components/actions/button/button.js';
import { List } from '../components/collections/list/list.js';
import { ListHeader } from '../components/collections/list-header/list-header.js';
import { ListInsetText } from '../components/collections/list-inset-text/list-inset-text.js';
import { Select } from '../components/forms/select/select.js';
import { Row } from '../components/layout/row/row.js';
import { Text } from '../components/typography/text/text.js';
import type { PropsComponent } from './catalog.js';
import { HOOK } from './dom-hooks.js';
import type { EditorContext } from './editor-context.js';
import { bindingOptions } from './model/edits.js';
import { fieldLabel, propLabel } from './model/fields.js';
import type { InspectorProp } from './model/inspector.js';
import { PROMOTE_PROP_ACTION } from './shell-names.js';

/** How a prop's value reads: its param, its item field, or "Not bound". */
export function bindingSummary(value: unknown): string {
  if (value === null || typeof value !== 'object') return 'Not bound';
  const { $param, $bind } = value as { $param?: unknown; $bind?: unknown };
  if (typeof $param === 'string') return `Param ${$param}`;
  return typeof $bind === 'string' ? `Item field ${$bind}` : 'Not bound';
}

/**
 * A field's Bind page (KF-FN28S3): the sources in scope that fit it, and
 * Promote while it holds a literal (its param's name stays on the field). With
 * no source in scope, the page says so where the action was asked for.
 */
export function bindPropPage(
  ctx: EditorContext,
  node: ViewNode,
  prop: InspectorProp,
  promotable: boolean,
) {
  const { name } = prop;
  const label = fieldLabel(prop);
  const options = bindingOptions(
    ctx.doc.value,
    ctx.catalog.viewCatalog,
    node.id,
    name,
    [],
    undefined,
    ctx.resolveView,
  );
  const current = node.props?.[name] as
    { $param?: unknown; $bind?: unknown } | undefined;
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
    <List rootAttributes={{ 'data-editor-bind-page': name }}>
      {options.length || bound ? (
        <List controlInsets="trbl" gap>
          <Select
            name="bind-source"
            label="Source"
            value={
              choices.some((choice) => choice.value === bound) ? bound : ''
            }
            choices={choices}
            rootAttributes={{
              [HOOK.bind]: 'source',
              'data-editor-bind-prop': name,
            }}
          />
        </List>
      ) : (
        <ListInsetText>
          <Text tone="quiet">
            No param or item field in scope fits {label.toLowerCase()}.
          </Text>
        </ListInsetText>
      )}
      {promotable ? (
        <List controlInsets="trbl">
          <Row>
            <Button
              emphasis="secondary"
              size="compact"
              action={PROMOTE_PROP_ACTION}
              rootAttributes={{ 'data-editor-promote-prop': name }}
            >
              Promote to a param
            </Button>
          </Row>
        </List>
      ) : undefined}
    </List>
  );
}

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
          rootAttributes={{ [HOOK.bind]: 'prop' }}
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
            [HOOK.bind]: 'source',
            'data-editor-bind-prop': prop.name,
          }}
        />
      </List>
    </>
  );
}
