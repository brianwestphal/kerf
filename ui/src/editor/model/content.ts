// Content props that hold text or nodes (KF-YR91FA: richer value editing). A
// content prop (`slot` in component-props.json, such as a Button's children)
// is set either as literal text in `props` or as nodes in the zone of the
// same name, never both, so the inspector moves content between the two.
import type { ViewChild, ViewDocument, ViewNode } from '@kerfjs/ui/view';

import { findNode } from './document.js';
import { newNodeId } from './edits.js';

/** What a content prop holds: literal text, zone children, or nothing. */
export type Content =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'nodes';
      readonly count: number;
      /** The text, when the zone is exactly one literal `#text` run. */
      readonly text?: string;
    }
  | { readonly kind: 'empty' };

/** What content prop `prop` of `node` holds. */
export function contentOf(node: ViewNode, prop: string): Content {
  const children = node.zones?.[prop] ?? [];
  if (children.length) {
    const [only] = children;
    const text =
      children.length === 1 &&
      only &&
      'type' in only &&
      only.type === '#text' &&
      typeof only.value === 'string'
        ? only.value
        : undefined;
    return {
      kind: 'nodes',
      count: children.length,
      ...(text !== undefined ? { text } : {}),
    };
  }
  const value = node.props?.[prop];
  return typeof value === 'string'
    ? { kind: 'text', text: value }
    : { kind: 'empty' };
}

type Mutable = {
  props?: Record<string, unknown>;
  zones?: Record<string, ViewChild[]>;
};

/** Node `id` in a fresh clone of `document`, for an in-place edit. */
function editable(document: ViewDocument, id: string) {
  const next = globalThis.structuredClone(document);
  const visit = findNode(next, id);
  return visit ? { next, node: visit.node as unknown as Mutable } : undefined;
}

/**
 * Moves content prop `prop`'s literal text into its zone as one `#text` run,
 * so nodes can sit beside it. Unchanged when the prop holds no text.
 */
export function textToNodes(
  document: ViewDocument,
  id: string,
  prop: string,
  makeId: () => string = newNodeId,
): ViewDocument {
  const found = editable(document, id);
  const text = found?.node.props?.[prop];
  if (!found || typeof text !== 'string') return document;
  const { next, node } = found;
  delete node.props![prop];
  if (!Object.keys(node.props!).length) delete node.props;
  node.zones = {
    ...(node.zones ?? {}),
    [prop]: [{ id: makeId(), type: '#text', value: text } as ViewNode],
  };
  return next;
}

/**
 * Moves a zone that is one literal `#text` run back to content prop `prop`
 * as text. Unchanged for any other zone.
 */
export function nodesToText(
  document: ViewDocument,
  id: string,
  prop: string,
): ViewDocument {
  const found = editable(document, id);
  const content = found && contentOf(found.node as ViewNode, prop);
  if (!found || content?.kind !== 'nodes' || content.text === undefined)
    return document;
  const { next, node } = found;
  delete node.zones![prop];
  if (!Object.keys(node.zones!).length) delete node.zones;
  node.props = { ...(node.props ?? {}), [prop]: content.text };
  return next;
}
