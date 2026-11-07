// Document edits (KF-KX77TV: editor editing). Every edit is a pure transform
// that returns a new document, so the document stays the editor's only state
// and history is a list of documents.
import {
  fieldZoneOf,
  validateView,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewTemplate,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import { findNode, mapRows, rowNodes, visitNodes } from './document.js';
import { type FieldPath, valueAt, withValueAt } from './fields.js';

type MutableNode = {
  id: string;
  type: string;
  name?: string;
  props?: Record<string, ViewValue>;
  zones?: Record<string, ViewChild[]>;
};

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A new 26-character Crockford ULID: 48-bit time plus 80 random bits. */
export function newNodeId(
  now = Date.now(),
  random: () => number = Math.random,
): string {
  let time = '';
  let value = now;
  for (let index = 0; index < 10; index += 1) {
    time = CROCKFORD[value % 32] + time;
    value = Math.floor(value / 32);
  }
  let tail = '';
  for (let index = 0; index < 16; index += 1)
    tail += CROCKFORD[Math.floor(random() * 32)];
  return time + tail;
}

const clone = (document: ViewDocument): ViewDocument =>
  globalThis.structuredClone(document);

/** Where a node sits: its zone list and index, when it is directly in one. */
interface Located {
  readonly node: MutableNode;
  readonly list?: ViewChild[];
  readonly index?: number;
  readonly parent?: MutableNode;
  readonly zone?: string;
}

/**
 * Walks every node in document order, calling `visit` with where it sits;
 * the walk stops when `visit` returns true. A node in a `$each` template or
 * an `$if` branch is not directly in its zone list, so it has no list.
 */
function walk(document: ViewDocument, visit: (at: Located) => boolean) {
  let stopped = false;
  const visitChild = (
    item: ViewChild,
    list: ViewChild[],
    index: number,
    parent: MutableNode,
    zone: string,
    branch = false,
  ): void => {
    if ('$each' in item)
      for (const node of rowNodes(item))
        visitNode(node as MutableNode, undefined, undefined, parent, zone);
    else if ('$if' in item) {
      // A branch is itself a child: a node, a repeat, or a nested condition.
      visitChild(item.then, list, index, parent, zone, true);
      if (item.else) visitChild(item.else, list, index, parent, zone, true);
    } else if (!('$slot' in item))
      // A node in a branch is not directly in the zone list.
      visitNode(
        item as MutableNode,
        branch ? undefined : list,
        branch ? undefined : index,
        parent,
        zone,
      );
  };
  const visitNode = (
    node: MutableNode,
    list: ViewChild[] | undefined,
    index: number | undefined,
    parent: MutableNode | undefined,
    zone: string | undefined,
  ) => {
    if (stopped || !node || typeof node !== 'object' || !('type' in node))
      return;
    if (visit({ node, list, index, parent, zone })) {
      stopped = true;
      return;
    }
    for (const [key, children] of Object.entries(node.zones ?? {})) {
      children.forEach((child, childIndex) =>
        visitChild(child, children, childIndex, node, key),
      );
    }
  };
  visitNode(
    document.root as MutableNode,
    undefined,
    undefined,
    undefined,
    undefined,
  );
}

/** Finds a node by id in a (cloned, mutable) document. */
function locate(document: ViewDocument, id: string): Located | undefined {
  let found: Located | undefined;
  walk(document, (at) => {
    if (at.node.id !== id) return false;
    found = at;
    return true;
  });
  return found;
}

// KF-ZW633Z: where every node sits, computed once per document. The outline
// asks for each row, so locating one node per row (on a clone) cost the
// square of the document; documents are immutable, edits return new ones.
const PLACED = new WeakMap<ViewDocument, ReadonlyMap<string, Located>>();

/** Where node `id` sits in `document`, which is read, never changed. */
function placed(document: ViewDocument, id: string): Located | undefined {
  let all = PLACED.get(document);
  if (!all) {
    const map = new Map<string, Located>();
    // The first node with an id wins, as `locate` finds it.
    walk(document, (at) => {
      if (!map.has(at.node.id)) map.set(at.node.id, at);
      return false;
    });
    PLACED.set(document, map);
    all = map;
  }
  return all.get(id);
}

/** Adds `node` to `zone` of the node `parentId`, at `index` (default: the end). */
export function insertNode(
  document: ViewDocument,
  parentId: string,
  zone: string,
  node: ViewNode,
  index?: number,
): ViewDocument {
  const next = clone(document);
  const parent = locate(next, parentId)?.node;
  if (!parent) throw new Error(`no node ${parentId}`);
  parent.zones = { ...(parent.zones ?? {}) };
  const list = [...(parent.zones[zone] ?? [])];
  list.splice(index ?? list.length, 0, node);
  parent.zones[zone] = list;
  return next;
}

/**
 * Lists a component's package in the document's `catalogs` (KF-6GT5QY), as a
 * document must before it uses one of its components. A type with no package
 * (`#view`, KF-FXACB5: a Library document drop) leaves the catalogs alone.
 */
export function withCatalog(document: ViewDocument, key: string): ViewDocument {
  const at = key.lastIndexOf(':');
  if (at < 0) return document;
  const pkg = key.slice(0, at);
  return document.catalogs.includes(pkg)
    ? document
    : { ...document, catalogs: [...document.catalogs, pkg] };
}

/**
 * The document with `node` as its root, in place of the whole previous tree
 * (KF-KWQVDJ: start a document from a layout such as a NavStack). Its params,
 * slots, and name stay; its package joins the catalogs.
 */
export function replaceRoot(
  document: ViewDocument,
  node: ViewNode,
): ViewDocument {
  return withCatalog({ ...document, root: node }, node.type);
}

/** `document` with no root (KF-PK3GVY): its other fields stay, in order. */
export function withoutRoot(document: ViewDocument): ViewDocument {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => key !== 'root'),
  ) as unknown as ViewDocument;
}

