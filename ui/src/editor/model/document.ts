// Loading, saving, and querying a view document (docs/26-ui-editor.md §3).
import type {
  ViewChild,
  ViewDocument,
  ViewNode,
  ViewTemplate,
  ViewValue,
} from '@kerfjs/ui/view';
import { VIEW_DOCUMENT_SCHEMA_ID } from '@kerfjs/ui/view';

export type ParseResult =
  | { readonly ok: true; readonly document: ViewDocument }
  | { readonly ok: false; readonly error: string };

/** Parses a `.kui.json` file's text. Structure is checked later by validateView. */
export function parseDocument(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `Not valid JSON: ${(error as Error).message}` };
  }
  if (
    value === null ||
    typeof value !== 'object' ||
    (value as { schema?: unknown }).schema !== VIEW_DOCUMENT_SCHEMA_ID
  ) {
    return {
      ok: false,
      error: `Not a ${VIEW_DOCUMENT_SCHEMA_ID} view document.`,
    };
  }
  return { ok: true, document: value as ViewDocument };
}

/** The file text saved for a document: stable two-space JSON. */
export function serializeDocument(document: ViewDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** The file name a document saves under. */
export function documentFileName(document: ViewDocument): string {
  const base = document.name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  return `${base || 'view'}.kui.json`;
}

/** One row design of an `$each` template: its node, and when it shows. */
export interface TemplateBranch {
  readonly node: ViewNode;
  /** The condition that picks this branch; none for the last (`else`) one. */
  readonly condition?: ViewValue;
}

/**
 * The branches of an `$each` template in order (KF-1CRGP1: editor `$if`-chain
 * templates): the template node alone, or each branch of its `$if` chain, the
 * last one the `else` that shows for every other item.
 */
export function templateBranches(template: ViewTemplate): TemplateBranch[] {
  if (!('$if' in template)) return [{ node: template }];
  // An unfinished chain (no `else`) still lists its `then`.
  const rest = template.else ? templateBranches(template.else) : [];
  return [{ node: template.then, condition: template.$if }, ...rest];
}

/** `template` with each branch node replaced by `change(node)`. */
export function mapTemplate(
  template: ViewTemplate,
  change: (node: ViewNode) => ViewNode,
): ViewTemplate {
  if (!('$if' in template)) return change(template);
  return {
    ...template,
    then: change(template.then),
    ...(template.else ? { else: mapTemplate(template.else, change) } : {}),
  } as ViewTemplate;
}

/** The nodes an `$each` template renders, in branch order; the first keys it. */
export function templateNodes(template: ViewTemplate): ViewNode[] {
  return templateBranches(template).map((branch) => branch.node);
}

export interface NodeVisit {
  readonly node: ViewNode;
  /** Ancestor path: each entry is a parent node and the zone it holds the node in. */
  readonly ancestors: readonly {
    readonly node: ViewNode;
    readonly zone: string;
  }[];
  /** True inside an `$each` template (a row repeated per item). */
  readonly repeated: boolean;
}

/** Visits every node in document order (root first, zones in key order). */
export function visitNodes(document: ViewDocument): NodeVisit[] {
  const visits: NodeVisit[] = [];
  const child = (
    item: ViewChild,
    ancestors: NodeVisit['ancestors'],
    repeated: boolean,
  ) => {
    if ('$each' in item)
      for (const branch of templateNodes(item.template))
        node(branch, ancestors, true);
    else if ('$if' in item) {
      child(item.then, ancestors, repeated);
      if (item.else) child(item.else, ancestors, repeated);
    } else if (!('$slot' in item)) node(item, ancestors, repeated);
  };
  const node = (
    item: ViewNode,
    ancestors: NodeVisit['ancestors'],
    repeated: boolean,
  ) => {
    visits.push({ node: item, ancestors, repeated });
    for (const [zone, children] of Object.entries(item.zones ?? {})) {
      for (const entry of children)
        child(entry, [...ancestors, { node: item, zone }], repeated);
    }
  };
  if (document.root) node(document.root, [], false);
  return visits;
}

/** The node with `id`, with its ancestry, or undefined. */
export function findNode(
  document: ViewDocument,
  id: string,
): NodeVisit | undefined {
  return visitNodes(document).find((visit) => visit.node.id === id);
}
