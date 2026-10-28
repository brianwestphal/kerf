// The problems list: validateView diagnostics mapped to the node each one is
// about, so selecting a problem selects its node.
import type { ViewDiagnostic, ViewDocument } from '@kerfjs/ui/view';

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

export function problemsOf(
  document: ViewDocument,
  diagnostics: readonly ViewDiagnostic[],
): Problem[] {
  return diagnostics.map((diagnostic) => {
    const nodeId = nodeIdForPath(document, diagnostic.path);
    return nodeId ? { diagnostic, nodeId } : { diagnostic };
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