/**
 * Removes a node. A node placed directly in a zone list leaves its list; the
 * root leaves the document rootless (KF-PK3GVY: delete the root), keeping its
 * params, slots, and name. `$each` templates and `$if` branches belong to
 * their structure.
 */
export function removeNode(document: ViewDocument, id: string): ViewDocument {
  if (document.root?.id === id) return withoutRoot(document);
  const next = clone(document);
  const found = locate(next, id);
  if (!found?.list || found.index === undefined)
    throw new Error(`node ${id} cannot be removed`);
  found.list.splice(found.index, 1);
  return next;
}

/**
 * Whether `removeNode` / `moveNode` can act on a node: `placed` when it sits
 * directly in a zone list, so it can also be dragged or copied beside
 * itself. The root is not placed but can be removed (KF-PK3GVY), which
 * leaves the document rootless.
 */
export function isMovable(
  document: ViewDocument,
  id: string,
): { up: boolean; down: boolean; remove: boolean; placed: boolean } {
  if (document.root?.id === id)
    return { up: false, down: false, remove: true, placed: false };
  const found = placed(document, id);
  if (!found?.list || found.index === undefined)
    return { up: false, down: false, remove: false, placed: false };
  return {
    up: found.index > 0,
    down: found.index < found.list.length - 1,
    remove: true,
    placed: true,
  };
}

/** Moves a node one place up (-1) or down (+1) within its zone. */
export function moveNode(
  document: ViewDocument,
  id: string,
  delta: -1 | 1,
): ViewDocument {
  const next = clone(document);
  const found = locate(next, id);
  if (!found?.list || found.index === undefined)
    throw new Error(`node ${id} cannot move`);
  const target = found.index + delta;
  if (target < 0 || target >= found.list.length) return document;
  const [item] = found.list.splice(found.index, 1);
  found.list.splice(target, 0, item!);
  return next;
}

/** Where a node sits directly in a zone list: its parent, zone, and index. */
export interface Placement {
  readonly parent: string;
  readonly zone: string;
  readonly index: number;
}

/**
 * Where node `id` sits, or undefined when it is not directly in a zone list
 * (the root, a repeated template, or a branch of a condition).
 */
