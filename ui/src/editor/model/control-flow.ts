// Control flow from the inspector (KF-90GTJN): show a node only when a
// condition holds (`$if`), repeat it for each item of a list (`$each`), and
// place application-filled `$slot` holes. Every edit is a pure transform, like
// the edits in edits.ts, and the validator decides which sources fit.
import {
  validateView,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
  type ViewType,
  type ViewValue,
} from '@kerfjs/ui/view';

import type { BindingOption } from './edits.js';
import { eachScopes } from './edits.js';

const CAMEL = /^[a-z][A-Za-z0-9]*$/;

/** How a node repeats: the list it iterates, the item's name, its row key. */
export interface Repeat {
  readonly source: ViewValue;
  readonly as: string;
  readonly key: string;
}

/**
 * The control flow around a node the inspector can edit: an optional
 * condition (`$if`, outermost) and an optional repeat (`$each`, innermost).
 */
export interface NodeControl {
  readonly condition?: ViewValue;
  readonly repeat?: Repeat;
}

type Owner = {
  readonly list: ViewChild[];
  readonly index: number;
  readonly node: ViewNode;
} & NodeControl;

const isNode = (child: ViewChild): child is ViewNode =>
  !('$each' in child) && !('$if' in child) && !('$slot' in child);

/**
 * Where node `id` sits in a zone list, with the control flow around it. Only
 * the shapes the inspector writes are editable — the node itself, `$each`
 * around it, `$if` around either — so a node in an `else` branch or under a
 * nested `$if` has no owner here and its control flow stays in the file.
 */
function ownerOf(document: ViewDocument, id: string): Owner | undefined {
  const match = (child: ViewChild): NodeControl | undefined => {
    if (isNode(child)) return child.id === id ? {} : undefined;
    if ('$each' in child)
      return child.template.id === id
        ? { repeat: { source: child.$each, as: child.as, key: child.key } }
        : undefined;
    if ('$if' in child && !child.else) {
      const inner = match(child.then);
      return inner && !('condition' in inner)
        ? { condition: child.$if, ...inner }
        : undefined;
    }
    return undefined;
  };
  const visit = (node: ViewNode): Owner | undefined => {
    for (const children of Object.values(node.zones ?? {})) {
      const list = children as ViewChild[];
      for (const [index, child] of list.entries()) {
        const found = match(child);
        if (found) return { list, index, node: nodeIn(child), ...found };
        for (const inner of nodesUnder(child)) {
          const deeper = visit(inner);
          if (deeper) return deeper;
        }
      }
    }
    return undefined;
  };
  return visit(document.root);
}

/** The node a matched child holds. */
function nodeIn(child: ViewChild): ViewNode {
  if (isNode(child)) return child;
  if ('$each' in child) return child.template;
  return nodeIn((child as { then: ViewChild }).then);
}

/** The nodes directly under a zone child, through its control flow. */
function nodesUnder(child: ViewChild): ViewNode[] {
  if ('$slot' in child) return [];
  if ('$each' in child) return [child.template];
  if ('$if' in child)
    return [
      ...nodesUnder(child.then),
      ...(child.else ? nodesUnder(child.else) : []),
    ];
  return [child];
}

const clone = (document: ViewDocument): ViewDocument =>
  globalThis.structuredClone(document);

/**
 * The editable control flow around node `id`, or undefined when the inspector
 * cannot edit it (the root, or a shape it does not write).
 */
export function controlOf(
  document: ViewDocument,
  id: string,
): NodeControl | undefined {
  const owner = ownerOf(document, id);
  if (!owner) return undefined;
  const { condition, repeat } = owner;
  return {
    ...(condition !== undefined ? { condition } : {}),
    ...(repeat ? { repeat } : {}),
  };
}

/** Rewrites node `id`'s control flow; unchanged when it has no editable owner. */
function withControl(
  document: ViewDocument,
  id: string,
  change: (current: NodeControl) => NodeControl,
): ViewDocument {
  const next = clone(document);
  const owner = ownerOf(next, id);
  if (!owner) return document;
  const { condition, repeat } = change(owner);
  const inner: ViewChild = repeat
    ? {
        $each: repeat.source,
        as: repeat.as,
        key: repeat.key,
        template: owner.node,
      }
    : owner.node;
  owner.list[owner.index] =
    condition !== undefined ? { $if: condition, then: inner } : inner;
  return next;
}

