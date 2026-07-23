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

/**
 * Parse a row's HTML into a `<template>` and report how many top-level
 * elements it produced. The reconciler uses the count to detect contract
 * violations (count !== 1) on both single-row and bulk-row paths.
 */
export function parseRowTemplate(html: string): { tpl: HTMLTemplateElement; count: number } {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return { tpl, count: tpl.content.children.length };
}

/**
 * Parse one row's HTML to its single top-level element, enforcing the
 * "exactly one top-level element per row" contract with a row-precise error.
 * Shared by the granular reconciler's single-row paths and the snapshot
 * in-place morph path.
 */
export function parseSingleRow(html: string, index: number): Element {
  const { tpl, count } = parseRowTemplate(html);
  if (count !== 1) throw rowContractError(index, html);
  return tpl.content.firstElementChild as Element;
}

/**
 * Capture the first `n` element children of a parsed row template into an
 * array BEFORE a fragment insert empties `tpl.content`. Callers have already
 * verified the parse count equals `n`, so the walk never sees a null.
 */
export function collectTemplateChildren(tpl: HTMLTemplateElement, n: number): Element[] {
  const nodes = new Array<Element>(n);
  let child = tpl.content.firstElementChild;
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
