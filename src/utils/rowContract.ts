/**
 * Shared "exactly one top-level element per row" contract helpers (KF-103).
 *
 * The keyed-list reconciler in `list-reconcile.ts` and the first-render
 * binding path in `mount.ts` both enforce the same contract on `each()`
 * row HTML. Centralizing the constants and helpers here keeps the three
 * call sites that build error snippets and the eight call sites that
 * parse a row's HTML into a template element from drifting (KF-111 +
 * KF-115).
 */

import { isDevMode } from './devMode.js';

/**
 * Truncation limit applied to row HTML when including it in a contract-
 * violation error message. Keeps the error readable when a row produced
 * megabytes of HTML by accident.
 */
export const ROW_HTML_SNIPPET_MAX = 120;

/**
 * Truncate a row's HTML for inclusion in an error message. Returns the
 * raw string if it's short enough; otherwise the first
 * `ROW_HTML_SNIPPET_MAX` characters with a trailing ellipsis.
 */
export function truncateRowHtml(html: string): string {
  return html.length > ROW_HTML_SNIPPET_MAX
    ? html.slice(0, ROW_HTML_SNIPPET_MAX) + '…'
    : html;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Does a row destined for `parent` need SVG-namespace parsing? (KF-389)
 *
 * A bare `<template>` parses in the HTML namespace, so an `each()` row like
 * `<circle/>` comes back an `HTMLUnknownElement` and never paints. First
 * render escapes this because rows are inlined into the mount root's
 * `innerHTML`, where the surrounding `<svg>` puts the parser in foreign-content
 * mode; every LATER parse (granular insert, snapshot rebuild, structural
 * update) went through the bare template and produced dead nodes.
 *
 * `<foreignObject>` is the exception that proves the rule: it is itself
 * SVG-namespaced, but its children are HTML again, so rows under it must take
 * the ordinary path.
 */
function needsSvgParse(parent: Element | null | undefined): boolean {
  return parent != null
    && parent.namespaceURI === SVG_NS
    && parent.localName !== 'foreignObject';
}

/**
 * Parse a row's HTML and report how many top-level elements it produced. The
 * reconciler uses the count to detect contract violations (count !== 1) on
 * both single-row and bulk-row paths.
 *
 * `parent` is the list's live parent when the caller knows it; it selects the
 * parse namespace (KF-389). Callers that only need the element COUNT for an
 * error message may omit it — the count is namespace-independent.
 *
 * Returns a `DocumentFragment` either way, so callers insert it identically.
 */
export function parseRowTemplate(
  html: string,
  parent?: Element | null,
): { content: DocumentFragment; count: number } {
  const tpl = document.createElement('template');
  if (!needsSvgParse(parent)) {
    tpl.innerHTML = html;
    return { content: tpl.content, count: tpl.content.children.length };
  }
  // Re-enter foreign content the same way the first render does: wrap in an
  // <svg> so the HTML parser namespaces the rows, then lift them out. Using
  // the parser (rather than DOMParser/XML) keeps row markup as forgiving here
  // as it is on first render — the two paths must accept the same input.
  tpl.innerHTML = `<svg>${html}</svg>`;
  const host = tpl.content.firstElementChild as Element;
  const content = document.createDocumentFragment();
  while (host.firstChild !== null) content.appendChild(host.firstChild);
  return { content, count: content.children.length };
}

/**
 * Parse one row's HTML to its single top-level element, enforcing the
 * "exactly one top-level element per row" contract with a row-precise error.
 * Shared by the granular reconciler's single-row paths and the snapshot
 * in-place morph path.
 */
export function parseSingleRow(html: string, index: number, parent?: Element | null): Element {
  const { content, count } = parseRowTemplate(html, parent);
  if (count !== 1) throw rowContractError(index, html);
  return content.firstElementChild as Element;
}

/**
 * Capture the first `n` element children of a parsed row fragment into an
 * array BEFORE a fragment insert empties it. Callers have already verified the
 * parse count equals `n`, so the walk never sees a null.
 */
export function collectTemplateChildren(content: DocumentFragment, n: number): Element[] {
  const nodes = new Array<Element>(n);
  let child = content.firstElementChild;
  for (let k = 0; k < n; k++) {
    nodes[k] = child as Element;
    child = (child as Element).nextElementSibling;
  }
  return nodes;
}

/**
 * Build a precise contract-violation `Error` for the row at `index` whose
 * render produced the given `html`. The thrown message mentions the row
 * index, the actual element count, and the (truncated) HTML so the author
 * can locate and fix the offending row quickly.
 */
export function rowContractError(index: number, html: string): Error {
  const { count } = parseRowTemplate(html);
  const reason = count === 0
    ? 'produced no top-level element'
    : `produced ${count} top-level elements; exactly one is required`;
  return new Error(
    `each(): row render at index ${index} ${reason}. `
    + 'Each item\'s render must return exactly one element — '
    + 'wrap multiple roots in a single parent (e.g. <li>...</li>). '
    + `Got HTML: ${JSON.stringify(truncateRowHtml(html))}`,
  );
}

/**
 * KF-173: emit a one-shot dev-mode `console.warn` when the first row of an
 * `each()` list lacks both `id` and `data-key` attributes. The reconciler
 * falls back to positional matching in that case, which silently shifts row
 * state (focused inputs, mid-edit textareas) on insert/delete. The warning
 * names the row index, points at the canonical fix, and quotes the HTML
 * snippet so the author can locate the call site.
 *
 * Called per-binding with the FIRST row only — rows come from one render
 * function, so sampling row 0 is representative; per-row checking would just
 * repeat the same verdict. The caller passes a mutable flag holder so the
 * warning fires at most once per `mount()`-lifetime per `each()` callsite.
 * Production builds emit nothing — the gate is the shared `isDevMode()`.
 */
export function maybeWarnMissingRowKey(
  rowEl: Element,
  rowHtml: string,
  binding: { warnedMissingKey?: boolean },
): void {
  if (!isDevMode()) return;
  if (binding.warnedMissingKey === true) return;
  binding.warnedMissingKey = true;
  if (rowEl.id !== '' || rowEl.hasAttribute('data-key')) return;
  console.warn(
    'kerf each(): the first row has no `id` or `data-key` attribute. '
    + 'Without one, rows match positionally — an insert/remove at the head shifts every row\'s '
    + 'identity, so focused inputs jump to the wrong row, mid-edit textareas swap content with their neighbor, '
    + 'and any per-row state silently follows the wrong item. '
    + 'Add `data-key={item.id}` (or set `id`) to the top-level element returned by the row render. '
    + `Row HTML: ${JSON.stringify(truncateRowHtml(rowHtml))}`,
  );
}