export function placementOf(
  document: ViewDocument,
  id: string,
): Placement | undefined {
  const found = placed(document, id);
  return found?.list && found.index !== undefined
    ? { parent: found.parent!.id, zone: found.zone!, index: found.index }
    : undefined;
}

/**
 * Moves the zone child at `from` (a node, slot, repeat, or condition) to
 * `to`: index `to.index` of zone `to.zone` of node `to.parent`, counted
 * before the move (KF-WXP6AB, KF-5RKX3W). Returns the document and where the
 * child landed; the document is unchanged when nothing moves, when either
 * place does not exist, or when the child would move into itself.
 */
export function placeChild(
  document: ViewDocument,
  from: Placement,
  to: Placement,
): { readonly document: ViewDocument; readonly at: Placement } {
  const unchanged = { document, at: from };
  const sameList = from.parent === to.parent && from.zone === to.zone;
  const index = sameList && from.index < to.index ? to.index - 1 : to.index;
  if (sameList && index === from.index) return unchanged;
  const next = clone(document);
  const source = locate(next, from.parent)?.node.zones?.[from.zone];
  const child = source?.[from.index];
  if (!child) return unchanged;
  // A child cannot move into a node it holds.
  if (heldIds(child).has(to.parent)) return unchanged;
  source.splice(from.index, 1);
  const parent = locate(next, to.parent)?.node;
  if (!parent) return unchanged;
  parent.zones = { ...(parent.zones ?? {}) };
  const list = [...(parent.zones[to.zone] ?? [])];
  if (index > list.length) return unchanged;
  list.splice(index, 0, child);
  parent.zones[to.zone] = list;
  return { document: next, at: { ...to, index } };
}

/** The ids of every node a zone child holds, itself included. */
function heldIds(child: ViewChild, ids = new Set<string>()): Set<string> {
  if ('$slot' in child) return ids;
  if ('$each' in child) {
    for (const node of rowNodes(child)) heldIds(node, ids);
    return ids;
  }
  if ('$if' in child) {
    heldIds(child.then, ids);
    if (child.else) heldIds(child.else, ids);
    return ids;
  }
  ids.add(child.id);
  for (const list of Object.values(child.zones ?? {}))
    for (const inner of list) heldIds(inner, ids);
  return ids;
}

/**
 * Moves node `id` (which must sit directly in a zone list) to `to`, as
 * `placeChild` does. Unchanged when the node cannot move there.
 */
export function placeNode(
  document: ViewDocument,
  id: string,
  to: Placement,
): ViewDocument {
  const from = placementOf(document, id);
  return from ? placeChild(document, from, to).document : document;
}

/**
 * A copy of zone child `child` (KF-QAVK73: duplicate and paste): every node
 * it holds gets a fresh id, and every name a unique one, numbered past the
 * names in `taken` (which it extends), so the copy can sit in the same
 * document as its original.
 */
export function copyChild<Child extends ViewChild>(
  child: Child,
  taken: Set<string>,
  makeId: () => string = newNodeId,
): Child {
  const unique = (name: string) => {
    const stem = name.replace(/\d+$/, '');
    let next = name;
    for (let count = 2; taken.has(next); count += 1) next = `${stem}${count}`;
    taken.add(next);
    return next;
  };
  const copy = (item: ViewChild): ViewChild => {
    if ('$slot' in item) return { ...item };
    if ('$each' in item)
      return mapRows(item, (template) => copy(template) as ViewTemplate);
    if ('$if' in item)
      return {
        ...item,
        then: copy(item.then),
        ...(item.else ? { else: copy(item.else) } : {}),
      };
    const node = globalThis.structuredClone(item) as MutableNode;
    node.id = makeId();
    if (node.name) node.name = unique(node.name);
    if (node.zones)
      node.zones = Object.fromEntries(
        Object.entries(node.zones).map(([zone, list]) => [
          zone,
          list.map(copy),
        ]),
      );
    return node as ViewNode;
  };
  return copy(child) as Child;
}

