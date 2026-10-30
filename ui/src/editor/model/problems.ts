// The problems list: validateView diagnostics mapped to the node each one is
// about, so selecting a problem selects its node.
import type {
  ViewDiagnostic,
  ViewDocument,
  ViewNode,
  ViewValue,
} from '@kerfjs/ui/view';

import { findNode } from './document.js';

/** Splits `$.root.zones.header[0].props.tone` into object keys and indexes. */
function segments(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  const pattern = /\.([^.[{]+)|\[(\d+)\]/g;
  for (const match of path.slice(1).matchAll(pattern)) {
    parts.push(match[1] !== undefined ? match[1] : Number(match[2]));
  }
  return parts;
}

/**
 * The id of the deepest node a diagnostic path reaches, or undefined for a
 * document-level path (`$.params…`, `$.name`). A path into a composed
 * document (`…{./child.kui.json}…`) stops at its `#view` node.
 */
export function nodeIdForPath(
  document: ViewDocument,
  path: string,
): string | undefined {
  const local = path.split('{')[0]!;
  let current: unknown = document;
  let found: string | undefined;
  for (const segment of segments(local)) {
    if (current === null || typeof current !== 'object') break;
    current = (current as Record<string | number, unknown>)[segment];
    const id = (current as { id?: unknown } | undefined)?.id;
    if (
      typeof id === 'string' &&
      typeof (current as { type?: unknown }).type === 'string'
    ) {
      found = id;
    }
  }
  return found;
}

export interface Problem {
  readonly diagnostic: ViewDiagnostic;
  readonly nodeId?: string;
}

/** One of a component's prop variants (`component-props.json`). */
export interface PropsVariant {
  readonly required: readonly string[];
  readonly forbidden: readonly string[];
  readonly when?: Readonly<Record<string, ViewValue>>;
}

/** Whether a value is a binding (`$param`, `$bind`, …), not a literal. */
const bound = (value: ViewValue | undefined) =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.keys(value).some((key) => key.startsWith('$'));

/**
 * What would make `node` match one of `variants` (KF-TVZ06Y: a variant
 * problem says how to fix it): the changes to the closest variant, or, when
 * several are one set or one removal away, each prop that would do
 * ("set "label" or "ariaLabel""); empty when a bound prop already might.
 */
export function variantFix(
  node: ViewNode,
  variants: readonly PropsVariant[],
): string {
  const props = node.props ?? {};
  const present = new Set([
    ...Object.keys(props),
    ...Object.entries(node.zones ?? {})
      .filter(([, children]) => children.length)
      .map(([zone]) => zone),
  ]);
  const differs = (name: string, value: ViewValue) =>
    present.has(name)
      ? !bound(props[name]) && props[name] !== value
      : value !== false;
  const changes = variants.map((variant) => [
    ...variant.required
      .filter((name) => !present.has(name))
      .map((name) => ['set', `"${name}"`] as const),
    ...variant.forbidden
      .filter((name) => present.has(name))
      .map((name) => ['remove', `"${name}"`] as const),
    ...Object.entries(variant.when ?? {})
      .filter(([name, value]) => differs(name, value))
      .map(
        ([name, value]) =>
          ['set', `"${name}" to ${JSON.stringify(value)}`] as const,
      ),
  ]);
  const fewest = Math.min(...changes.map((steps) => steps.length));
  const closest = changes.filter((steps) => steps.length === fewest);
  const verb = closest[0]![0]?.[0];
  if (fewest === 1 && closest.every(([step]) => step![0] === verb))
    return `${verb} ${[...new Set(closest.map(([step]) => step![1]))].join(' or ')}`;
  const verbs = new Map<string, string[]>();
  for (const [each, what] of closest[0]!)
    verbs.set(each, [...(verbs.get(each) ?? []), what]);
  return [...verbs]
    .map(([each, list]) => `${each} ${list.join(', ')}`)
    .join('; ');
}

/** KUI-V004's message when a node's props fit none of its variants. */
const NO_VARIANT = /props match none of its variants$/;

export function problemsOf(
  document: ViewDocument,
  diagnostics: readonly ViewDiagnostic[],
  /** A component's variants, so a variant problem can say how to fix it. */
  variantsOf: (type: string) => readonly PropsVariant[] | undefined = () =>
    undefined,
): Problem[] {
  return diagnostics.map((diagnostic) => {
    const nodeId = nodeIdForPath(document, diagnostic.path);
    if (!nodeId) return { diagnostic };
    const node = findNode(document, nodeId)!.node;
    const variants = variantsOf(node.type);
    const fix =
      variants?.length && NO_VARIANT.test(diagnostic.message)
        ? variantFix(node, variants)
        : '';
    return fix
      ? {
          diagnostic: {
            ...diagnostic,
            message: `${diagnostic.message}: ${fix}`,
          },
          nodeId,
        }
      : { diagnostic, nodeId };
  });
}

/** Problem counts by node id, for marking outline rows. */
export function problemCounts(
  problems: readonly Problem[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { nodeId } of problems) {
    if (nodeId) counts.set(nodeId, (counts.get(nodeId) ?? 0) + 1);
  }
  return counts;
}

/**
 * A validator message for people (KF-6RYJ64): component keys written as
 * their names, and a cataloged-parents rule as where the component goes.
 */
export function readableMessage(
  message: string,
  names: ReadonlyMap<string, string>,
): string {
  return message
    .replace(
      /`?(@[\w./-]+:[\w#-]+)`?/g,
      (key, bare: string) => names.get(bare) ?? key,
    )
    .replace(
      /^(\S+) requires one of these cataloged parents: (.*)$/,
      (_, name: string, parents: string) =>
        `${name} goes in ${parents.split(', ').join(' or ')}`,
    );
}

/**
 * Why placing node `id` made `document` worse (KF-6RYJ64): the first of the
 * `added` problems about that node, else the first added at all, in words;
 * undefined when none was added.
 */
export function placementReason(
  document: ViewDocument,
  added: readonly ViewDiagnostic[],
  id: string,
  names: ReadonlyMap<string, string>,
): string | undefined {
  const reason =
    added.find(
      (diagnostic) => nodeIdForPath(document, diagnostic.path) === id,
    ) ?? added[0];
  return reason && readableMessage(reason.message, names);
}
