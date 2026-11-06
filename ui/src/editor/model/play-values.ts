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
//   (`markRows`), so it changes for its row too. KF-ZMBST3: a row inside
//   another row is known by its path of row keys (`data-kerf-outer-<n>`
//   marks), so a key repeated across outer rows names separate rows.
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
import { raw, type SafeHtml } from 'kerfjs';

import {
  findNode,
  mapTemplate,
  templateNodes,
  visitNodes,
} from './document.js';
import { setProp } from './edits.js';

/**
 * KF-36QBFM: the play-time row prop that hides a node in one row (a placed
 * tab closed in one row's bar, when every row's bar shares the node). The
 * renderer reads it and never passes it to the component.
 */
export const CLOSED = '$kerfPlayClosed';

/**
 * A row, by its key and (KF-ZMBST3) the keys of the rows it sits in. A
 * repeat inside another's row needs its keys unique only within the outer
 * row, so a row is known by its **path**: every enclosing row's key,
 * outermost first, ending in its own. A plain string is a one-key path.
 */
export type RowKey = string | readonly string[];

/** `key` as a path. */
const pathOf = (key: RowKey): readonly string[] =>
  typeof key === 'string' ? [key] : key;

/** A row path as `RowState` stores it. */
export const rowPath = (key: RowKey): string => JSON.stringify(pathOf(key));

type Props = Readonly<Record<string, unknown>>;

/**
 * One repeated node's per-row props: under every row; under every row of
 * one outer row (`under`, by the outer row's `rowPath`; KF-ZMBST3); then by
 * the row's own `rowPath`.
 */
export interface RowState {
  readonly every: Props;
  readonly under?: Readonly<Record<string, Props>>;
  readonly keys: Readonly<Record<string, Props>>;
}

/** Per-row props of the play copy's repeated nodes, by node id. */
export type RowProps = Readonly<Record<string, RowState>>;

/** `rows` with node `id`'s rows set to `state`. */
export function setRowProps(
  rows: RowProps,
  id: string,
  state: RowState,
): RowProps {
  return { ...rows, [id]: state };
}

/** `rows` with node `id`'s row `key` taking `prop` = `value`. */
export function setRowProp(
  rows: RowProps,
  id: string,
  key: RowKey,
  prop: string,
  value: unknown,
): RowProps {
  const current = rows[id] ?? { every: {}, keys: {} };
  const path = rowPath(key);
  return setRowProps(rows, id, {
    ...current,
    keys: { ...current.keys, [path]: { ...current.keys[path], [prop]: value } },
  });
}

