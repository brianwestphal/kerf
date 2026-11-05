// KF-SFAA5R: the inspector's Move to list checks each destination with the
// scoped move check instead of validating the whole moved document. It must
// agree exactly with the full validation (`movesCleanly`, the old path, kept
// as the oracle): for every placed node of every document, real and
// generated, and every zone of every node. Where the scoped check cannot
// tell, it says so and the full validation decides, so the differential
// covers every answer it does give.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from 'node:process';

import {
  createMoveCheck,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { visitNodes } from '../../../src/editor/model/document.js';
import {
  moveDestinations,
  movesCleanly,
} from '../../../src/editor/model/drop.js';
import {
  addsProblems,
  legalZones,
  ownNode,
  placementOf,
  placeNode,
} from '../../../src/editor/model/edits.js';
import { fieldZoneKeys } from '../../../src/editor/model/fields.js';
import inbox from '../../fixtures/view/inbox.kui.json';
import { propsByKey, viewCatalog } from './kerf-catalog.js';
import { poolOf, scramble, seeded } from './move-fuzz.js';

const editorRoot = resolve(import.meta.dirname, '../../../../editor');
const samplesFolder = resolve(editorRoot, 'samples');
const read = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as ViewDocument;
const corpus: ViewDocument[] = [
  inbox as unknown as ViewDocument,
  read(resolve(editorRoot, 'src/sample.kui.json')),
  ...readdirSync(samplesFolder)
    .filter((file) => file.endsWith('.kui.json'))
    .sort()
    .map((file) => read(resolve(samplesFolder, file))),
];

/** The zones the editor offers a node: its catalog zones and field zones. */
const zoneKeys = (node: ViewNode): string[] => {
  const props = propsByKey.get(node.type)?.props ?? [];
  const zones = legalZones(
    node,
    viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
    props,
    new Set(viewCatalog.components.keys()),
  ).map((zone) => zone.key);
  const definitions = viewCatalog.components.get(node.type)?.definitions ?? {};
  return [...new Set([...zones, ...fieldZoneKeys(node, props, definitions)])];
};
const title = (node: ViewNode) => node.type;

interface Tally {
  decided: number;
  undecided: number;
  legal: number;
  mismatches: string[];
}

/**
 * Compares the scoped check with the full validation for `moving` nodes of
 * `document` (default: every placed node), over every zone `keysOf` gives.
 */
function compare(
  document: ViewDocument,
  tally: Tally,
  catalog: ViewCatalog = viewCatalog,
  moving?: (ids: string[]) => string[],
  keysOf: (node: ViewNode) => readonly string[] = zoneKeys,
) {
  const nodes = visitNodes(document).map((visit) => visit.node);
  const placed = nodes
    .map((node) => node.id)
    .filter((id) => placementOf(document, id));
  for (const id of moving ? moving(placed) : placed) {
    const from = placementOf(document, id)!;
    const check = createMoveCheck(document, catalog, id, {
      prepare: (node) => ownNode(node, catalog),
    });
    for (const target of nodes) {
      for (const zone of keysOf(target)) {
        if (target.id === from.parent && zone === from.zone) continue;
        const verdict = check(target.id, zone);
        if (verdict === undefined) {
          tally.undecided += 1;
          continue;
        }
        tally.decided += 1;
        const oracle = movesCleanly(document, catalog, id, target, zone);
        if (oracle) tally.legal += 1;
        if (verdict !== oracle)
          tally.mismatches.push(
            `${document.name}: ${id} → ${target.id} ${zone}: scoped ${verdict}, full ${oracle}`,
          );
      }
    }
  }
}

const tally = (): Tally => ({
  decided: 0,
  undecided: 0,
  legal: 0,
  mismatches: [],
});

describe('the scoped move check', () => {
  it('agrees with the full validation on every real document', () => {
    const result = tally();
    // A larger document compares about four of its nodes, spread through
    // it; the generated documents below compare every node.
    for (const document of corpus)
      compare(document, result, viewCatalog, (ids) =>
        ids.filter((_, index) => index % Math.ceil(ids.length / 4) === 0),
      );
    if (env.KERF_MOVE_FUZZ_REPORT)
      console.info(
        `real: ${JSON.stringify({ ...result, mismatches: result.mismatches.length })}`,
      );
    expect(result.mismatches).toEqual([]);
    expect(result.legal).toBeGreaterThan(500);
    expect(result.undecided).toBe(0);
  }, 60_000);

  // `KERF_MOVE_FUZZ_SEEDS=2000` soaks it. The default stays small, with
  // headroom for a loaded machine running the parallel coverage suite
  // (KF-KFR16N: 80 seeds once took 30-110s there against a 60s limit).
  const SEEDS = Number(env.KERF_MOVE_FUZZ_SEEDS ?? 40);
  it(`agrees with the full validation on ${SEEDS} generated documents`, () => {
    const pool = corpus.flatMap(poolOf);
    const context = { catalog: viewCatalog, pool, zoneKeys };
    // Small starting documents keep each case's full validations cheap.
    const starts = corpus.filter((document) => poolOf(document).length <= 16);
    const result = tally();
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const random = seeded(seed);
      const start = starts[Math.floor(random() * starts.length)]!;
      const document = scramble(
        seed % 3 ? start : (inbox as unknown as ViewDocument),
        context,
        random,
        4 + Math.floor(random() * 14),
      );
      compare(document, result);
    }
    if (env.KERF_MOVE_FUZZ_REPORT)
      console.info(
        `generated: ${JSON.stringify({ ...result, mismatches: result.mismatches.length })}`,
      );
    expect(result.mismatches).toEqual([]);
    // Most answers are the scoped check's own.
    expect(result.decided).toBeGreaterThan(result.undecided * 4);
    expect(result.legal).toBeGreaterThan(100);
  }, 180_000);

  it('answers a move into itself, and leaves repeated names and the root to the full validation', () => {
    const document = inbox as unknown as ViewDocument;
    const list = (document.root.zones!.content![0] as ViewNode).id;
    // A move into the node itself moves nothing.
    expect(createMoveCheck(document, viewCatalog, list)(list, 'children')).toBe(
      false,
    );
    // The root sits in no zone.
    expect(
      createMoveCheck(
        document,
        viewCatalog,
        document.root.id,
      )(list, 'children'),
    ).toBeUndefined();
    // A duplicate name's message quotes where the first one is.
    const twins = globalThis.structuredClone(document) as unknown as {
      root: { zones: Record<string, { name?: string }[]> };
    };
    twins.root.zones.content![0]!.name = 'twin';
    twins.root.zones.header![0]!.name = 'twin';
    expect(
      createMoveCheck(
        twins as unknown as ViewDocument,
        viewCatalog,
        list,
      )(document.root.id, 'footer'),
    ).toBeUndefined();
  });

  /** The full answer for a move, with `prepare` applied to every node. */
  function fullAnswer(
    document: ViewDocument,
    id: string,
    parent: string,
    zone: string,
    prepare: (node: ViewNode) => ViewNode,
  ): boolean {
    const target = visitNodes(document).find(
      ({ node }) => node.id === parent,
    )!.node;
    const next = placeNode(document, id, {
      parent,
      zone,
      index: target.zones?.[zone]?.length ?? 0,
    });
    const node = (item: ViewNode): ViewNode => {
      const own = prepare(item);
      return item.zones
        ? {
            ...own,
            zones: Object.fromEntries(
              Object.entries(item.zones).map(([key, list]) => [
                key,
                list.map((child) =>
                  'type' in child ? node(child as ViewNode) : child,
                ),
              ]),
            ),
          }
        : own;
    };
    return (
      next !== document &&
      !addsProblems(document, { ...next, root: node(next.root) }, viewCatalog)
    );
  }
  const id = (index: number) => String(index).padStart(26, '0');
  const text = (index: number, children = `Text ${index}`): ViewNode => ({
    id: id(index),
    type: '@kerfjs/ui:text',
    props: { children },
  });
  const pane = (zones: Record<string, ViewChild[]>): ViewDocument => ({
    schema: 'kerf-ui-document/v1',
    name: 'Probe',
    catalogs: ['@kerfjs/ui'],
    params: {
      tone: {
        type: { kind: 'prop', component: '@kerfjs/ui:button', prop: 'tone' },
      },
    },
    root: { id: id(1), type: '@kerfjs/ui:pane', zones },
  });

  it('leaves a move that changes a parent its children see to the full validation', () => {
    // Filling the chip makes it a link (KUI-V014 for the button already in
    // its icon), which the button's own place never shows.
    const chip: ViewNode = {
      id: id(2),
      type: '@kerfjs/ui:chip',
      zones: {
        icon: [
          { id: id(3), type: '@kerfjs/ui:button', props: { children: 'B' } },
        ],
      },
    };
    const document = pane({ content: [chip, text(4)] });
    const prepare = (node: ViewNode) =>
      node.type === '@kerfjs/ui:chip' && node.zones?.children?.length
        ? { ...node, props: { ...node.props, href: '#' } }
        : node;
    const check = createMoveCheck(document, viewCatalog, id(4), { prepare });
    expect(check(id(2), 'children')).toBeUndefined();
    expect(fullAnswer(document, id(4), id(2), 'children', prepare)).toBe(false);
  });

  it('counts a problem the preparation adds elsewhere', () => {
    const document = pane({ content: [text(2, 'Owned'), text(3)], header: [] });
    const prepare = (node: ViewNode) =>
      node.props?.children === 'Owned'
        ? { ...node, props: { ...node.props, unknownProp: 1 } }
        : node;
    const check = createMoveCheck(document, viewCatalog, id(3), { prepare });
    expect(fullAnswer(document, id(3), id(1), 'footer', prepare)).toBe(false);
    expect(check(id(1), 'footer')).toBe(false);
  });

  it('leaves a stale component read a move brings into view to the full validation', () => {
    // An unknown zone is not checked, so its `$if` reads the component only
    // once the list moves into a real zone.
    const list: ViewNode = {
      id: id(2),
      type: '@kerfjs/ui:list',
      zones: {
        children: [{ $if: { $param: 'tone' }, then: text(3) }],
      },
    };
    const document = pane({ nowhere: [list], content: [] });
    const check = createMoveCheck(document, viewCatalog, id(2), {
      prepare: (node) => ownNode(node, viewCatalog),
    });
    expect(check(id(1), 'content')).toBeUndefined();
  });

  it('decides a move inside a value a problem quotes (KF-20GMVX)', () => {
    // An invalid toolbar value's message names its field zones (`<zone …>`)
    // rather than quoting their nodes, so a move between them leaves the
    // panel's problem as it was, and the scoped check decides it.
    const document = read(
      resolve(samplesFolder, 'collapsible-panel-toolbar-relocation.kui.json'),
    ) as unknown as {
      root: { zones: { content: { zones: { children: ViewNode[] } }[] } };
    };
    const panel = document.root.zones.content[0]!.zones.children[0]!;
    (panel.props as { toolbar: Record<string, unknown> }).toolbar.nope = 1;
    const probe = document as unknown as ViewDocument;
    const button = id(12);
    const prepare = (node: ViewNode) => ownNode(node, viewCatalog);
    expect(fullAnswer(probe, button, id(8), 'children', prepare)).toBe(true);
    expect(
      createMoveCheck(probe, viewCatalog, button, { prepare })(
        id(8),
        'children',
      ),
    ).toBe(true);
  });

  it('checks the moved node again in each new scope', () => {
    // Two rows of the same depth and parent type, but only one names its item
    // `row`, which the moved node's own repeat reuses (KUI-V008).
    const item = (index: number): ViewNode => ({
      id: id(index),
      type: '@kerfjs/ui:content-item',
      zones: { children: [] },
    });
    const each = (as: string, template: ViewNode): ViewChild => ({
      $each: { $param: 'rows' },
      as,
      key: `${as}.id`,
      template,
    });
    const moved: ViewNode = {
      id: id(5),
      type: '@kerfjs/ui:content-item',
      zones: { children: [each('row', text(6))] },
    };
    const first = item(2);
    (first.zones!.children as ViewChild[]).push(moved);
    const document = {
      ...pane({
        content: [
          each('item', first),
          each('item', item(3)),
          each('row', item(4)),
        ],
      }),
      params: {
        rows: {
          type: {
            kind: 'array',
            items: {
              kind: 'object',
              props: [{ name: 'id', type: { kind: 'string' }, required: true }],
            },
          },
        },
      },
    } as ViewDocument;
    const prepare = (node: ViewNode) => ownNode(node, viewCatalog);
    const check = createMoveCheck(document, viewCatalog, id(5), { prepare });
    for (const target of [id(3), id(4)])
      expect(check(target, 'children')).toBe(
        fullAnswer(document, id(5), target, 'children', prepare),
      );
    expect(check(id(4), 'children')).toBe(false);
  });

  it('lists the same destinations as validating each move in full', () => {
    for (const seed of [3, 11, 19, 42]) {
      const document = scramble(
        inbox as unknown as ViewDocument,
        { catalog: viewCatalog, pool: corpus.flatMap(poolOf), zoneKeys },
        seeded(seed),
        10,
      );
      for (const { node } of visitNodes(document)) {
        if (!placementOf(document, node.id)) continue;
        const full = visitNodes(document).flatMap(({ node: target }) =>
          zoneKeys(target)
            .filter(
              (zone) =>
                !(
                  placementOf(document, node.id)!.parent === target.id &&
                  placementOf(document, node.id)!.zone === zone
                ) && movesCleanly(document, viewCatalog, node.id, target, zone),
            )
            .map((zone) => ({
              label: `${target.name ?? title(target)} › ${zone}`,
              parent: target.id,
              zone,
            })),
        );
        expect(
          moveDestinations(document, viewCatalog, node.id, zoneKeys, title),
        ).toEqual(full);
      }
    }
  });
});