/** Shows node `id` only while `condition` holds; `undefined` always shows it. */
export function setCondition(
  document: ViewDocument,
  id: string,
  condition: ViewValue | undefined,
): ViewDocument {
  return withControl(document, id, ({ repeat }) => ({
    ...(condition !== undefined ? { condition } : {}),
    ...(repeat ? { repeat } : {}),
  }));
}

/** Repeats node `id` for each item of a list; `undefined` stops repeating. */
export function setRepeat(
  document: ViewDocument,
  id: string,
  repeat: Repeat | undefined,
): ViewDocument {
  return withControl(document, id, ({ condition }) => ({
    ...(condition !== undefined ? { condition } : {}),
    ...(repeat ? { repeat } : {}),
  }));
}

/** Points every `$bind` that starts at item `from` at item `to` instead. */
function renameBindings<T>(value: T, from: string, to: string): T {
  if (Array.isArray(value))
    return value.map((item) => renameBindings(item, from, to)) as T;
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value).map(([key, inner]) => {
    if (
      key === '$bind' &&
      typeof inner === 'string' &&
      (inner === from || inner.startsWith(`${from}.`))
    )
      return [key, to + inner.slice(from.length)];
    return [key, renameBindings(inner, from, to)];
  });
  return Object.fromEntries(entries) as T;
}

/**
 * Renames a repeated node's item, and every binding to it inside the row, so
 * the row keeps reading the same fields.
 */
export function renameItem(
  document: ViewDocument,
  id: string,
  as: string,
): { document: ViewDocument } | { error: string } {
  if (!CAMEL.test(as))
    return { error: 'An item name is a camelCase identifier.' };
  const repeat = controlOf(document, id)?.repeat;
  if (!repeat) return { error: 'This node does not repeat.' };
  const next = clone(document);
  const owner = ownerOf(next, id)!;
  const renamed = renameBindings(owner.node, repeat.as, as);
  Object.assign(owner.node, renamed);
  const result = withControl(next, id, ({ condition }) => ({
    ...(condition !== undefined ? { condition } : {}),
    repeat: {
      source: repeat.source,
      as,
      key: renameBindings({ $bind: repeat.key }, repeat.as, as).$bind,
    },
  }));
  return { document: result };
}

/**
 * Whether `next` has a problem `before` does not. Problems compare by code and
 * message, counted, because wrapping a node moves its existing problems to
 * new paths without adding any.
 */
function addsProblems(
  before: ViewDocument,
  next: ViewDocument,
  catalog: ViewCatalog,
): boolean {
  const counts = new Map<string, number>();
  for (const { code, message } of validateView(before, catalog).diagnostics)
    counts.set(
      `${code} ${message}`,
      (counts.get(`${code} ${message}`) ?? 0) + 1,
    );
  return validateView(next, catalog).diagnostics.some(({ code, message }) => {
    const left = counts.get(`${code} ${message}`) ?? 0;
    counts.set(`${code} ${message}`, left - 1);
    return left <= 0;
  });
}

/** The type of an object list's items, or undefined. */
function objectItems(type: ViewType | undefined): ViewType | undefined {
  return type?.kind === 'array' && type.items?.kind === 'object'
    ? type.items
    : undefined;
}

/**
 * Params and in-scope item fields, as bind candidates, with each one's type.
 * `items` adds each `$each` item itself (a slot can take a whole row).
 */
function sources(
  document: ViewDocument,
  id: string,
  items = false,
): (BindingOption & { readonly type?: ViewType })[] {
  const params = document.params ?? {};
  const found: (BindingOption & { readonly type?: ViewType })[] =
    Object.entries(params).map(([name, param]) => ({
      label: `Param ${name}`,
      value: { $param: name },
      type: param.type,
    }));
  for (const scope of eachScopes(document, id)) {
    const source = scope.source as { $param?: string };
    const item = objectItems(
      source.$param ? params[source.$param]?.type : undefined,
    );
    if (!item) continue;
    if (items)
      found.push({
        label: `Item ${scope.as}`,
        value: { $bind: scope.as },
        type: item,
      });
    for (const field of item.props ?? [])
      found.push({
        label: `${scope.as}.${field.name}`,
        value: { $bind: `${scope.as}.${field.name}` },
        type: field.type,
      });
  }
  return found;
}

