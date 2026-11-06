// KF-5N26H6: composed documents (`#view`, docs/26-ui-editor.md §3.7) in the
// editor. The editor loads each `#view`'s document through its storage; these
// are the pure parts: where a `src` points, what a composing document needs
// loaded, the Inspector props a composed document's params make, and the copy
// of a composed document the canvas renders so it selects as its `#view`.
import {
  composedViewPath,
  type ViewChild,
  type ViewDiagnostic,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';

import type { PropsComponent } from '../catalog.js';
import { mapRows, mapTemplate, visitNodes } from './document.js';
import type { InspectorProp } from './inspector.js';

/**
 * The project path `src` names from the document at `documentPath`: relative
 * to that document's folder, as `kerf-ui-view` resolves it. Undefined when it
 * leaves the project (more `..` than folders) or starts at the root.
 */
export function viewPath(
  documentPath: string,
  src: string,
): string | undefined {
  if (src.startsWith('/')) return undefined;
  const parts = documentPath.split('/').slice(0, -1);
  for (const part of src.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return undefined;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

/** Every `#view` source a document composes, in document order, once each. */
export function viewSources(document: ViewDocument): string[] {
  return [
    ...new Set(
      visitNodes(document).flatMap(({ node }) =>
        node.type === '#view' && typeof node.src === 'string' && node.src
          ? [node.src]
          : [],
      ),
    ),
  ];
}

/** What loading one composed document came to. */
export type ViewLoad =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded'; readonly document: ViewDocument }
  | { readonly state: 'missing' }
  | { readonly state: 'failed'; readonly error: string };

/**
 * The project paths a document needs loaded to render: its own `#view`s and,
 * once loaded, theirs. KF-3X7MFF: each source resolves from the document that
 * contains it, as the validator, `kerf-ui-view`, and the generated imports do.
 */
export function neededViews(
  document: ViewDocument,
  documentPath: string,
  loads: ReadonlyMap<string, ViewLoad>,
): string[] {
  const needed: string[] = [];
  // `at`: where `current` is, relative to the top document's folder.
  const visit = (current: ViewDocument, at?: string) => {
    for (const src of viewSources(current)) {
      const from = composedViewPath(at, src);
      const path = viewPath(documentPath, from);
      if (path === undefined || needed.includes(path)) continue;
      needed.push(path);
      const load = loads.get(path);
      if (load?.state === 'loaded') visit(load.document, from);
    }
  };
  visit(document);
  return needed;
}

/**
 * The Inspector entry for a `#view` node: one prop per param of the
 * document it composes, required unless the param has a default. A
 * prop-typed param keeps its `prop` type, which only a binding fills.
 */
export function viewPropsEntry(
  src: string,
  composed: ViewDocument,
): PropsComponent {
  const params = composed.params ?? {};
  return {
    id: src,
    key: '#view',
    source: 'package',
    props: Object.entries(params).map(([name, param]): InspectorProp => ({
      name,
      type: param.type,
      required: !('default' in param) && param.optional !== true,
      ...(typeof param.default === 'string' ||
      typeof param.default === 'number' ||
      typeof param.default === 'boolean'
        ? { default: param.default }
        : {}),
    })),
  };
}

const VIEW_KEY = '\n';

/** The canvas's `src` for a composed document rendered as node `owner`. */
export const ownedSource = (owner: string, src: string) =>
  `${owner}${VIEW_KEY}${src}`;

/** The node and source an `ownedSource` key names. */
export function ownedSourceOf(key: string): { owner: string; src: string } {
  const at = key.indexOf(VIEW_KEY);
  return { owner: key.slice(0, at), src: key.slice(at + 1) };
}

/**
 * A copy of `document` for the canvas: every `#view`'s `src` names its owner
 * and where it points relative to the top document's folder (`ownedSource`),
 * and with `owner` every node carries that id, so a click anywhere in a
 * composed document selects the `#view` that renders it. `at` is where
 * `document` is (undefined for the top document): a nested `src` resolves
 * from the document that contains it.
 */
export function ownedViews(
  document: ViewDocument,
  owner?: string,
  at?: string,
): ViewDocument {
  const node = (item: ViewNode): ViewNode => {
    const id = owner ?? item.id;
    const zones = item.zones
      ? Object.fromEntries(
          Object.entries(item.zones).map(([zone, list]) => [
            zone,
            list.map(child),
          ]),
        )
      : undefined;
    return {
      ...item,
      id,
      ...(item.type === '#view' && typeof item.src === 'string'
        ? { src: ownedSource(id, composedViewPath(at, item.src)) }
        : {}),
      ...(zones ? { zones } : {}),
    };
  };
  const child = (item: ViewChild): ViewChild => {
    // Every row design: an `$if`-chain's branches, or each kind's template.
    if ('$each' in item)
      return mapRows(item, (template) => mapTemplate(template, node));
    if ('$if' in item)
      return {
        ...item,
        then: child(item.then),
        ...(item.else ? { else: child(item.else) } : {}),
      };
    if ('$slot' in item) return item;
    return node(item);
  };
  return document.root ? { ...document, root: node(document.root) } : document;
}

/**
 * KF-85SCQD: every composed document `document` reaches that `resolve`
 * has, by where it is from the top document's folder (`composedViewPath`),
 * nested ones included, each once. What play mode's stage renders `#view`s
 * from, since it has no storage of its own.
 */
export function composedDocuments(
  document: ViewDocument,
  resolve: (path: string) => ViewDocument | undefined,
): Record<string, ViewDocument> {
  const found: Record<string, ViewDocument> = {};
  const visit = (current: ViewDocument, at?: string) => {
    for (const src of viewSources(current)) {
      const path = composedViewPath(at, src);
      if (path in found) continue;
      const loaded = resolve(path);
      if (!loaded) continue;
      found[path] = loaded;
      visit(loaded, path);
    }
  };
  visit(document);
  return found;
}

/** Whether a document composes another anywhere. */
export const composesViews = (document: ViewDocument) =>
  viewSources(document).length > 0;

/**
 * The validator's "was not found" for each `#view` that has not loaded, in
 * words that say why: there is no storage, it is still loading, it could not
 * be read or parsed, or where it was looked for.
 */
export function explainViewLoads(
  diagnostics: readonly ViewDiagnostic[],
  documentPath: string | undefined,
  loads: ReadonlyMap<string, ViewLoad>,
): ViewDiagnostic[] {
  return diagnostics.map((diagnostic) => {
    const found = /^#view "(.*)" was not found$/.exec(diagnostic.message);
    if (diagnostic.code !== 'KUI-V012' || !found) return diagnostic;
    const src = found[1]!;
    // A nested `#view`'s path (`…{./rows/row.kui.json}…`) names the documents
    // it is inside, each resolving from the one before.
    const at = [...diagnostic.path.matchAll(/\{([^}]*)\}/g)].reduce<
      string | undefined
    >((from, [, inside]) => composedViewPath(from, inside!), undefined);
    const path =
      documentPath === undefined
        ? undefined
        : viewPath(documentPath, composedViewPath(at, src));
    const load = path === undefined ? undefined : loads.get(path);
    const why =
      documentPath === undefined
        ? 'the editor has no storage to load it from'
        : path === undefined
          ? 'it is outside the project'
          : load?.state === 'missing'
            ? `there is no ${path}`
            : load?.state === 'failed'
              ? `it could not be read: ${load.error}`
              : 'it is loading';
    return { ...diagnostic, message: `#view "${src}" was not found: ${why}` };
  });
}
