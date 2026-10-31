// The outline rail's rows: one per node, in document order.
import type { ViewChild, ViewDocument, ViewNode } from '@kerfjs/ui/view';

import { visitNodes } from './document.js';

export interface OutlineRow {
  readonly id: string;
  /** The author's name for the node, else its component name. */
  readonly label: string;
  /** Where it sits: the ancestor chain and zone, plus "repeated" for rows. */
  readonly detail: string;
  readonly depth: number;
}

/** A node's display name: `#text` runs show their text. */
export function nodeTitle(
  node: ViewNode,
  names: ReadonlyMap<string, string>,
): string {
  if (node.type === '#text') {
    const value = typeof node.value === 'string' ? node.value : 'bound text';
    return `Text “${value.length > 24 ? `${value.slice(0, 23).trimEnd()}…` : value}”`;
  }
  if (node.type === '#view') return `View ${node.src ?? ''}`.trim();
  return names.get(node.type) ?? node.type;
}

export function outlineRows(
  document: ViewDocument,
  names: ReadonlyMap<string, string>,
): OutlineRow[] {
  return visitNodes(document).map(({ node, ancestors, repeated }) => {
    const component = nodeTitle(node, names);
    const where = ancestors
      .map(
        ({ node: parent, zone }) =>
          `${parent.name ?? nodeTitle(parent, names)} › ${zone}`,
      )
      .join(' › ');
    const parts = [
      node.name ? component : undefined,
      where || 'Root',
      repeated ? 'repeated' : undefined,
    ];
    return {
      id: node.id,
      label: node.name ?? component,
      detail: parts.filter(Boolean).join(' · '),
      depth: ancestors.length,
    };
  });
}

/** One outline tree node: a document node with its children (KF-ECR4XG). */
export interface OutlineNode {
  readonly id: string;
  /** The author's name for the node, else its component name. */
  readonly label: string;
  /** The component (when the node is named), its zone, and its control flow. */
  readonly detail: string;
  readonly children?: OutlineNode[];
}

/**
 * How a zone key reads: a field zone's path with arrows (`leftRail ›
 * content`; KF-PD6QC5), its items counted from 1 as the item editors and
 * item slot rows count them (KF-3N67HR: `views.0.content` reads `views › 1
 * › content`), any other key as itself.
 */
export function zoneLabel(key: string): string {
  return key
    .split('.')
    .map((part) => (/^\d+$/.test(part) ? String(Number(part) + 1) : part))
    .join(' › ');
}

/** An outline row's id for the `$slot` at index `index` of a zone (KF-90GTJN). */
export function slotRowId(parent: string, zone: string, index: number): string {
  return `slot:${parent}:${zone}:${index}`;
}

/** The slot an outline row id names, or undefined for a node row. */
export function slotRowAddress(
  id: string,
): { parent: string; zone: string; index: number } | undefined {
  const [kind, parent, zone, index] = id.split(':');
  return kind === 'slot' && parent && zone && index
    ? { parent, zone, index: Number(index) }
    : undefined;
}

/**
 * An outline row id for the `$slot` at `path` inside node `node`'s prop
 * values (KF-SXDM56: item slots), such as `views › 1 › content`.
 */
export function itemSlotRowId(node: string, path: string): string {
  return `item-slot:${node}:${path}`;
}

/** The node an item slot row belongs to, or undefined for any other row. */
export function itemSlotRowNode(id: string): string | undefined {
  const [kind, node] = id.split(':');
  return kind === 'item-slot' ? node : undefined;
}

/**
 * A place in a node's props as a key that sorts in item order: the prop's
 * position, then each item index zero-padded, so `tabs.10` follows
 * `tabs.2`, then field names.
 */
const placeKey = (
  at: readonly (string | number)[],
  props: readonly string[],
): string =>
  [props.indexOf(String(at[0])), ...at.slice(1)]
    .map((part) =>
      typeof part === 'number' ? String(part).padStart(8, '0') : part,
    )
    .join('.');

/**
 * Every `$slot` inside `node`'s prop values, with its path in words and as
 * the 0-based place a field zone key spells.
 */
