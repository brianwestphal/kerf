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
