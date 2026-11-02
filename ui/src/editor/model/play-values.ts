// Play mode's value state (KF-XV732Q: more play-time adapters;
// docs/26-ui-editor.md §11.4). A value control (a Switch, a Select, a
// Slider) is controlled: the app reads the person's change and renders the
// new value. In play mode the player is that app, and these pure functions
// decide where a change goes:
//
// - a literal prop (or an unset one) changes in the play-time copy;
// - a `$param` prop changes that param, so everything bound to it follows;
// - a node repeated by `$each` changes for its row only, in `RowProps`,
//   keyed by the row's `data-key`, which the play renderer lays over that
//   row's props (`withRowProps`).
//
// Each returns its inputs unchanged when nothing applies.
import type { ViewChild, ViewDocument, ViewValue } from '@kerfjs/ui/view';
import type { SafeHtml } from 'kerfjs';

import { findNode, visitNodes } from './document.js';
import { setProp } from './edits.js';

/** One repeated node's per-row props: under every row, then by row key. */
export interface RowState {
  readonly every: Readonly<Record<string, unknown>>;
  readonly keys: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/** Per-row props of the play copy's repeated nodes, by node id. */
export type RowProps = Readonly<Record<string, RowState>>;

/** `rows` with node `id`'s rows set to `every` and `keys`. */
export function setRowProps(
  rows: RowProps,
  id: string,
  every: Readonly<Record<string, unknown>>,
  keys: RowState['keys'],
): RowProps {
  return { ...rows, [id]: { every, keys } };
}

/** `rows` with node `id`'s row `key` taking `prop` = `value`. */
export function setRowProp(
  rows: RowProps,
  id: string,
  key: string,
  prop: string,
  value: unknown,
): RowProps {
  const current = rows[id] ?? { every: {}, keys: {} };
  return setRowProps(rows, id, current.every, {
    ...current.keys,
    [key]: { ...current.keys[key], [prop]: value },
  });
}

/** The props `rows` lays over node `id`'s row `key`. */
export const rowPropsOf = (
  rows: RowProps,
  id: string,
  key: string,
): Readonly<Record<string, unknown>> => {
  const state = rows[id];
  return state ? { ...state.every, ...state.keys[key] } : {};
};

/**
 * `value` with fresh arrays and plain objects throughout. A repeated row
 * renders once per item object (kerf's `each()` memoizes by identity), so
 * while any row has play-time props, the player renders fresh items for the
 * renderer to lay them over.
 */
export function fresh<Value>(value: Value): Value {
  if (Array.isArray(value)) return value.map(fresh) as Value;
  if (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fresh(item)]),
    ) as Value;
  return value;
}

type ComponentFunction = (props: Record<string, unknown>) => SafeHtml;

/**
 * `components` with each repeated row's play-time props laid over the props
 * the document gives it. A row is known by the node id and row key the
 * renderer marks it with, in `rootAttributes` or directly on the props.
 */
export function withRowProps<
  Components extends Readonly<Record<string, unknown>>,
>(components: Components, rows: RowProps): Components {
  if (Object.keys(rows).length === 0) return components;
  return Object.fromEntries(
    Object.entries(components).map(([type, render]) => [
      type,
      typeof render !== 'function'
        ? render
        : (props: Record<string, unknown>) => {
            const marks = (props.rootAttributes ?? props) as Record<
              string,
              unknown
            >;
            const id = marks['data-kerf-node'];
            const key = marks['data-key'];
            return (render as ComponentFunction)(
              typeof id === 'string' && typeof key === 'string'
                ? { ...props, ...rowPropsOf(rows, id, key) }
                : props,
            );
          },
    ]),
  ) as Components;
}

const isParam = (value: unknown): value is { $param: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { $param?: unknown }).$param === 'string';

const isExpression = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => key.startsWith('$'));

/** Where a recorded value went. */
export interface RecordedValue {
  readonly document: ViewDocument;
  readonly rows: RowProps;
  /** Param values to set, when the prop is a `$param`. */
  readonly params?: Readonly<Record<string, unknown>>;
}

/**
 * The person changed node `id`'s `prop` to `value` (in row `key`, for a
 * repeated node): recorded where the value lives, so the next render shows
 * it. A prop bound any other way (`$bind`, `$css`) outside a row is left to
 * the document.
 */
export function recordValue(
  document: ViewDocument,
  rows: RowProps,
  id: string,
  key: string | undefined,
  prop: string,
  value: unknown,
): RecordedValue {
  const visit = findNode(document, id);
  if (!visit) return { document, rows };
  if (visit.repeated)
    return key === undefined
      ? { document, rows }
      : { document, rows: setRowProp(rows, id, key, prop, value) };
  const current = visit.node.props?.[prop];
  if (isParam(current))
    return { document, rows, params: { [current.$param]: value } };
  if (isExpression(current)) return { document, rows };
  if (JSON.stringify(current) === JSON.stringify(value))
    return { document, rows };
  return {
    document: setProp(document, id, prop, value as ViewValue),
    rows,
  };
}

/** The node whose `type` and `id` prop are given, or undefined. */
export function nodeWithId(
  document: ViewDocument,
  type: string,
  idProp: string,
): string | undefined {
  return visitNodes(document).find(
    ({ node }) => node.type === type && node.props?.id === idProp,
  )?.node.id;
}

/** The `$each` that repeats node `id`, when one does. */
export function eachOf(
  document: ViewDocument,
  id: string,
): Extract<ViewChild, { $each: unknown }> | undefined {
  for (const { node } of visitNodes(document))
    for (const children of Object.values(node.zones ?? {}))
      for (const child of children)
        if ('$each' in child && child.template.id === id) return child;
  return undefined;
}

/**
 * Row `key` of node `id` closes: when its `$each` repeats a `$param`'s
 * items, that param without the item whose key is `key`. Undefined when the
 * rows come from anywhere else.
 */
export function closeRow(
  document: ViewDocument,
  id: string,
  key: string,
  params: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const each = eachOf(document, id);
  if (!each || !isParam(each.$each)) return undefined;
  const items = params[each.$each.$param];
  if (!Array.isArray(items)) return undefined;
  const path = each.key.split('.').slice(1);
  const keyOf = (item: unknown) =>
    String(
      path.reduce<unknown>(
        (value, part) => (value as Record<string, unknown> | null)?.[part],
        item,
      ),
    );
  return {
    [each.$each.$param]: items.filter((item) => keyOf(item) !== key),
  };
}
