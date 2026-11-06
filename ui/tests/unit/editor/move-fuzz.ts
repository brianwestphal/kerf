// KF-SFAA5R: random documents for the move-check differential test. Each one
// starts from a real document and takes seeded random edits, legal or not:
// moves into any zone, grafted subtrees, `$if` / `$each` / `$slot` wrappers,
// action uses in and out of rows, bindings, text runs, field-zone
// placeholders, prop-typed params read where the validator's component is
// stale, and repeated names. The aim is the shapes a hand-written case would
// not think of; the oracle is the full validation.
import {
  fieldZoneOf,
  type ViewCatalog,
  type ViewChild,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';

import { rowNodes } from '../../../src/editor/model/document.js';
import { copyChild, newNodeId } from '../../../src/editor/model/edits.js';
import { withValueAt } from '../../../src/editor/model/fields.js';

/** A seeded uniform random number in [0, 1) (mulberry32). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- a mutable JSON tree */
type Json = any;

interface Spot {
  readonly list: Json[];
  readonly index: number;
}

/** Every zone list entry and every node of a mutable document. */
function survey(root: Json) {
  const spots: Spot[] = [];
  const nodes: Json[] = [];
  const node = (item: Json) => {
    nodes.push(item);
    for (const list of Object.values(item.zones ?? {}) as Json[][])
      list.forEach((entry, index) => {
        spots.push({ list, index });
        child(entry);
      });
  };
  const child = (item: Json) => {
    if ('$each' in item) rowsIn(item).forEach(child);
    else if ('$if' in item) {
      child(item.then);
      if (item.else) child(item.else);
    } else if (!('$slot' in item)) node(item);
  };
  node(root);
  return { spots, nodes };
}

/** An `$each`'s templates: `template`, or each `templates` entry. */
const rowsIn = (each: Json): Json[] =>
  'templates' in each ? Object.values(each.templates) : [each.template];

/** Whether `inner` is `outer` or inside it. */
function within(outer: Json, inner: Json): boolean {
  if (outer === inner) return true;
  if ('$slot' in outer) return false;
  if ('$each' in outer)
    return rowsIn(outer).some((template) => within(template, inner));
  if ('$if' in outer)
    return (
      within(outer.then, inner) ||
      (outer.else ? within(outer.else, inner) : false)
    );
  return (Object.values(outer.zones ?? {}) as Json[][]).some((list) =>
    list.some((item) => within(item, inner)),
  );
}

export interface FuzzContext {
  readonly catalog: ViewCatalog;
  /** Nodes to graft, from every document in the corpus. */
  readonly pool: readonly ViewNode[];
  /** The zone keys a node offers, as the editor lists them. */
  readonly zoneKeys: (node: ViewNode) => readonly string[];
}

const ACTION = /^action$|[a-z]Action$/;

/** `document` after `steps` seeded random edits. */
export function scramble(
  document: ViewDocument,
  context: FuzzContext,
  random: () => number,
  steps: number,
): ViewDocument {
  const doc: Json = globalThis.structuredClone(document);
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(random() * items.length)]!;
  const makeId = () => newNodeId(1_700_000_000_000, random);
  const taken = new Set<string>(
    survey(doc.root).nodes.flatMap((node) =>
      typeof node.name === 'string' ? [node.name] : [],
    ),
  );
  const params: Json = (doc.params ??= {});
  params.rows ??= {
    type: {
      kind: 'array',
      items: {
        kind: 'object',
        props: [
          { name: 'id', type: { kind: 'string' }, required: true },
          { name: 'label', type: { kind: 'string' }, required: true },
          {
            name: 'items',
            type: {
              kind: 'array',
              items: {
                kind: 'object',
                props: [
                  { name: 'id', type: { kind: 'string' }, required: true },
                ],
              },
            },
            required: false,
          },
        ],
      },
    },
  };
  params.flag ??= { type: { kind: 'boolean' } };
  params.tone ??= {
    type: { kind: 'prop', component: '@kerfjs/ui:button', prop: 'tone' },
  };
  const graft = (): Json => copyChild(pick(context.pool), taken, makeId);
  const keysOf = (node: Json): string[] => [
    ...new Set([
      ...context.zoneKeys(node),
      ...Object.keys(node.zones ?? {}),
      ...(random() < 0.05 ? ['bogus'] : []),
    ]),
  ];
  const condition = () =>
    random() < 0.05
      ? { $param: 'tone' }
      : pick<Json>([
          true,
          { $param: 'flag' },
          { $bind: 'row.label' },
          { $bind: 'row.label' },
          'yes',
        ]);
  const componentProps = (node: Json): { name: string; type: Json }[] =>
    (context.catalog.components.get(node.type)?.component as Json)?.props ?? [];
  for (let step = 0; step < steps; step += 1) {
    const { spots, nodes } = survey(doc.root);
    const spot = spots.length ? pick(spots) : undefined;
    const entry = spot?.list[spot.index];
    const node = pick(nodes);
    switch (Math.floor(random() * 12)) {
      case 0:
      case 1: {
        // Move any zone child anywhere it does not hold.
        if (!spot || within(entry, node)) break;
        const keys = keysOf(node);
        if (!keys.length) break;
        spot.list.splice(spot.index, 1);
        const key = pick(keys);
        ((node.zones ??= {})[key] ??= []).push(entry);
        break;
      }
      case 2: {
        const keys = keysOf(node);
        if (keys.length) ((node.zones ??= {})[pick(keys)] ??= []).push(graft());
        break;
      }
      case 3:
        if (spot && !('$slot' in entry))
          spot.list[spot.index] = {
            $if: condition(),
            then: entry,
            ...(random() < 0.4 ? { else: graft() } : {}),
          };
        break;
      case 4:
        if (spot && 'type' in entry && !('$each' in entry)) {
          const as = pick(['row', 'item', 'row']);
          spot.list[spot.index] = {
            $each: pick<Json>([
              { $param: 'rows' },
              { $param: 'rows' },
              { $bind: 'row.items' },
              ['literal'],
            ]),
            as,
            key: `${as}.id`,
            // KF-1CRGP1: sometimes an `$if` chain of row designs, and
            // (KF-YX6HMT) sometimes a `templates` map picked by a kind.
            ...pick<Json>([
              { template: entry },
              { template: entry },
              { template: { $if: condition(), then: entry, else: graft() } },
              {
                templates: { default: entry, header: graft() },
                kind: { $bind: `${as}.label` },
              },
            ]),
          };
        }
        break;
      case 5: {
        // The same few action names, inside rows and out.
        const prop = componentProps(node).find(
          (item) => ACTION.test(item.name) && item.type?.kind === 'string',
        );
        if (prop)
          (node.props ??= {})[prop.name] = {
            $action: pick(['pick', 'open']),
          };
        break;
      }
      case 6: {
        const prop = componentProps(node).find((item) =>
          ['children', 'text', 'label'].includes(item.name),
        );
        if (prop)
          (node.props ??= {})[prop.name] = pick<Json>([
            { $bind: 'row.label' },
            { $param: 'flag' },
            { $bind: 'item.id' },
            'Plain',
          ]);
        break;
      }
      case 7: {
        const keys = keysOf(node);
        if (keys.length)
          ((node.zones ??= {})[pick(keys)] ??= []).push({
            id: makeId(),
            type: '#text',
            value:
              random() < 0.05
                ? { $param: 'tone' }
                : pick<Json>(['Hi', { $bind: 'row.label' }]),
          });
        break;
      }
      case 8: {
        const keys = keysOf(node);
        if (!keys.length) break;
        if (random() < 0.5) (doc.slots ??= {}).extra ??= {};
        ((node.zones ??= {})[pick(keys)] ??= []).push(
          pick<Json>([
            { $slot: 'extra' },
            { $slot: 'detail', input: { selectedId: { $bind: 'row.id' } } },
            { $slot: 'extra', input: { selectedId: 'x' } },
          ]),
        );
        break;
      }
      case 9: {
        // A placeholder in a content field a field zone fills.
        const resolved = context.catalog.components.get(node.type);
        for (const key of keysOf(node)) {
          const field =
            resolved &&
            fieldZoneOf(resolved.component, resolved.definitions, key);
          if (!field || random() < 0.3) continue;
          (node.props ??= {})[field.prop] = withValueAt(
            node.props[field.prop],
            field.path,
            'Placeholder',
          );
        }
        break;
      }
      case 10:
        // A prop-typed param where it fits (a fresh component) or not.
        if (node.type === '@kerfjs/ui:button' || random() < 0.2)
          (node.props ??= {}).tone = { $param: 'tone' };
        break;
      default:
        if (typeof node.type === 'string' && !node.type.startsWith('#'))
          node.name = random() < 0.04 ? 'twin' : `n${taken.size}x${step}`;
    }
  }
  return doc as ViewDocument;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Every node in a document's tree, for a graft pool. */
export function poolOf(document: ViewDocument): ViewNode[] {
  const nodes: ViewNode[] = [];
  const child = (item: ViewChild) => {
    if ('$each' in item) rowNodes(item).forEach(node);
    else if ('$if' in item) {
      child(item.then);
      if (item.else) child(item.else);
    } else if (!('$slot' in item)) node(item);
  };
  const node = (item: ViewNode) => {
    nodes.push(item);
    for (const list of Object.values(item.zones ?? {})) list.forEach(child);
  };
  node(document.root!);
  return nodes;
}
