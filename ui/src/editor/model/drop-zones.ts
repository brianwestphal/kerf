// Smarter drop targeting (KF-WKABP2). A drag over a container that has more
// than one zone the dragged node can go into shows each zone where it sits
// (a Workbench's left rail on its left, its header band on top), so where
// the pointer rests picks the zone; and a node alone in a zone that holds
// one child can be replaced by the drop. Zones with no layout here are
// offered in a menu instead.
import type { ViewCatalog, ViewDocument, ViewNode } from '@kerfjs/ui/view';

import { seedLabel } from './controls.js';
import { findNode } from './document.js';
import { unfilled } from './drop.js';
import {
  addsProblems,
  insertNode,
  ownFilledFields,
  placeChild,
  type Placement,
  placementOf,
  removeNode,
  withCatalog,
} from './edits.js';

/**
 * Where a zone sits in its container, as fractions of the container's box:
 * the region a drag rests in to drop into that zone.
 */
export interface ZoneRegion {
  readonly zone: string;
  /** What the zone is called where a drop caption names it. */
  readonly title: string;
  /**
   * The part of the rendered container that shows this zone, when it
   * renders one (a Workbench's left rail), whose real box the region takes.
   */
  readonly part?: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const RAIL = 0.24;
const BAND = 0.16;
const CENTER = 1 - 2 * RAIL;

/**
 * Each multi-panel layout's zones laid out as it renders them, by component
 * id (the catalog key after the package). A zone absent from the document
 * (a Workbench's rails before they are set) still has its region, so the
 * drop that fills it has somewhere to rest.
 */
const LAYOUTS: Readonly<Record<string, readonly ZoneRegion[]>> = {
  // The work area between the rails: header band, main, footer band, and
  // the bottom drawer, top to bottom.
  workbench: [
    {
      zone: 'leftRail.content',
      title: 'Left rail',
      part: '.kui-workbench__rail--left',
      left: 0,
      top: 0,
      width: RAIL,
      height: 1,
    },
    {
      zone: 'rightRail.content',
      title: 'Right rail',
      part: '.kui-workbench__rail--right',
      left: 1 - RAIL,
      top: 0,
      width: RAIL,
      height: 1,
    },
    {
      zone: 'mainHeader',
      title: 'Header',
      left: RAIL,
      top: 0,
      width: CENTER,
      height: BAND,
    },
    {
      zone: 'main',
      title: 'Main',
      left: RAIL,
      top: BAND,
      width: CENTER,
      height: 0.48,
    },
    {
      zone: 'mainFooter',
      title: 'Footer',
      left: RAIL,
      top: 0.64,
      width: CENTER,
      height: BAND,
    },
    {
      zone: 'bottomDrawer.content',
      title: 'Bottom drawer',
      part: '.kui-workbench__drawer',
      left: RAIL,
      top: 0.8,
      width: CENTER,
      height: 0.2,
    },
  ],
  'split-view': [
    {
      zone: 'list',
      title: 'List',
      part: '.kui-split-view__list',
      left: 0,
      top: 0,
      width: 0.34,
      height: 1,
    },
    {
      zone: 'detail',
      title: 'Detail',
      part: '.kui-split-view__detail',
      left: 0.34,
      top: 0,
      width: 0.66,
      height: 1,
    },
  ],
};

/** What zone `zone` of component `type` is called, if its layout names it. */
export function zoneTitle(type: string, zone: string): string | undefined {
  return zoneRegions(type)?.find((region) => region.zone === zone)?.title;
}

/** The zone layout of component `type`, if the editor knows it. */
export function zoneRegions(type: string): readonly ZoneRegion[] | undefined {
  return LAYOUTS[type.slice(type.indexOf(':') + 1)];
}

/** A box in client coordinates. */
export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The boxes of component `type`'s zones over its rendered `container` box,
 * following what renders: a zone whose part renders (`partBox` answers for
 * its selector) takes that part's box, and any other takes its region of
 * the container. In a Workbench, the header, main, and footer bands split
 * the column left between its rails, above its drawer, as it lays them out.
 */
export function layoutZones(
  type: string,
  container: Box,
  partBox: (selector: string) => Box | undefined,
): { readonly zone: string; readonly box: Box }[] {
  const regions = zoneRegions(type) ?? [];
  const fraction = (region: ZoneRegion): Box => ({
    left: container.left + region.left * container.width,
    top: container.top + region.top * container.height,
    width: region.width * container.width,
    height: region.height * container.height,
  });
  const boxes = new Map(
    regions.map((region) => [
      region.zone,
      (region.part && partBox(region.part)) || fraction(region),
    ]),
  );
  if (type.endsWith(':workbench')) {
    const left = boxes.get('leftRail.content')!;
    const right = boxes.get('rightRail.content')!;
    const start = left.left + left.width;
    const width = right.left - start;
    const drawer = partBox('.kui-workbench__drawer') ?? {
      left: start,
      top: container.top + 0.8 * container.height,
      width,
      height: 0.2 * container.height,
    };
    const column = drawer.top - container.top;
    const band = BAND * container.height;
    boxes.set('bottomDrawer.content', drawer);
    boxes.set('mainHeader', {
      left: start,
      top: container.top,
      width,
      height: band,
    });
    boxes.set('main', {
      left: start,
      top: container.top + band,
      width,
      height: column - 2 * band,
    });
    boxes.set('mainFooter', {
      left: start,
      top: container.top + column - band,
      width,
      height: band,
    });
  }
  return regions.map((region) => ({
    zone: region.zone,
    box: boxes.get(region.zone)!,
  }));
}

/**
 * The region holding point (`x`, `y`), as fractions of the container's box,
 * among `regions`; the nearest one when none holds it.
 */
export function regionAt<Region extends ZoneRegion>(
  regions: readonly Region[],
  x: number,
  y: number,
): Region | undefined {
  let best: Region | undefined;
  let distance = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    const dx = Math.max(region.left - x, 0, x - region.left - region.width);
    const dy = Math.max(region.top - y, 0, y - region.top - region.height);
    const away = Math.hypot(dx, dy);
    if (away < distance) {
      distance = away;
      best = region;
    }
  }
  return best;
}

