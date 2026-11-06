// KF-58917B: composed documents (`#view`) in play mode (docs/26-ui-editor.md
// §11.4). The edit canvas gives every node of a composed document its
// `#view`'s id, so a click selects the `#view`. Play instead gives each one a
// composed id, the owning `#view`'s id (itself composed for a nested one)
// and its own, so the play-time adapters find the component a node really
// is. Each `#view` keeps a play copy of the document it composes (by its
// composed id, falling back to the document the editor sent), and a value a
// person changes inside one goes where it comes from: through the `#view`'s
// props to a param, to the `#view`'s row item, or into a play copy.
import {
  composedViewPath,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewValue,
} from '@kerfjs/ui/view';

import { findNode, mapRows, mapTemplate } from './document.js';
import { setProp } from './edits.js';
import {
  eachOf,
  fresh,
  markRows,
  type RecordedValue,
  type RowKey,
  type RowProps,
  setRowField,
  setRowProp,
  viewRowParam,
} from './play-values.js';

/** Node ids are ULIDs, which never hold the separator. */
const SEPARATOR = '.';

/** Node `id` of the document `#view` `owner` composes, in play. */
export const composedId = (owner: string, id: string) =>
  `${owner}${SEPARATOR}${id}`;

/** Whether `id` is a composed node's (`composedId`). */
export const isComposed = (id: string) => id.includes(SEPARATOR);

/** A played node's id in the document that holds it. */
export const ownId = (id: string) => id.slice(id.lastIndexOf(SEPARATOR) + 1);

/** The top document's node a played node is, or is composed by. */
export const topNode = (id: string) => id.split(SEPARATOR)[0]!;

const KEY = '\n';

/**
 * A played `#view`'s `src`: its composed id, how many rows it sits in (the
 * `viewRowParam` props `markRows` gave it), and where its document is from
 * the top document's folder.
 */
const playSource = (owner: string, depth: number, path: string) =>
  [owner, depth, path].join(KEY);

/** The rows a marked `#view` sits in. */
const rowDepth = (node: ViewNode) => {
  let depth = 0;
  while (node.props?.[viewRowParam(depth)] !== undefined) depth += 1;
  return depth;
};

/**
 * A copy of `document` for play: every `#view`'s `src` is its `playSource`
 * and, with `owner`, every node's id is composed with it. `at` is where
 * `document` is from the top document's folder.
 */
export function playedViews(
  document: ViewDocument,
  owner?: string,
  at?: string,
): ViewDocument {
  const node = (item: ViewNode): ViewNode => {
    const id = owner === undefined ? item.id : composedId(owner, item.id);
    const zones = item.zones
      ? Object.fromEntries(
          Object.entries(item.zones).map(([zone, list]) => [
            zone,
            list.map(child),
          ]),
        )
      : undefined;
    return {
      ...item,
      id,
      ...(item.type === '#view' && typeof item.src === 'string'
        ? {
            src: playSource(id, rowDepth(item), composedViewPath(at, item.src)),
          }
        : {}),
      ...(zones ? { zones } : {}),
    };
  };
  const child = (item: ViewChild): ViewChild => {
    if ('$each' in item)
      return mapRows(item, (template) => mapTemplate(template, node));
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then),
        ...(item.else ? { else: child(item.else) } : {}),
      };
    if ('$slot' in item) return item;
    return node(item);
  };
  return document.root ? { ...document, root: node(document.root) } : document;
}

/**
 * The composed document a played `#view`'s `src` (`playSource`) renders:
 * its play copy or the one the editor sent (`resolve`), given the reserved
 * params its row keys come in, marked as in those rows (`markRows`), with
 * fresh items so a row with play-time props renders again.
 */
export function playedView(
  key: string,
  catalog: ViewCatalog,
  resolve: (path: string, owner: string) => ViewDocument,
): ViewDocument {
  const [owner, count, path] = key.split(KEY) as [string, string, string];
  const depth = Number(count);
  const composed = resolve(path, owner);
  const rows = Array.from({ length: depth }, (_, at) => viewRowParam(at));
  const withRows = {
    ...composed,
    params: {
      ...composed.params,
      ...Object.fromEntries(
        rows.map((name) => [name, { type: { kind: 'string' } }]),
      ),
    },
  } as ViewDocument;
  return playedViews(
    markRows(
      fresh(withRows),
      catalog,
      rows.map((name) => ({ $param: name })),
    ),
    owner,
    path,
  );
}

/** One document a played node sits in: the top one, or a composed one. */
export interface PlayLevel {
  /** The `#view` that composes it (its composed id); none for the top one. */
  readonly owner?: string;
  /** Where it is from the top document's folder; none for the top one. */
  readonly path?: string;
  /** Its play copy, or the document the editor sent. */
  readonly document: ViewDocument;
}

/**
 * The documents played node `id` sits in, from the top one down, and its
 * own id in the last; undefined when the chain does not resolve.
 */
export function levelsOf(
  top: ViewDocument,
  id: string,
  resolve: (path: string, owner: string) => ViewDocument | undefined,
): { levels: PlayLevel[]; id: string } | undefined {
  const segments = id.split(SEPARATOR);
  const levels: PlayLevel[] = [{ document: top }];
  for (let at = 0; at < segments.length - 1; at += 1) {
    const level = levels.at(-1)!;
    const view = findNode(level.document, segments[at]!)?.node;
    if (view?.type !== '#view' || typeof view.src !== 'string')
      return undefined;
    const owner = segments.slice(0, at + 1).join(SEPARATOR);
    const path = composedViewPath(level.path, view.src);
    const document = resolve(path, owner);
    if (!document) return undefined;
    levels.push({ owner, path, document });
  }
  const own = segments.at(-1)!;
  return findNode(levels.at(-1)!.document, own)
    ? { levels, id: own }
    : undefined;
}