/** A Pane holding `count` Text nodes, as the ticket measured. */
function flatPane(count: number): ViewDocument {
  const id = (index: number) => String(index).padStart(26, '0');
  return {
    schema: 'kerf-ui-document/v1',
    name: 'Flat',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: id(0),
      type: '@kerfjs/ui:pane',
      zones: {
        content: Array.from({ length: count }, (_, index) => ({
          id: id(index + 1),
          type: '@kerfjs/ui:text',
          props: { children: `Row ${index}` },
        })),
      },
    },
  };
}

describe('the Move to list', () => {
  /** Catalog lookups one `moveDestinations` call makes over `count` rows. */
  function lookups(count: number): number {
    let calls = 0;
    const components = new Proxy(viewCatalog.components, {
      get(target, key) {
        if (key === 'get')
          return (name: string) => {
            calls += 1;
            return target.get(name);
          };
        const value = Reflect.get(target, key, target) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const catalog = { ...viewCatalog, components } as ViewCatalog;
    const document = flatPane(count);
    const moved = (document.root.zones!.content![1] as ViewNode).id;
    const destinations = moveDestinations(
      document,
      catalog,
      moved,
      zoneKeys,
      title,
    );
    expect(destinations.length).toBeGreaterThan(0);
    return calls;
  }

  it('costs linear work in the document, not a validation per zone', () => {
    // Validating per destination grew as the square: 4× the rows cost 16×.
    const small = lookups(50);
    const large = lookups(200);
    expect(large / small).toBeLessThan(5);
  });
});