/** Every node name in `document`. */
function namesIn(document: ViewDocument): Set<string> {
  const names = new Set<string>();
  const visit = (child: ViewChild) => {
    if ('$slot' in child) return;
    if ('$each' in child) return rowNodes(child).forEach(visit);
    if ('$if' in child) {
      visit(child.then);
      if (child.else) visit(child.else);
      return;
    }
    if (child.name) names.add(child.name);
    for (const list of Object.values(child.zones ?? {})) list.forEach(visit);
  };
  if (document.root) visit(document.root);
  return names;
}

/**
 * Inserts a copy of `node` (fresh ids, unique names) at `to`, and returns
 * the document and the copy's id (KF-QAVK73).
 */
export function pasteNode(
  document: ViewDocument,
  node: ViewNode,
  to: Placement,
  makeId: () => string = newNodeId,
): { readonly document: ViewDocument; readonly id: string } {
  const copy = copyChild(node, namesIn(document), makeId);
  return {
    document: insertNode(document, to.parent, to.zone, copy, to.index),
    id: copy.id,
  };
}

/**
 * A copy of node `id` right after it in its zone (KF-QAVK73), or undefined
 * when the node does not sit directly in a zone (the root, a repeated
 * template, a branch).
 */
export function duplicateNode(
  document: ViewDocument,
  id: string,
  makeId: () => string = newNodeId,
): { readonly document: ViewDocument; readonly id: string } | undefined {
  const at = placementOf(document, id);
  const node = findNode(document, id)?.node;
  if (!at || !node) return undefined;
  return pasteNode(document, node, { ...at, index: at.index + 1 }, makeId);
}

/**
 * Node `id` embedded in a new container (KF-6MGYSG: Embed in): the container
 * takes the node's place and holds it in `zone`, its main zone. The place is
 * wherever the node is held (KF-84CCD1): a zone list, the root (the container
 * becomes the root), a `$each` template, or an `$if` branch. Undefined when
 * the document has no node `id`.
 */
export function embedNode(
  document: ViewDocument,
  id: string,
  container: {
    readonly type: string;
    readonly props?: Record<string, ViewValue>;
    /**
     * KF-N7K17T: the container's other seeded zones (a SplitView's list
     * pane), kept beside `zone`, which holds the node in place of its seed.
     */
    readonly zones?: Readonly<Record<string, readonly ViewChild[]>>;
  },
  zone: string,
  makeId: () => string = newNodeId,
): { readonly document: ViewDocument; readonly id: string } | undefined {
  const next = clone(document) as { root: ViewNode };
  let wrapperId: string | undefined;
  const wrap = (node: ViewNode): ViewNode => {
    wrapperId = makeId();
    return {
      id: wrapperId,
      type: container.type,
      // No props reads as no `props` key, as a palette drop writes it
      // (KF-QX497W).
      ...(container.props && Object.keys(container.props).length
        ? { props: { ...container.props } }
        : {}),
      zones: { ...container.zones, [zone]: [node] },
    } as ViewNode;
  };
  // The child in a holder's place: wrapped when it is the node, else visited.
  const place = (child: ViewChild): ViewChild => {
    // The first node with the id is wrapped, as `locate` finds it.
    if (wrapperId !== undefined || '$slot' in child) return child;
    if ('$each' in child)
      return mapRows(child, (template) => place(template) as ViewTemplate);
    if ('$if' in child)
      return {
        ...child,
        then: place(child.then),
        ...(child.else ? { else: place(child.else) } : {}),
      };
    if (child.id === id) return wrap(child);
    const node = child as MutableNode;
    for (const list of Object.values(node.zones ?? {}))
      list.forEach((item, index) => (list[index] = place(item)));
    return child;
  };
  next.root = place(next.root) as ViewNode;
  return wrapperId === undefined
    ? undefined
    : {
        document: withCatalog(next as ViewDocument, container.type),
        id: wrapperId,
      };
}

