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

import { hasCustomTag, seedRenderedAttrs } from './isUserAgentOwnedAttr.js';

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
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

/**
 * HTML integration points: foreign-content elements under which the HTML parser
 * UNCONDITIONALLY re-enters HTML content, so an `each()` row parented there is
 * ordinary HTML and must NOT be wrapped. SVG has three (`foreignObject`, `desc`,
 * `title`); MathML has the five text integration points (`mi`, `mo`, `mn`, `ms`,
 * `mtext`). localNames are case-preserving for both namespaces, so `foreignObject`
 * matches as authored.
 *
 * `annotation-xml` is deliberately absent: it is a MathML HTML integration point
 * only CONDITIONALLY (with `encoding="text/html"`/`application/xhtml+xml`),
 * otherwise its children are MathML. That conditional rule for a rare element is
 * out of scope — a MathML parent not in the text set always wraps in `<math>`.
 */
const SVG_HTML_INTEGRATION = new Set(['foreignObject', 'desc', 'title']);
const MATHML_TEXT_INTEGRATION = new Set(['mi', 'mo', 'mn', 'ms', 'mtext']);

/**
 * The foreign-content wrapper tag a row destined for `parent` must be parsed
 * inside — `'svg'` (KF-389) or `'math'` (KF-417) — or `null` for the ordinary
 * HTML path.
 *
 * A bare `<template>` parses in the HTML namespace, so an `each()` row like
 * `<circle/>` or `<mn/>` comes back an `HTMLUnknownElement` and never paints as
 * SVG/MathML. First render escapes this because rows are inlined into the mount
 * root's `innerHTML`, where the surrounding `<svg>`/`<math>` puts the parser in
 * foreign-content mode; every LATER parse (granular insert, snapshot rebuild,
 * structural update) goes through the bare template and produces dead nodes.
 * `parseRowTemplate` re-enters foreign content by wrapping the row HTML in this
 * tag, so those parses namespace the rows the same way the first render did.
 *
 * A parent that is itself an HTML integration point (see the sets above) takes
 * the ordinary HTML path — wrapping HTML rows in `<svg>`/`<math>` there would
 * either crash (a breakout tag pops the wrapper, emptying it) or mis-namespace
 * the row (KF-420).
 */
function foreignWrapper(
  parent: Element | null | undefined,
): 'svg' | 'math' | null {
  if (parent == null) return null;
  const { namespaceURI, localName } = parent;
  if (namespaceURI === SVG_NS) {
    return SVG_HTML_INTEGRATION.has(localName) ? null : 'svg';
  }
  if (namespaceURI === MATHML_NS) {
    return MATHML_TEXT_INTEGRATION.has(localName) ? null : 'math';
  }
  return null;
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
  const wrapper = foreignWrapper(parent);
  if (wrapper === null) {
    tpl.innerHTML = html;
    if (hasCustomTag(html)) seedRenderedAttrs(tpl.content);
    return { content: tpl.content, count: tpl.content.children.length };
  }
  // Re-enter foreign content the same way the first render does: wrap in an
  // <svg>/<math> so the HTML parser namespaces the rows, then lift them out.
  // Using the parser (rather than DOMParser/XML) keeps row markup as forgiving
  // here as it is on first render — the two paths must accept the same input.
  tpl.innerHTML = `<${wrapper}>${html}</${wrapper}>`;
  const host = tpl.content.firstElementChild as Element;
  const content = document.createDocumentFragment();
  while (host.firstChild !== null) content.appendChild(host.firstChild);
  if (hasCustomTag(html)) seedRenderedAttrs(content);
  return { content, count: content.children.length };
}

/**
 * Parse row HTML strings in ONE `innerHTML` pass (in `parent`'s namespace) and
 * return the resulting top-level elements, captured before a fragment insert
 * can empty the fragment (they share it as `parentNode`). Enforces the
 * "exactly one top-level element per row" contract: when the bulk count
 * differs, each row is re-parsed in isolation and the first offender's
 * row-precise error is thrown — `indexOf(i)` maps position `i` in `htmls` to
 * that row's item index. The success path stays a single parse. Shared by
 * both reconcile paths' bulk parses and their single-row parses.
 */
export function parseRows(
  htmls: readonly string[],
  parent: Element | null | undefined,
  indexOf: (i: number) => number,
): Element[] {
  const { content, count } = parseRowTemplate(htmls.join(''), parent);
  if (count !== htmls.length) {
    htmls.forEach((html, i) => {
      // Parse in the live parent's namespace so the per-row count matches the
      // bulk parse (KF-420: MathML rows must re-parse as MathML) — a namespace
      // mismatch would otherwise miss the offender.
      if (parseRowTemplate(html, parent).count !== 1)
        throw rowContractError(indexOf(i), html, parent);
    });
    /* c8 ignore start — unreachable: same-namespace per-row parse ⇒ a bulk mismatch has an offender. */
    throw new Error(
      'each(): bulk-parse mismatch with no per-row offender (kerf bug).',
    );
  }
  /* c8 ignore stop */
  return Array.from(content.children);
}

/**
 * Parse one row's HTML to its single top-level element, enforcing the row
 * contract with a row-precise error. Shared by the granular reconciler's
 * single-row paths, the snapshot in-place morph path, and the first-render
 * inlined-row check.
 */
export function parseSingleRow(
  html: string,
  index: number,
  parent?: Element | null,
): Element {
  return parseRows([html], parent, () => index)[0];
}

/**
 * Build a precise contract-violation `Error` for the row at `index` whose
 * render produced the given `html`. The thrown message mentions the row
 * index, the actual element count, and the (truncated) HTML so the author
 * can locate and fix the offending row quickly.
 *
 * `parent` selects the parse namespace so the reported count matches what the
 * reconciler actually saw (KF-420): re-parsing without it could count a row
 * differently under a foreign-content parent and print a self-contradictory
 * "produced 1 top-level elements; exactly one is required".
 */
export function rowContractError(
  index: number,
  html: string,
  parent?: Element | null,
): Error {
  const { count } = parseRowTemplate(html, parent);
  const reason =
    count === 0
      ? 'produced no top-level element'
      : `produced ${count} top-level elements; exactly one is required`;
  return new Error(
    `each(): row render at index ${index} ${reason}. ` +
      "Each item's render must return exactly one element — " +
      'wrap multiple roots in a single parent (e.g. <li>...</li>). ' +
      `Got HTML: ${JSON.stringify(truncateRowHtml(html))}`,
  );
}
