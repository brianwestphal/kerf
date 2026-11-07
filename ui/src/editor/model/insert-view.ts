// KF-PX5EVZ: insert an existing document as a `#view` (row template phase 2,
// docs/26-ui-editor.md §3.7). The editor offers the project's documents from
// its storage's `list()`; these are the pure parts: which documents to offer,
// the filter over them, why a picked one cannot be composed, and the `#view`
// node that composes it, its required params seeded with example values.
import type {
  ViewDocument,
  ViewNode,
  ViewType,
  ViewValue,
} from '@kerfjs/ui/view';

import { isDraft } from '../autosave.js';
import { exampleValue } from './examples.js';
import { relativeSrc } from './extract.js';

/**
 * The documents the picker offers: every listed `.kui.json` path except the
 * current document's own file and autosaved drafts, once each, sorted.
 */
export function insertableDocuments(
  paths: readonly string[],
  currentPath: string | undefined,
): string[] {
  return [...new Set(paths)]
    .filter(
      (path) =>
        path.endsWith('.kui.json') && path !== currentPath && !isDraft(path),
    )
    .sort();
}

/** The documents whose path holds every word of `query`, ignoring case. */
export function filterDocuments(
  paths: readonly string[],
  query: string,
): string[] {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return paths.filter((path) => {
    const lower = path.toLocaleLowerCase();
    return words.every((word) => lower.includes(word));
  });
}

/**
 * Why the document cannot be composed, or undefined when it can. A document
 * that declares slots cannot be filled from a composing document (KUI-V012).
 */
export function insertProblem(document: ViewDocument): string | undefined {
  if (!document.root) return 'It is empty, so there is nothing to show.';
  if (Object.keys(document.slots ?? {}).length)
    return 'It declares slots, and a composing document cannot fill them.';
  return undefined;
}

/**
 * A minimal literal of `type`'s kind, for a type no example fits: content
 * no text can stand for, a list of such items, a function, or a type the
 * document's own definitions cannot resolve. (A string, number, or boolean
 * always has an example.)
 */
function minimalValue(type: ViewType, name: string): ViewValue {
  switch (type.kind) {
    case 'content':
      return '';
    case 'array':
      return [];
    case 'function':
      return { $action: name };
    default:
      return {};
  }
}

/**
 * The props a `#view` of `document` starts with: an example value for every
 * required param (one with no `default` that is not `optional`).
 */
export function requiredParamProps(
  document: ViewDocument,
): Record<string, ViewValue> {
  const props: Record<string, ViewValue> = {};
  for (const [name, param] of Object.entries(document.params ?? {})) {
    if (param.default !== undefined || param.optional) continue;
    props[name] =
      exampleValue(param.type, {}, name) ?? minimalValue(param.type, name);
  }
  return props;
}

/**
 * The `#view` node that composes the document at `path` (`document`) from
 * the document at `currentPath`.
 */
export function insertedView(
  id: string,
  currentPath: string,
  path: string,
  document: ViewDocument,
): ViewNode {
  const props = requiredParamProps(document);
  return {
    id,
    type: '#view',
    src: relativeSrc(currentPath, path),
    ...(Object.keys(props).length ? { props } : {}),
  };
}

/** KF-FXACB5: the Library's group of the project's documents. */
export const LIBRARY_DOCUMENTS = 'Documents';

/**
 * The documents the Library shows for its filter text `query`: all of them
 * when the group's own name holds the text (as a category match keeps a
 * component group whole; empty text always matches), else the ones
 * `filterDocuments` keeps.
 */
export function libraryDocuments(
  paths: readonly string[],
  query: string,
): readonly string[] {
  const text = query.trim().toLocaleLowerCase();
  return LIBRARY_DOCUMENTS.toLocaleLowerCase().includes(text)
    ? paths
    : filterDocuments(paths, text);
}

/** A document path's file name, which a Library row or tile leads with. */
export function documentName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** A document path's folder, `./` at the project root. */
export function documentFolder(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1) || './';
}