/** Moves a node into another zone (of any node), at the end. */
export function moveNodeTo(
  document: ViewDocument,
  id: string,
  parentId: string,
  zone: string,
): ViewDocument {
  if (
    id === parentId ||
    visitNodes(document).some(
      (visit) =>
        visit.node.id === parentId &&
        visit.ancestors.some((ancestor) => ancestor.node.id === id),
    )
  ) {
    throw new Error('a node cannot move into itself');
  }
  const found = locate(clone(document), id);
  if (!found?.list) throw new Error(`node ${id} cannot move`);
  return insertNode(
    removeNode(document, id),
    parentId,
    zone,
    found.node as ViewNode,
  );
}

const CAMEL = /^[a-z][A-Za-z0-9]*$/;

/** Names (or, with an empty name, unnames) a node; returns an error message instead when invalid. */
export function renameNode(
  document: ViewDocument,
  id: string,
  name: string,
): { document: ViewDocument } | { error: string } {
  const trimmed = name.trim();
  if (trimmed && !CAMEL.test(trimmed))
    return {
      error: 'A name is a camelCase identifier, such as composeButton.',
    };
  if (
    trimmed &&
    visitNodes(document).some(
      (visit) => visit.node.name === trimmed && visit.node.id !== id,
    )
  ) {
    return { error: `Another node is already named ${trimmed}.` };
  }
  const next = clone(document);
  const node = locate(next, id)?.node;
  if (!node) return { error: `No node ${id}.` };
  if (trimmed) node.name = trimmed;
  else delete node.name;
  return { document: next };
}

/** Sets (or, with `undefined`, clears) one prop of a node. */
/**
 * `document` with `value` at `path` inside prop `prop` of node `id`; an empty
 * path sets the whole prop, as `setProp` does.
 */
export function setField(
  document: ViewDocument,
  id: string,
  prop: string,
  path: FieldPath,
  value: ViewValue | undefined,
): ViewDocument {
  if (!path.length) return setProp(document, id, prop, value);
  const current = locate(document, id)?.node.props?.[prop];
  return setProp(document, id, prop, withValueAt(current, path, value));
}

export function setProp(
  document: ViewDocument,
  id: string,
  prop: string,
  value: ViewValue | undefined,
): ViewDocument {
  const next = clone(document);
  const node = locate(next, id)?.node;
  if (!node) throw new Error(`no node ${id}`);
  const props = { ...(node.props ?? {}) };
  if (value === undefined) delete props[prop];
  else props[prop] = value;
  if (Object.keys(props).length) node.props = props;
  else delete node.props;
  return next;
}

/**
 * `document` with text run `id` reading `value` (KF-YBMVVM: a `#text` run in
 * a zone that mixes text and nodes is edited in the Inspector).
 */
export function setTextRun(
  document: ViewDocument,
  id: string,
  value: string,
): ViewDocument {
  const next = clone(document);
  const node = locate(next, id)?.node as
    (MutableNode & { value?: string }) | undefined;
  if (node?.type !== '#text') throw new Error(`no text run ${id}`);
  node.value = value;
  return next;
}

/**
 * `document` with each filled field zone owning its field (KF-PD6QC5): a
 * placeholder the prop value held there (a seeded item slot, text) gives
 * way to the zone's nodes, so the two never clash. Every edit commits
 * through it, and a drop is judged after it (KF-HGG7MJ).
 */
export function ownFilledFields(
  document: ViewDocument,
  catalog: ViewCatalog,
): ViewDocument {
  let next = document;
  for (const { node } of visitNodes(document))
    for (const [prop, value] of ownedFields(node, catalog))
      next = setProp(next, node.id, prop, value);
  return next;
}

/**
 * `node` as `ownFilledFields` leaves it: its own props only, read from its
 * own props and zones (KF-SFAA5R: a move check prepares each node with it).
 */
export function ownNode(node: ViewNode, catalog: ViewCatalog): ViewNode {
  let props = node.props;
  for (const [prop, value] of ownedFields(node, catalog))
    props = { ...(props ?? {}), [prop]: value };
  return props === node.props ? node : { ...node, props };
}