/** The props `rows` lays over node `id`'s row `key`. */
export const rowPropsOf = (rows: RowProps, id: string, key: RowKey): Props => {
  const state = rows[id];
  if (!state) return {};
  const path = pathOf(key);
  return {
    ...state.every,
    ...(path.length > 1 ? state.under?.[rowPath(path.slice(0, -1))] : {}),
    ...state.keys[rowPath(path)],
  };
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

/**
 * KF-ZMBST3: the marks naming the rows around a node's own row, outermost
 * first: `data-kerf-outer-0`, `data-kerf-outer-1`, ….
 */
export const OUTER_MARK = 'data-kerf-outer-';

type Each = Extract<ViewChild, { $each: unknown }>;

/**
 * `document` with every node inside an `$each` row marked with the keys of
 * its rows (`$bind`s to each enclosing `$each`'s key), through the node's
 * data channel: a node nested in a row (not the template's root, which has
 * its `data-key`) takes its row's key as `data-kerf-row`, and (KF-ZMBST3) a
 * node in a row inside other rows takes each outer row's key as
 * `data-kerf-outer-<depth>`. Play mode only, after validation, which
 * reserves `data-kerf-*` for the renderer. A node with no data channel, or
 * whose `rootAttributes` is an expression, stays unmarked.
 */
export function markRows(
  document: ViewDocument,
  catalog: ViewCatalog,
): ViewDocument {
  const mark = (
    node: ViewNode,
    keys: readonly string[],
    root: boolean,
  ): ViewNode => {
    const marks: Record<string, ViewValue> = Object.fromEntries(
      keys
        .slice(0, -1)
        .map((key, depth) => [`${OUTER_MARK}${depth}`, { $bind: key }]),
    );
    if (!root) marks[ROW_MARK] = { $bind: keys.at(-1)! };
    const component = catalog.components.get(node.type)?.component;
    if (!component || Object.keys(marks).length === 0) return node;
    switch (channelOf(component as Parameters<typeof channelOf>[0])) {
      case 'rootAttributes': {
        const base = node.props?.rootAttributes ?? {};
        if (isExpression(base) || typeof base !== 'object' || base === null)
          return node;
        return {
          ...node,
          props: {
            ...node.props,
            rootAttributes: { ...(base as object), ...marks },
          },
        };
      }
      case 'native':
      case 'attributes':
        return { ...node, props: { ...node.props, ...marks } };
      default:
        return node;
    }
  };
  const child = (item: ViewChild, keys: readonly string[]): ViewChild => {
    if ('$each' in item)
      return {
        ...item,
        template: mapTemplate(item.template, (branch) =>
          node(branch, [...keys, item.key], true),
        ),
      };
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then, keys),
        ...(item.else ? { else: child(item.else, keys) } : {}),
      };
    if ('$slot' in item) return item;
    return node(item, keys, false);
  };
  const node = (
    item: ViewNode,
    keys: readonly string[],
    root: boolean,
  ): ViewNode => {
    const marked = keys.length > 0 ? mark(item, keys, root) : item;
    if (!item.zones) return marked;
    return {
      ...marked,
      zones: Object.fromEntries(
        Object.entries(item.zones).map(([zone, children]) => [
          zone,
          children.map((entry) => child(entry, keys)),
        ]),
      ),
    };
  };
  return document.root
    ? { ...document, root: node(document.root, [], false) }
    : document;
}

type ComponentFunction = (props: Record<string, unknown>) => SafeHtml;

/** A row mark's value as the DOM spells it, or undefined. */
const rowKeyOf = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;

/**
 * The path of the row a node is in, from its marks (its props, or the
 * attributes of its rendered element; `marks` reads one by name): the outer
 * rows' keys (KF-ZMBST3), then its own row's, `data-kerf-row` for a node
 * nested in the row (KF-7XQAFR) or `data-key` for the template's root.
 * Undefined outside any row.
 */
export function rowPathOf(
  marks: (name: string) => unknown,
): readonly string[] | undefined {
  const key = rowKeyOf(marks(ROW_MARK) ?? marks('data-key'));
  if (key === undefined) return undefined;
  const path: string[] = [];
  for (
    let outer = rowKeyOf(marks(`${OUTER_MARK}0`));
    outer !== undefined;
    outer = rowKeyOf(marks(`${OUTER_MARK}${path.length}`))
  )
    path.push(outer);
  return [...path, key];
}

/**
 * `components` with each repeated row's play-time props laid over the props
 * the document gives it. A row is known by the node id and row path the
 * renderer marks it with (`rowPathOf`), in `rootAttributes` or directly on
 * the props. A node `CLOSED` for its row renders nothing there.
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
            const path = rowPathOf((name) => marks[name]);
            if (typeof id !== 'string' || path === undefined)
              return (render as ComponentFunction)(props);
            const { [CLOSED]: closed, ...row } = rowPropsOf(rows, id, path);
            return closed === true
              ? raw('')
              : (render as ComponentFunction)({ ...props, ...row });
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
  key: RowKey | undefined,
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
        if (
          '$each' in child &&
          templateNodes(child.template).some((node) => node.id === id)
        )
          return child;
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
  // The outer row rendered one of its template's branches (KF-1CRGP1).
  const key = templateNodes(outer.template)
    .map((node) => keys[node.id])
    .find((found) => found !== undefined);
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