/**
 * The params and item fields that can decide whether node `id` shows: each
 * one the validator accepts as its `$if` condition.
 */
export function conditionOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
): BindingOption[] {
  if (!ownerOf(document, id)) return [];
  return sources(document, id)
    .filter(
      ({ value }) =>
        !addsProblems(document, setCondition(document, id, value), catalog),
    )
    .map(({ label, value }) => ({ label, value }));
}

/** A row item's name for a list: `orders` → `order`, else `item`. */
export function itemNameFor(list: string, taken: ReadonlySet<string>): string {
  const last = list.split('.').at(-1)!;
  const singular = last.endsWith('ies')
    ? `${last.slice(0, -3)}y`
    : last.endsWith('s') && last.length > 1
      ? last.slice(0, -1)
      : 'item';
  return taken.has(singular) || !CAMEL.test(singular) ? 'item' : singular;
}

/** The field a row is keyed by: `id`, `key`, or the first string or number. */
function keyField(item: ViewType): string | undefined {
  const fields = item.props ?? [];
  const keyable = fields.filter((field) =>
    ['string', 'number'].includes(field.type.kind),
  );
  return (
    keyable.find((field) => field.name === 'id' || field.name === 'key') ??
    keyable[0]
  )?.name;
}

/** A list node `id` can repeat over, with the item name and key it would use. */
export interface RepeatOption extends Repeat {
  readonly label: string;
}

/**
 * The object lists node `id` can repeat over — list params and in-scope list
 * fields — each with a suggested item name and row key, kept only when the
 * validator accepts the repeat.
 */
export function repeatOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
): RepeatOption[] {
  if (!ownerOf(document, id)) return [];
  const scopes = eachScopes(document, id);
  const own = controlOf(document, id)?.repeat?.as;
  const taken = new Set([
    ...Object.keys(document.params ?? {}),
    ...scopes.map((scope) => scope.as).filter((name) => name !== own),
  ]);
  const options: RepeatOption[] = [];
  for (const candidate of sources(document, id)) {
    const item = objectItems(candidate.type);
    const field = item && keyField(item);
    if (!field) continue;
    const path =
      '$param' in (candidate.value as object)
        ? (candidate.value as { $param: string }).$param
        : (candidate.value as { $bind: string }).$bind;
    const as = itemNameFor(path, taken);
    const repeat = { source: candidate.value, as, key: `${as}.${field}` };
    if (!addsProblems(document, setRepeat(document, id, repeat), catalog))
      options.push({ label: candidate.label, ...repeat });
  }
  return options;
}

/** Where a `$slot` sits: its parent node, zone, and index in that zone. */
export interface SlotAddress {
  readonly parent: string;
  readonly zone: string;
  readonly index: number;
}

/** The zone list of node `parent`'s `zone` in a (cloned, mutable) document. */
function zoneList(
  document: ViewDocument,
  parent: string,
  zone: string,
): ViewChild[] | undefined {
  return findHolder(document, parent)?.zones?.[zone] as ViewChild[] | undefined;
}

/** The `$slot` at `address`, or undefined. */
export function slotAt(
  document: ViewDocument,
  address: SlotAddress,
):
  | {
      readonly $slot: string;
      readonly input?: Readonly<Record<string, ViewValue>>;
    }
  | undefined {
  const child = zoneList(document, address.parent, address.zone)?.[
    address.index
  ];
  return child && '$slot' in child ? child : undefined;
}

/**
 * Adds a `$slot` named `name` to `zone` of node `parent`, declaring the slot
 * when the document does not yet. With `passItem`, a new slot inside a
 * repeated row takes the row's item as its input.
 */