/** The props `ownFilledFields` sets on `node`, in the order it sets them. */
function ownedFields(
  node: ViewNode,
  catalog: ViewCatalog,
): [string, ViewValue][] {
  const fields: [string, ViewValue][] = [];
  for (const [key, children] of Object.entries(node.zones ?? {})) {
    const component = catalog.components.get(node.type);
    const field =
      component && fieldZoneOf(component.component, component.definitions, key);
    const own = node.props?.[field?.prop ?? ''] as ViewValue | undefined;
    if (!field || !children.length || valueAt(own, field.path) === undefined)
      continue;
    // An object left with no other field stays, so the prop still reads
    // as set (its rail kind, its toolbar).
    fields.push([field.prop, withValueAt(own, field.path, undefined) ?? {}]);
  }
  return fields;
}

/** The document-grammar type a component prop's literal value can be promoted as. */
export function paramTypeFor(type: {
  kind: string;
  values?: readonly (string | number | boolean)[];
}): ViewType | undefined {
  switch (type.kind) {
    case 'string':
    case 'number':
    case 'boolean':
      return { kind: type.kind };
    case 'enum':
      return { kind: 'enum', values: [...(type.values ?? [])] };
    case 'content':
      return { kind: 'content' };
    default:
      return undefined;
  }
}

/**
 * Turns a prop, or the field at `path` inside it (KF-3QEZFB: nested params),
 * into a document input: adds a param named `param` (its current literal
 * becomes the default) and points the prop or field at it.
 */
export function promoteToParam(
  document: ViewDocument,
  id: string,
  prop: string,
  param: string,
  type: ViewType,
  path: FieldPath = [],
): { document: ViewDocument } | { error: string } {
  if (!CAMEL.test(param))
    return { error: 'A param name is a camelCase identifier.' };
  if (document.params && param in document.params)
    return { error: `There is already a param named ${param}.` };
  const node = locate(clone(document), id)?.node;
  if (!node) return { error: `No node ${id}.` };
  const current = valueAt(node.props?.[prop], path);
  // A list or object literal is a default too (KF-V9V2B6); a binding is not.
  const literal =
    current !== undefined &&
    (current === null ||
      typeof current !== 'object' ||
      !Object.keys(current).some((key) => key.startsWith('$')));
  const next = setField(document, id, prop, path, { $param: param });
  const params = {
    ...(next.params ?? {}),
    [param]: literal ? { type, default: current } : { type },
  };
  return { document: { ...next, params } };
}

/**
 * Renames document param `from` to `to` (KF-1HEZZZ): the params entry keeps
 * its place and every `$param` reference to it follows, so a promoted prop's
 * generated `node<Prop>` name can become one the author chooses.
 */
export function renameParam(
  document: ViewDocument,
  from: string,
  to: string,
): { document: ViewDocument } | { error: string } {
  const params = document.params ?? {};
  if (!(from in params)) return { error: `No param ${from}.` };
  if (to === from) return { document };
  if (!CAMEL.test(to))
    return { error: 'A param name is a camelCase identifier.' };
  if (to in params) return { error: `There is already a param named ${to}.` };
  const follow = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(follow);
    if (value === null || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (record.$param === from) return { ...record, $param: to };
    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [key, follow(item)]),
    );
  };
  const renamed = Object.fromEntries(
    Object.entries(params).map(([name, param]) => [
      name === from ? to : name,
      param,
    ]),
  );
  return {
    document: Object.fromEntries(
      Object.entries(document).map(([key, value]) => [
        key,
        key === 'params' ? renamed : follow(value),
      ]),
    ) as unknown as ViewDocument,
  };
}

interface Zone {
  readonly id: string;
  readonly jsx?: { readonly prop?: string };
  readonly accepts: readonly string[];
  readonly cardinality: {
    readonly min: number;
    readonly max: number | 'unbounded';
  };
}

export interface ZoneOption {
  readonly key: string;
  /** Component keys this zone accepts, or undefined for any component. */
  readonly accepts?: readonly string[];
  /** Set when the zone is full or accepts nothing addable. */
  readonly disabledReason?: string;
  /**
   * The node's main zone, the one its `children` fill (KF-W10DXQ: a Pane's
   * content, not its header): where a drop inside the node lands first.
   */
  readonly primary?: true;
}

