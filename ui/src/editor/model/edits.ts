// Document edits (KF-KX77TV: editor editing). Every edit is a pure transform
// that returns a new document, so the document stays the editor's only state
// and history is a list of documents.
import {
  validateView,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import { visitNodes } from './document.js';

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

/** Finds a node by id in a (cloned, mutable) document. */
function locate(document: ViewDocument, id: string) {
  let found:
    | {
        node: MutableNode;
        list?: ViewChild[];
        index?: number;
        parent?: MutableNode;
        zone?: string;
      }
    | undefined;
  const visitChild = (
    item: ViewChild,
    list: ViewChild[],
    index: number,
    parent: MutableNode,
    zone: string,
    branch = false,
  ): void => {
    if ('$each' in item)
      visitNode(
        item.template as MutableNode,
        undefined,
        undefined,
        parent,
        zone,
      );
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
    if (found || !node || typeof node !== 'object' || !('type' in node)) return;
    if (node.id === id) {
      found = { node, list, index, parent, zone };
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
  return found;
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
 * document must before it uses one of its components.
 */
export function withCatalog(document: ViewDocument, key: string): ViewDocument {
  const pkg = key.slice(0, key.lastIndexOf(':'));
  return document.catalogs.includes(pkg)
    ? document
    : { ...document, catalogs: [...document.catalogs, pkg] };
}

/**
 * Removes a node. Only a node placed directly in a zone list can be removed;
 * the root, `$each` templates, and `$if` branches belong to their structure.
 */
export function removeNode(document: ViewDocument, id: string): ViewDocument {
  const next = clone(document);
  const found = locate(next, id);
  if (!found?.list || found.index === undefined)
    throw new Error(`node ${id} cannot be removed`);
  found.list.splice(found.index, 1);
  return next;
}

/** Whether `removeNode` / `moveNode` can act on a node. */
export function isMovable(
  document: ViewDocument,
  id: string,
): { up: boolean; down: boolean; remove: boolean } {
  const found = locate(clone(document), id);
  if (!found?.list || found.index === undefined)
    return { up: false, down: false, remove: false };
  return {
    up: found.index > 0,
    down: found.index < found.list.length - 1,
    remove: true,
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
 * Turns a prop into a document input: adds a param named `param` (its current
 * literal becomes the default) and points the prop at it.
 */
export function promoteToParam(
  document: ViewDocument,
  id: string,
  prop: string,
  param: string,
  type: ViewType,
): { document: ViewDocument } | { error: string } {
  if (!CAMEL.test(param))
    return { error: 'A param name is a camelCase identifier.' };
  if (document.params && param in document.params)
    return { error: `There is already a param named ${param}.` };
  const node = locate(clone(document), id)?.node;
  if (!node) return { error: `No node ${id}.` };
  const current = node.props?.[prop];
  const literal =
    current !== undefined &&
    (current === null || typeof current !== 'object' || Array.isArray(current));
  const next = setProp(document, id, prop, { $param: param });
  const params = {
    ...(next.params ?? {}),
    [param]: literal ? { type, default: current } : { type },
  };
  return { document: { ...next, params } };
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
      ...(accepts.length ? { accepts } : {}),
      ...(full
        ? { disabledReason: `${zone.id} holds at most ${zone.cardinality.max}` }
        : {}),
    });
  }
  for (const prop of props) {
    if (prop.slot && !options.some((option) => option.key === prop.name))
      options.push({ key: prop.name });
  }
  return options;
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
            ? visit(item.template, [
                ...frames,
                { as: item.as, source: item.$each },
              ])
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
  return visit(document.root, []) ?? [];
}

/**
 * The params and in-scope `$each` item fields a prop of node `id` can be
 * bound to (KF-K5TKCV). Each candidate is kept only when the validator
 * accepts it there, so its scope and type rules decide.
 */
export function bindingOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  prop: string,
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
    validateView(document, catalog).diagnostics.map(
      (diagnostic) => `${diagnostic.code} ${diagnostic.path}`,
    ),
  );
  return candidates.filter((candidate) =>
    validateView(
      setProp(document, id, prop, candidate.value),
      catalog,
    ).diagnostics.every((diagnostic) =>
      known.has(`${diagnostic.code} ${diagnostic.path}`),
    ),
  );
}