export function insertSlot(
  document: ViewDocument,
  parent: string,
  zone: string,
  name: string,
  passItem = false,
): { document: ViewDocument; address: SlotAddress } | { error: string } {
  if (!CAMEL.test(name))
    return { error: 'A slot name is a camelCase identifier.' };
  const next = clone(document) as ViewDocument & {
    slots?: Record<string, { input?: ViewType }>;
  };
  const params = next.params ?? {};
  const row = eachScopes(next, parent).at(-1);
  const item =
    passItem && row
      ? objectItems(
          params[(row.source as { $param?: string }).$param ?? '']?.type,
        )
      : undefined;
  let slot: { $slot: string; input?: Record<string, ViewValue> } = {
    $slot: name,
  };
  if (!next.slots?.[name]) {
    (next as { slots?: object }).slots = {
      ...(next.slots ?? {}),
      [name]:
        item && row
          ? {
              input: {
                kind: 'object',
                props: [{ name: row.as, type: item, required: true }],
              },
            }
          : {},
    };
    if (item && row)
      slot = { $slot: name, input: { [row.as]: { $bind: row.as } } };
  }
  const holder = findHolder(next, parent);
  if (!holder) return { error: `No node ${parent}.` };
  const zones = { ...(holder.zones ?? {}) } as Record<string, ViewChild[]>;
  const list = [...(zones[zone] ?? []), slot];
  zones[zone] = list;
  (holder as { zones?: object }).zones = zones;
  return { document: next, address: { parent, zone, index: list.length - 1 } };
}

/** Node `id` in a (cloned, mutable) document. */
function findHolder(document: ViewDocument, id: string): ViewNode | undefined {
  const visit = (node: ViewNode): ViewNode | undefined => {
    if (node.id === id) return node;
    for (const children of Object.values(node.zones ?? {}))
      for (const child of children)
        for (const inner of nodesUnder(child)) {
          const found = visit(inner);
          if (found) return found;
        }
    return undefined;
  };
  return visit(document.root);
}

/** Every `$slot` name the document places. */
function placedSlots(document: ViewDocument): Set<string> {
  const names = new Set<string>();
  const child = (item: ViewChild) => {
    if ('$slot' in item) names.add(item.$slot);
    else if ('$each' in item) node(item.template);
    else if ('$if' in item) {
      child(item.then);
      if (item.else) child(item.else);
    } else node(item);
  };
  const node = (item: ViewNode) => {
    for (const children of Object.values(item.zones ?? {}))
      children.forEach(child);
  };
  node(document.root);
  return names;
}

/**
 * Removes the `$slot` at `address`, and the slot's declaration when no other
 * place uses it.
 */
export function removeSlot(
  document: ViewDocument,
  address: SlotAddress,
): ViewDocument {
  const next = clone(document);
  const list = zoneList(next, address.parent, address.zone);
  const child = list?.[address.index];
  if (!list || !child || !('$slot' in child)) return document;
  list.splice(address.index, 1);
  const slots = (next as { slots?: Record<string, unknown> }).slots;
  if (!placedSlots(next).has(child.$slot) && slots?.[child.$slot]) {
    delete slots[child.$slot];
    if (!Object.keys(slots).length) delete (next as { slots?: unknown }).slots;
  }
  return next;
}

/** Sets (or, with `undefined`, clears) one input of the `$slot` at `address`. */
export function setSlotInput(
  document: ViewDocument,
  address: SlotAddress,
  name: string,
  value: ViewValue | undefined,
): ViewDocument {
  const next = clone(document);
  const child = zoneList(next, address.parent, address.zone)?.[address.index];
  if (!child || !('$slot' in child)) return document;
  const slot = child as { input?: Record<string, ViewValue> };
  const input = { ...(slot.input ?? {}) };
  if (value === undefined) delete input[name];
  else input[name] = value;
  if (Object.keys(input).length) slot.input = input;
  else delete slot.input;
  return next;
}

/** The declared inputs of the `$slot` at `address`. */
export function slotInputs(
  document: ViewDocument,
  address: SlotAddress,
): readonly { readonly name: string; readonly required: boolean }[] {
  const slot = slotAt(document, address);
  return slot ? (document.slots?.[slot.$slot]?.input?.props ?? []) : [];
}

/**
 * The params, items, and item fields that can fill input `name` of the
 * `$slot` at `address`: each one the validator accepts there.
 */
export function slotInputOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  address: SlotAddress,
  name: string,
): BindingOption[] {
  if (!slotAt(document, address)) return [];
  return sources(document, address.parent, true)
    .filter(
      ({ value }) =>
        !addsProblems(
          document,
          setSlotInput(document, address, name, value),
          catalog,
        ),
    )
    .map(({ label, value }) => ({ label, value }));
}
