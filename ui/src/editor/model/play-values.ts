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
//   row's props (`withRowProps`). KF-7XQAFR: a node nested inside a row
//   (not the template's root) carries its row's key as `data-kerf-row`
//   (`markRows`), so it changes for its row too.
//
// Each returns its inputs unchanged when nothing applies.
import {
  channelOf,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewValue,
} from '@kerfjs/ui/view';
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

/**
 * KF-7XQAFR: the mark naming the row a node nested inside an `$each` row
 * belongs to. The interpreter gives only the template's root a `data-key`.
 */
export const ROW_MARK = 'data-kerf-row';

type Each = Extract<ViewChild, { $each: unknown }>;

/**
 * `document` with every node nested inside an `$each` row (not the
 * template's root, which has its `data-key`) marked with its row's key: a
 * `$bind` to the innermost `$each`'s key, through the node's data channel.
 * Play mode only, after validation, which reserves `data-kerf-*` for the
 * renderer. A node with no data channel, or whose `rootAttributes` is an
 * expression, stays unmarked.
 */
export function markRows(
  document: ViewDocument,
  catalog: ViewCatalog,
): ViewDocument {
  const mark = (node: ViewNode, key: string): ViewNode => {
    const component = catalog.components.get(node.type)?.component;
    if (!component) return node;
    const bind = { $bind: key };
    switch (channelOf(component as Parameters<typeof channelOf>[0])) {
      case 'rootAttributes': {
        const base = node.props?.rootAttributes ?? {};
        if (isExpression(base) || typeof base !== 'object' || base === null)
          return node;
        return {
          ...node,
          props: {
            ...node.props,
            rootAttributes: { ...(base as object), [ROW_MARK]: bind },
          },
        };
      }
      case 'native':
      case 'attributes':
        return { ...node, props: { ...node.props, [ROW_MARK]: bind } };
      default:
        return node;
    }
  };
  const child = (item: ViewChild, key: string | undefined): ViewChild => {
    if ('$each' in item)
      return { ...item, template: node(item.template, item.key, false) };
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then, key),
        ...(item.else ? { else: child(item.else, key) } : {}),
      };
    if ('$slot' in item) return item;
    return node(item, key, true);
  };
  const node = (
    item: ViewNode,
    key: string | undefined,
    nested: boolean,
  ): ViewNode => {
    const marked = key !== undefined && nested ? mark(item, key) : item;
    if (!item.zones) return marked;
    return {
      ...marked,
      zones: Object.fromEntries(
        Object.entries(item.zones).map(([zone, children]) => [
          zone,
          children.map((entry) => child(entry, key)),
        ]),
      ),
    };
  };
  return { ...document, root: node(document.root, undefined, false) };
}

type ComponentFunction = (props: Record<string, unknown>) => SafeHtml;

/** A row mark's value as the DOM spells it, or undefined. */
const rowKeyOf = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;

/**
 * `components` with each repeated row's play-time props laid over the props
 * the document gives it. A row is known by the node id and row key the
 * renderer marks it with, in `rootAttributes` or directly on the props: a
 * template's root by its `data-key`, a node nested in the row by its
 * `data-kerf-row` (KF-7XQAFR).
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
            const key = rowKeyOf(marks[ROW_MARK] ?? marks['data-key']);
            return (render as ComponentFunction)(
              typeof id === 'string' && key !== undefined
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

const isBind = (value: unknown): value is { $bind: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { $bind?: unknown }).$bind === 'string';

/** Row `item`'s key under `each`, as the DOM spells it. */
const keyOf = (each: Each, item: unknown) =>
  String(
    each.key
      .split('.')
      .slice(1)
      .reduce<unknown>(
        (value, part) => (value as Record<string, unknown> | null)?.[part],
        item,
      ),
  );

/** One step from a param's value down to a row's items. */
type Step = string | { readonly each: Each; readonly key: string };

/**
 * Where `source` (an `$each`'s items) lives: a param and the steps down to
 * it. A `$bind` whose head is an enclosing `$each`'s `as` steps into that
 * outer row's item, found by its key in `keys`; any other head is a param.
 */
function sourceOf(
  source: ViewValue,
  enclosing: readonly Each[],
  keys: Readonly<Record<string, string>>,
): { param: string; steps: readonly Step[] } | undefined {
  if (isParam(source)) return { param: source.$param, steps: [] };
  if (!isBind(source)) return undefined;
  const [head, ...rest] = source.$bind.split('.') as [string, ...string[]];
  let at = enclosing.length - 1;
  while (at >= 0 && enclosing[at]!.as !== head) at -= 1;
  if (at < 0) return { param: head, steps: rest };
  const outer = enclosing[at]!;
  const key = keys[outer.template.id];
  if (key === undefined) return undefined;
  const base = sourceOf(outer.$each, enclosing.slice(0, at), keys);
  return (
    base && {
      param: base.param,
      steps: [...base.steps, { each: outer, key }, ...rest],
    }
  );
}

/** `value` with the items `steps` lead to replaced by `change(items)`. */
function updateAt(
  value: unknown,
  steps: readonly Step[],
  change: (items: readonly unknown[]) => unknown[],
): unknown {
  if (steps.length === 0)
    return Array.isArray(value) ? change(value) : undefined;
  const [step, ...rest] = steps as [Step, ...Step[]];
  if (typeof step === 'string') {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return undefined;
    const next = updateAt(
      (value as Record<string, unknown>)[step],
      rest,
      change,
    );
    return next === undefined ? undefined : { ...value, [step]: next };
  }
  if (!Array.isArray(value)) return undefined;
  const at = value.findIndex((item) => keyOf(step.each, item) === step.key);
  if (at < 0) return undefined;
  const next = updateAt(value[at], rest, change);
  if (next === undefined) return undefined;
  const items = [...value];
  items[at] = next;
  return items;
}

/**
 * Node `id`'s row closes. `keys` holds its row key, and the row key of each
 * enclosing `$each` row, by template node id. The rows' items come from a
 * param, directly (`$param`) or through `$bind`s, possibly to an outer
 * row's item (KF-7XQAFR): the result is that param without the closed
 * item. Undefined when the items cannot be traced to a param.
 */
export function closeRow(
  document: ViewDocument,
  id: string,
  keys: Readonly<Record<string, string>>,
  params: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const each = eachOf(document, id);
  const key = keys[id];
  if (!each || key === undefined) return undefined;
  const enclosing = findNode(document, id)!.ancestors.flatMap(
    ({ node }) => eachOf(document, node.id) ?? [],
  );
  const source = sourceOf(each.$each, enclosing, keys);
  if (!source) return undefined;
  const next = updateAt(params[source.param], source.steps, (items) =>
    items.filter((item) => keyOf(each, item) !== key),
  );
  return next === undefined ? undefined : { [source.param]: next };
}