export function itemSlots(node: ViewNode): {
  readonly name: string;
  readonly path: string;
  readonly at: readonly (string | number)[];
}[] {
  const found: {
    name: string;
    path: string;
    at: readonly (string | number)[];
  }[] = [];
  const visit = (value: unknown, path: readonly (string | number)[]) => {
    if (Array.isArray(value))
      value.forEach((item, index) => visit(item, [...path, index + 1]));
    else if (value !== null && typeof value === 'object') {
      const { $slot } = value as { $slot?: unknown };
      if (typeof $slot === 'string')
        found.push({
          name: $slot,
          path: path.join(' › '),
          at: path.map((part) => (typeof part === 'number' ? part - 1 : part)),
        });
      else
        for (const [key, item] of Object.entries(value))
          visit(item, [...path, key]);
    }
  };
  for (const [name, value] of Object.entries(node.props ?? {}))
    visit(value, [name]);
  return found;
}

/** How a `$param` or `$bind` source reads in the outline. */
function sourceName(value: unknown): string {
  const source = value as { $param?: string; $bind?: string };
  return source.$param ?? source.$bind ?? 'a value';
}

/**
 * The document as a tree for the outline: each node under its parent, in
 * document order, with its condition (`$if`) and repeat (`$each`) in its
 * detail. A `$slot` is a row of its own (KF-90GTJN).
 */
export function outlineTree(
  document: ViewDocument,
  names: ReadonlyMap<string, string>,
): OutlineNode[] {
  const entry = (
    node: ViewNode,
    zone: string | undefined,
    repeated: boolean,
    control: readonly string[],
  ): OutlineNode => {
    const component = nodeTitle(node, names);
    // Content inside the node's props: item slots the application fills
    // (KF-SXDM56) and filled field zones, in item order (KF-KA5B40: tab 1's
    // content before tab 2's slot), then the node's own zones.
    const placed: { at: readonly (string | number)[]; rows: OutlineNode[] }[] =
      itemSlots(node).map(({ name, path, at }) => ({
        at,
        rows: [
          {
            id: itemSlotRowId(node.id, path),
            label: `${name} slot`,
            detail: path,
          },
        ],
      }));
    const own: OutlineNode[] = [];
    for (const [key, items] of Object.entries(node.zones ?? {})) {
      const rows = items.flatMap((item, index) =>
        child(item, node.id, key, index, repeated, []),
      );
      if (key.includes('.'))
        placed.push({
          at: key
            .split('.')
            .map((part) => (/^\d+$/.test(part) ? Number(part) : part)),
          rows,
        });
      else own.push(...rows);
    }
    const props = Object.keys(node.props ?? {});
    placed.sort((a, b) =>
      placeKey(a.at, props) < placeKey(b.at, props) ? -1 : 1,
    );
    const children = [...placed.flatMap(({ rows }) => rows), ...own];
    return {
      id: node.id,
      label: node.name ?? component,
      detail: [
        node.name ? component : undefined,
        zone === undefined ? 'Root' : zoneLabel(zone),
        ...control,
        repeated && !control.some((part) => part.startsWith('for each'))
          ? 'repeated'
          : undefined,
      ]
        .filter(Boolean)
        .join(' · '),
      ...(children.length ? { children } : {}),
    };
  };
  const child = (
    item: ViewChild,
    parent: string,
    zone: string,
    index: number,
    repeated: boolean,
    control: readonly string[],
  ): OutlineNode[] => {
    if ('$slot' in item)
      return [
        {
          id: slotRowId(parent, zone, index),
          label: `${item.$slot} slot`,
          detail: [
            zoneLabel(zone),
            ...control,
            repeated ? 'repeated' : undefined,
          ]
            .filter(Boolean)
            .join(' · '),
        },
      ];
    if ('$each' in item)
      return [
        entry(item.template, zone, true, [
          ...control,
          `for each ${item.as} in ${sourceName(item.$each)}`,
        ]),
      ];
    if ('$if' in item) {
      const condition = sourceName(item.$if);
      return [
        ...child(item.then, parent, zone, index, repeated, [
          ...control,
          `if ${condition}`,
        ]),
        ...(item.else
          ? child(item.else, parent, zone, index, repeated, [
              ...control,
              `unless ${condition}`,
            ])
          : []),
      ];
    }
    return [entry(item, zone, repeated, control)];
  };
  return [entry(document.root, undefined, false, [])];
}

/** Ids of every outline node with children, so a tree can start expanded. */
export function outlineParents(nodes: readonly OutlineNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children ? [node.id, ...outlineParents(node.children)] : [],
  );
}