/**
 * The zones a node offers for adding a child: its composition zones bound to
 * a prop, then its content props (`slot`). A zone that names catalog entries
 * accepts only those; a full zone is disabled with a reason.
 */
export function legalZones(
  node: ViewNode,
  entry:
    { readonly package?: string; readonly zones?: readonly Zone[] } | undefined,
  props: readonly {
    readonly name: string;
    readonly slot?: true;
    readonly zone?: string;
  }[],
  knownKeys: ReadonlySet<string>,
): ZoneOption[] {
  const options: ZoneOption[] = [];
  for (const zone of entry?.zones ?? []) {
    if (!zone.jsx?.prop) continue;
    const accepts = zone.accepts
      .map((accepted) =>
        accepted.includes(':') ? accepted : `${entry?.package}:${accepted}`,
      )
      .filter((key) => knownKeys.has(key));
    const count = node.zones?.[zone.id]?.length ?? 0;
    const full =
      zone.cardinality.max !== 'unbounded' && count >= zone.cardinality.max;
    options.push({
      key: zone.id,
      ...(zone.jsx.prop === 'children' ? { primary: true as const } : {}),
      ...(accepts.length ? { accepts } : {}),
      ...(full
        ? { disabledReason: `${zone.id} holds at most ${zone.cardinality.max}` }
        : {}),
    });
  }
  for (const prop of props) {
    if (prop.slot && !options.some((option) => option.key === prop.name))
      options.push({
        key: prop.name,
        ...(prop.name === 'children' ? { primary: true as const } : {}),
      });
  }
  return options;
}

/** Component ids a zone named like this usually holds, by name pattern. */
const ZONE_SUGGESTIONS: readonly (readonly [RegExp, string])[] = [
  [/icon$/i, 'lucide-icon'],
  [/badge$/i, 'badge'],
];

/**
 * The components to offer first for zone `zone` (KF-N8TW04: a Button's
 * `icon` suggests LucideIcon), from `available` component keys: those whose
 * id its name suggests, in `available`'s package order.
 */
export function suggestedComponents(
  zone: string,
  available: readonly string[],
): string[] {
  const ids = ZONE_SUGGESTIONS.filter(([pattern]) => pattern.test(zone)).map(
    ([, id]) => id,
  );
  return available.filter((key) =>
    ids.includes(key.slice(key.indexOf(':') + 1)),
  );
}

/** `zones` with the primary zone first, the rest in their own order. */
export function primaryFirst<Zone extends ZoneOption>(
  zones: readonly Zone[],
): Zone[] {
  return [
    ...zones.filter((zone) => zone.primary),
    ...zones.filter((zone) => !zone.primary),
  ];
}

/** Undo/redo over whole documents. */
export class History {
  private past: ViewDocument[] = [];
  private future: ViewDocument[] = [];

  constructor(private readonly limit = 200) {}

  /** Records `previous` before an edit replaces it. */
  record(previous: ViewDocument): void {
    this.past.push(previous);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(current: ViewDocument): ViewDocument {
    const previous = this.past.pop();
    if (!previous) return current;
    this.future.push(current);
    return previous;
  }

  redo(current: ViewDocument): ViewDocument {
    const next = this.future.pop();
    if (!next) return current;
    this.past.push(current);
    return next;
  }

