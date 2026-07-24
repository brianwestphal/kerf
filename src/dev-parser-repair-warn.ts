/**
 * Dev-mode warning for markup the HTML parser silently restructures
 * (`KERF_DEV_WARN_PARSER_REPAIR=1`).
 *
 * kerf renders JSX to an HTML string and lets the parser build the DOM, so the
 * parser's content-model repairs apply. The one that actually bites is `<p>`:
 * it may contain only phrasing content, and the parser **auto-closes it** before
 * a block-level child. So
 *
 *     <p><section>head</section><ul>{each(rows, …)}</ul></p>
 *
 * becomes `<p></p><section>head</section><ul>…</ul>` — an empty `<p>`, and every
 * child hoisted to be its *sibling*.
 *
 * What this does and doesn't cost is worth stating precisely, because it's
 * narrower than it first looks. kerf reconciles the tree the parser actually
 * produced, and does so consistently: updates, list inserts and conditional
 * toggles all behave correctly afterwards. Nothing is corrupted in the ordinary
 * case. What the author loses is the *shape they wrote* — their `<p>` is empty,
 * their children are somewhere else, and any CSS or query that assumed the
 * nesting silently doesn't match.
 *
 * The reason it deserves a warning rather than a line in the docs is distance:
 * the symptom shows up as "my list isn't inside the element I put it in", three
 * levels away from the `<p>` that caused it, and nothing in the JSX looks wrong.
 * Naming the tag pair at first render turns a confusing afternoon into a
 * one-line fix.
 *
 * Why opt-in: the detection is a scan of the emitted HTML rather than a real
 * parse, so while a block-level open tag before a `</p>` is an unambiguous
 * repair signal in kerf's own well-formed output, it is not a proof. The rest of
 * the family's opt-in default keeps that judgement with the consumer.
 */

import { isDevMode } from './utils/devMode.js';

/**
 * Elements that close an open `<p>`. Per the HTML spec's "a p element's end tag
 * can be omitted if the p element is immediately followed by…" list.
 */
const BLOCK_TAGS = [
  'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section',
  'table', 'ul',
];

/** `<p …>` or a block-level open tag — whichever comes first from a given index. */
const SCAN = new RegExp(`<(/?p|${BLOCK_TAGS.join('|')})[\\s/>]`, 'gi');

const warnedPairs = new Set<string>();

function isOptedIn(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_PARSER_REPAIR === '1';
}

/**
 * Find the first block-level tag that opens while a `<p>` is still open.
 * Returns the offending tag name, or null when the markup is clean.
 *
 * Only kerf's own output is scanned, which is always well-formed (the JSX
 * runtime emits a matching close for every non-void tag), so a simple
 * open/close walk is sufficient — no nesting depth to track beyond "are we
 * inside a p".
 */
export function findParagraphRepair(html: string): string | null {
  SCAN.lastIndex = 0;
  let inParagraph = false;
  for (let m = SCAN.exec(html); m !== null; m = SCAN.exec(html)) {
    const tag = m[1].toLowerCase();
    if (tag === '/p') { inParagraph = false; continue; }
    if (tag === 'p') {
      // A nested <p> is itself a repair when one is already open.
      if (inParagraph) return 'p';
      inParagraph = true;
      continue;
    }
    if (inParagraph) return tag;
  }
  return null;
}

/**
 * Scan a first-render HTML string and warn once per offending tag pair.
 * Short-circuits on the env gate before touching the string.
 */
export function maybeWarnParserRepair(html: string): void {
  if (!isOptedIn()) return;
  const tag = findParagraphRepair(html);
  if (tag === null) return;
  const pair = `p>${tag}`;
  if (warnedPairs.has(pair)) return;
  warnedPairs.add(pair);
  console.warn(
    `kerf: a <${tag}> inside a <p> will not survive parsing. `
    + '<p> may contain only phrasing content, so the HTML parser closes it before a '
    + `block-level child — your <p> ends up EMPTY and the <${tag}> (plus everything after it) `
    + 'becomes its sibling instead of its child. kerf then reconciles that repaired tree '
    + 'correctly, so updates still work; what you lose is the structure you wrote, along with '
    + 'any CSS or querySelector that assumed it. Use a <div> (or a phrasing element like '
    + '<span>) in place of the <p>, or move the block content outside it. '
    + 'Set KERF_DEV_WARN_PARSER_REPAIR=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — resets the one-shot dedup set for unit tests. */
export function _resetWarnedForTests(): void {
  warnedPairs.clear();
}