/** `rows` of the nodes `owner` composes, by their own ids. */
export function rowsIn(rows: RowProps, owner: string): RowProps {
  const prefix = composedId(owner, '');
  return Object.fromEntries(
    Object.entries(rows).flatMap(([id, state]) => {
      const own = id.slice(prefix.length);
      return id.startsWith(prefix) && !isComposed(own) ? [[own, state]] : [];
    }),
  );
}

/** `rows` with the rows of the nodes `owner` composes replaced by `scoped`. */
export function rowsOut(
  rows: RowProps,
  owner: string,
  scoped: RowProps,
): RowProps {
  const kept = Object.keys(rowsIn(rows, owner));
  const rest = Object.fromEntries(
    Object.entries(rows).filter(
      ([id]) => !kept.some((own) => id === composedId(owner, own)),
    ),
  );
  return {
    ...rest,
    ...Object.fromEntries(
      Object.entries(scoped).map(([own, state]) => [
        composedId(owner, own),
        state,
      ]),
    ),
  };
}

const isParam = (value: unknown): value is { $param: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { $param?: unknown }).$param === 'string';

const isBind = (value: unknown): value is { $bind: string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { $bind?: unknown }).$bind === 'string';

const isExpression = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => key.startsWith('$'));

/** Where a value recorded in a composed document went. */
export interface ComposedValue extends RecordedValue {
  /** A play copy that changed: its `#view`'s composed id and document. */
  readonly copy?: { readonly owner: string; readonly document: ViewDocument };
}

/**
 * `#view` `id` in the top document, repeated, takes `value` at `prop`: a
 * `$bind` to a field of its own row's item sets that field in the param the
 * rows come from. `path` begins with the keys of the rows it sits in.
 */
function viewRowValue(
  top: ViewDocument,
  id: string,
  prop: string,
  value: unknown,
  path: readonly string[],
  params: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const visit = findNode(top, id)!;
  const current = visit.node.props?.[prop];
  if (!isBind(current)) return undefined;
  const each = eachOf(top, id)!;
  const [head, ...field] = current.$bind.split('.');
  if (head !== each.as || field.length === 0) return undefined;
  // The row roots it sits in, outermost first, then its own.
  const roots = [
    ...visit.ancestors.flatMap(({ node }) =>
      eachOf(top, node.id) ? [node.id] : [],
    ),
    id,
  ];
  // A composed node is marked with every row its `#view` sits in.
  const keys = Object.fromEntries(roots.map((root, at) => [root, path[at]!]));
  return setRowField(top, id, keys, field, value, params);
}

/**
 * The person changed composed node `id`'s `prop` to `value` (in row `key`
 * when it sits in one): recorded where the value lives, as `recordValue`
 * records a top document's. `levels` and `own` are `levelsOf(id)`. A
 * `$param` prop climbs to its `#view`'s prop of that name: in the top
 * document a `$param` there sets that param, a literal (or unset) prop
 * changes outside any row, and a repeated `#view`'s `$bind` to its row's
 * item sets that item's field; in a composed document a literal changes in
 * its play copy outside any row. A value that cannot be traced is kept on
 * the node itself: for its row, or in its document's play copy.
 */
export function recordComposedValue(
  levels: readonly PlayLevel[],
  rows: RowProps,
  id: string,
  own: string,
  key: RowKey | undefined,
  prop: string,
  value: unknown,
  params: Readonly<Record<string, unknown>>,
): ComposedValue {
  const top = levels[0]!.document;
  const segments = id.split(SEPARATOR);
  const path =
    key === undefined ? undefined : typeof key === 'string' ? [key] : key;
  const same = (current: unknown) =>
    JSON.stringify(current) === JSON.stringify(value);
  const unchanged: ComposedValue = { document: top, rows };
  const kept = (): ComposedValue => {
    if (path)
      return { ...unchanged, rows: setRowProp(rows, id, path, prop, value) };
    const level = levels.at(-1)!;
    return {
      ...unchanged,
      copy: {
        owner: level.owner!,
        document: setProp(level.document, own, prop, value as ViewValue),
      },
    };
  };
  // A node repeated in its own document changes for its row, as on top.
  if (findNode(levels.at(-1)!.document, own)!.repeated) return kept();
  const climb = (
    depth: number,
    node: string,
    name: string,
  ): ComposedValue | undefined => {
    const level = levels[depth]!;
    const visit = findNode(level.document, node)!;
    const current = visit.node.props?.[name];
    if (depth === 0) {
      if (visit.repeated) {
        if (!path) return undefined;
        const set = viewRowValue(top, node, name, value, path, params);
        return set && { ...unchanged, params: set };
      }
      if (isParam(current))
        return { ...unchanged, params: { [current.$param]: value } };
      if (path || isExpression(current)) return undefined;
      if (same(current)) return unchanged;
      return {
        ...unchanged,
        document: setProp(top, node, name, value as ViewValue),
      };
    }
    if (isParam(current))
      return climb(depth - 1, segments[depth - 1]!, current.$param);
    if (path || isExpression(current)) return undefined;
    if (same(current)) return unchanged;
    return {
      ...unchanged,
      copy: {
        owner: level.owner!,
        document: setProp(level.document, node, name, value as ViewValue),
      },
    };
  };
  return climb(levels.length - 1, own, prop) ?? kept();
}