interface ZoneCatalogEntry {
  readonly zones?: readonly {
    readonly id: string;
    readonly cardinality: { readonly max: number | 'unbounded' };
  }[];
}

/**
 * Where node `id` sits when it is the only child a zone can hold (a
 * Workbench's `main`, a SplitView's `detail`): the place a drop replacing it
 * fills. Undefined for the root, a node in a zone that takes more, or one
 * inside a repeat or a condition.
 */
export function singleChildPlace(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
): Placement | undefined {
  const place = placementOf(document, id);
  if (!place) return undefined;
  const parent = findNode(document, place.parent)!.node;
  const entry = catalog.entries.get(parent.type) as
    ZoneCatalogEntry | undefined;
  const zone = entry?.zones?.find((item) => item.id === place.zone);
  return zone?.cardinality.max === 1 ? place : undefined;
}

/**
 * Whether node `id` is the untouched placeholder a new container was seeded
 * with ("Main" in a Workbench's `main`): the catalog's Text naming its zone,
 * with nothing else set. Replacing one asks no confirmation.
 */
export function isSeedPlaceholder(
  document: ViewDocument,
  id: string,
  componentName: (key: string) => string,
): boolean {
  const visit = findNode(document, id);
  const holder = visit?.ancestors.at(-1);
  if (!visit || !holder) return false;
  const { node } = visit;
  const text = `${holder.node.type.slice(0, holder.node.type.indexOf(':'))}:text`;
  const props = Object.keys(node.props ?? {});
  return (
    node.type === text &&
    !node.name &&
    !node.zones &&
    props.length === 1 &&
    node.props!.children ===
      seedLabel(holder.zone, componentName(holder.node.type))
  );
}

/** What a replacing drop puts in place: a new node, or a node moved. */
export type Replacement =
  { readonly node: ViewNode } | { readonly moved: string };

/**
 * The document with node `target` replaced by `by` at its place, or
 * undefined when that is not a legal edit: `target` holds no single-child
 * place, `by` moves into its own subtree, or the result adds a problem. A
 * new node may still lack the required values the inspector then asks
 * for, as an added node may (`unfilled`).
 */
export function replaceNode(
  document: ViewDocument,
  catalog: ViewCatalog,
  target: string,
  by: Replacement,
): ViewDocument | undefined {
  const at = singleChildPlace(document, catalog, target);
  if (!at) return undefined;
  if ('moved' in by) {
    if (
      by.moved === target ||
      findNode(document, target)!.ancestors.some(
        ({ node }) => node.id === by.moved,
      )
    )
      return undefined;
  }
  const without = removeNode(document, target);
  let next: ViewDocument;
  if ('node' in by) {
    next = withCatalog(
      insertNode(without, at.parent, at.zone, by.node, at.index),
      by.node.type,
    );
  } else {
    const from = placementOf(without, by.moved);
    if (!from) return undefined;
    next = placeChild(without, from, at).document;
  }
  next = ownFilledFields(next, catalog);
  return addsProblems(
    document,
    next,
    catalog,
    (diagnostic) => 'node' in by && unfilled(diagnostic, by.node.type),
  )
    ? undefined
    : next;
}
