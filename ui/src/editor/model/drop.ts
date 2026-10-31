// Where a node can move (KF-WXP6AB: drag placement): the placement a drop on
// an outline row asks for, and the zones a node can move into from the
// inspector. The validator decides what is legal, so a move that would add a
// problem (a zone that does not accept the component, a full zone, a binding
// out of scope) is never offered.
import type {
  ViewCatalog,
  ViewChild,
  ViewDocument,
  ViewNode,
} from '@kerfjs/ui/view';

import { findNode, visitNodes } from './document.js';
import {
  addsProblems,
  insertNode,
  ownFilledFields,
  placeChild,
  type Placement,
  placementOf,
  placeNode,
  withCatalog,
} from './edits.js';
import { slotRowAddress } from './outline.js';

/** Where a dragged row lands: beside the target row, or inside it. */
export type DropPosition = 'before' | 'after' | 'inside';

/** A destination zone a node can move into, at its end. */
export interface MoveDestination {
  readonly label: string;
  readonly parent: string;
  readonly zone: string;
}

/**
 * Where an outline row's node or slot sits: a slot row's address, or the
 * place of a node directly in a zone.
 */
export function sourceOf(
  document: ViewDocument,
  id: string,
): Placement | undefined {
  return slotRowAddress(id) ?? placementOf(document, id);
}

/**
 * The placement dropping node or slot row `id` on outline row `target` at `position`
 * asks for, or undefined when that drop is not legal. Before and after land
 * beside a node or slot that sits directly in a zone; inside appends to the
 * first of `zonesOf(target)` that takes the node.
 */
export function dropPlacement(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  target: string,
  position: DropPosition,
  zonesOf: (node: ViewNode) => readonly string[],
): Placement | undefined {
  const from = sourceOf(document, id);
  if (!from) return undefined;
  return placementAt(document, target, position, zonesOf, (to) => {
    const next = placeChild(document, from, to).document;
    return (
      next !== document &&
      !addsProblems(document, ownFilledFields(next, catalog), catalog)
    );
  });
}

/**
 * Where dropping new node `node` (not yet in the document) on `target` at
 * `position` would insert it, or undefined when that is not legal (KF-78MHM8:
 * dragging a component from the palette).
 */
export function insertPlacement(
  document: ViewDocument,
  catalog: ViewCatalog,
  node: ViewNode,
  target: string,
  position: DropPosition,
  zonesOf: (node: ViewNode) => readonly string[],
): Placement | undefined {
  return placementAt(document, target, position, zonesOf, (to) => {
    // As adding does, the node's package joins the document's catalogs.
    const next = ownFilledFields(
      withCatalog(
        insertNode(document, to.parent, to.zone, node, to.index),
        node.type,
      ),
      catalog,
    );
    return !addsProblems(document, next, catalog, (diagnostic) =>
      unfilled(diagnostic, node.type),
    );
  });
}

/**
 * Whether `diagnostic` only says a new node of `type` is not filled in yet: a
 * required prop or variant it has no value for, or a zone short of its
 * minimum children (KF-DC23E9). Adding a child accepts these, and the
 * inspector then asks for them, so a drop accepts them too; where the node
 * may go (its parent, a full zone, a binding's scope) still decides.
 */
function unfilled(
  { code, message }: { code: string; message: string },
  type: string,
): boolean {
  switch (code) {
    case 'KUI-V004':
    case 'KUI-V005':
      return message.startsWith(`${type} `);
    case 'KUI-L203':
      // Its zones start empty; a full zone of a parent of the same type
      // reports what it found there instead.
      return (
        message.startsWith(`\`${type}\` zone `) && message.endsWith('found 0')
      );
    default:
      return false;
  }
}

/** The placement a drop on `target` at `position` asks for, if `legal`. */
function placementAt(
  document: ViewDocument,
  target: string,
  position: DropPosition,
  zonesOf: (node: ViewNode) => readonly string[],
  legal: (to: Placement) => boolean,
): Placement | undefined {
  if (position === 'inside') {
    const node = findNode(document, target)?.node;
    if (!node) return undefined;
    for (const zone of zonesOf(node)) {
      const to = {
        parent: node.id,
        zone,
        index: node.zones?.[zone]?.length ?? 0,
      };
      if (legal(to)) return to;
    }
    return undefined;
  }
  const beside = slotRowAddress(target) ?? besideOf(document, target);
  if (!beside) return undefined;
  const to = {
    ...beside,
    index: beside.index + (position === 'after' ? 1 : 0),
  };
  return legal(to) ? to : undefined;
}

/**
 * The zones node `id` can move into, at their end, other than its own zone:
 * each node's `zonesOf` keys the move leaves valid.
 */
export function moveDestinations(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
  zonesOf: (node: ViewNode) => readonly string[],
  title: (node: ViewNode) => string,
): MoveDestination[] {
  const from = placementOf(document, id);
  if (!from) return [];
  const destinations: MoveDestination[] = [];
  for (const { node } of visitNodes(document)) {
    for (const zone of zonesOf(node)) {
      if (node.id === from.parent && zone === from.zone) continue;
      const to = {
        parent: node.id,
        zone,
        index: node.zones?.[zone]?.length ?? 0,
      };
      const next = placeNode(document, id, to);
      if (
        next !== document &&
        !addsProblems(document, ownFilledFields(next, catalog), catalog)
      )
        destinations.push({
          label: `${node.name ?? title(node)} › ${zone}`,
          parent: node.id,
          zone,
        });
    }
  }
  return destinations;
}

/** Whether zone child `child` holds node `id`, through its control flow. */
function holds(child: ViewChild, id: string): boolean {
  if ('$slot' in child) return false;
  if ('$each' in child) return child.template.id === id;
  if ('$if' in child)
    return (
      holds(child.then, id) || (child.else ? holds(child.else, id) : false)
    );
  return child.id === id;
}

/**
 * The zone place of the child holding node `id`: the node itself, or the
 * condition or repeat around it, so a drop beside a repeated row or a
 * conditional node lands beside the whole of it.
 */
function besideOf(document: ViewDocument, id: string): Placement | undefined {
  const parent = findNode(document, id)?.ancestors.at(-1);
  if (!parent) return undefined;
  const index = parent.node.zones![parent.zone]!.findIndex((child) =>
    holds(child, id),
  );
  return { parent: parent.node.id, zone: parent.zone, index };
}