  /** Forgets all history, such as after opening another document. */
  clear(): void {
    this.past = [];
    this.future = [];
  }
}

/** A value a prop can be bound to, with how the inspector names it. */
export interface BindingOption {
  readonly label: string;
  readonly value: ViewValue;
}

/** The `$each` scopes around a node, innermost last: each item's name and source. */
export function eachScopes(
  document: ViewDocument,
  id: string,
): { readonly as: string; readonly source: unknown }[] {
  type Frame = { readonly as: string; readonly source: unknown };
  const visit = (node: ViewNode, frames: Frame[]): Frame[] | undefined => {
    if (node.id === id) return frames;
    for (const children of Object.values(node.zones ?? {}))
      for (const item of children) {
        const found =
          '$each' in item
            ? rowNodes(item)
                .map((node) =>
                  visit(node, [...frames, { as: item.as, source: item.$each }]),
                )
                .find(Boolean)
            : '$if' in item
              ? (visit(item.then as ViewNode, frames) ??
                (item.else ? visit(item.else as ViewNode, frames) : undefined))
              : '$slot' in item
                ? undefined
                : visit(item, frames);
        if (found) return found;
      }
    return undefined;
  };
  return (document.root && visit(document.root, [])) ?? [];
}

/**
 * The params and in-scope `$each` item fields a prop of node `id`, or the
 * field at `path` inside it (KF-3QEZFB: nested params), can be bound to
 * (KF-K5TKCV). Each candidate is kept only when the validator accepts it
 * there, so its scope and type rules decide.
 */
export function bindingOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  prop: string,
  path: FieldPath = [],
  /**
   * KF-PTMNSZ: completes a document before it is judged (a field's object
   * gets placeholders for its other required fields), so a candidate is
   * rejected only for problems of its own, not its object's missing fields.
   */
  prepare: (document: ViewDocument) => ViewDocument = (same) => same,
  /**
   * KF-5N26H6: loads a `#view`'s document, so a binding to one of its
   * params is checked against that param's type.
   */
  resolveView?: (src: string, path: string) => unknown,
): BindingOption[] {
  const params = document.params ?? {};
  const candidates: BindingOption[] = Object.keys(params).map((name) => ({
    label: `Param ${name}`,
    value: { $param: name },
  }));
  for (const scope of eachScopes(document, id)) {
    const source = scope.source as { $param?: string };
    const type = source.$param ? params[source.$param]?.type : undefined;
    const items = type?.kind === 'array' ? type.items : undefined;
    const fields = items?.kind === 'object' ? (items.props ?? []) : [];
    for (const field of fields)
      candidates.push({
        label: `${scope.as}.${field.name}`,
        value: { $bind: `${scope.as}.${field.name}` },
      });
  }
  const known = new Set(
    validateView(prepare(document), catalog, { resolveView }).diagnostics.map(
      (diagnostic) => `${diagnostic.code} ${diagnostic.path}`,
    ),
  );
  return candidates.filter((candidate) =>
    validateView(
      prepare(setField(document, id, prop, path, candidate.value)),
      catalog,
      { resolveView },
    ).diagnostics.every((diagnostic) =>
      known.has(`${diagnostic.code} ${diagnostic.path}`),
    ),
  );
}

// KF-ZW633Z: one validation of the document being edited serves every
// candidate an edit is checked against (each Embed in container, each drop
// place), instead of one per candidate.
const COUNTED = new WeakMap<
  ViewDocument,
  WeakMap<ViewCatalog, ReadonlyMap<string, number>>
>();

/** `document`'s problems, counted by code and message. */
function problemCounts(
  document: ViewDocument,
  catalog: ViewCatalog,
): ReadonlyMap<string, number> {
  let byCatalog = COUNTED.get(document);
  if (!byCatalog) COUNTED.set(document, (byCatalog = new WeakMap()));
  let counts = byCatalog.get(catalog);
  if (!counts) {
    const map = new Map<string, number>();
    for (const { code, message } of validateView(document, catalog).diagnostics)
      map.set(`${code} ${message}`, (map.get(`${code} ${message}`) ?? 0) + 1);
    byCatalog.set(catalog, (counts = map));
  }
  return counts;
}

/**
 * Whether `next` has a problem `before` does not. Problems compare by code and
 * message, counted, because wrapping a node moves its existing problems to
 * new paths without adding any. Problems `ignore` accepts do not count.
 */
export function addsProblems(
  before: ViewDocument,
  next: ViewDocument,
  catalog: ViewCatalog,
  ignore: (diagnostic: { code: string; message: string }) => boolean = () =>
    false,
): boolean {
  const counts = new Map(problemCounts(before, catalog));
  return validateView(next, catalog).diagnostics.some((diagnostic) => {
    if (ignore(diagnostic)) return false;
    const { code, message } = diagnostic;
    const left = counts.get(`${code} ${message}`) ?? 0;
    counts.set(`${code} ${message}`, left - 1);
    return left <= 0;
  });
}
