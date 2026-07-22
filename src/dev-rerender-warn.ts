/**
 * Dev-mode warning for value-only re-renders (KERF_DEV_WARN_VALUE_ONLY_RERENDER=1).
 *
 * Phase 2 of the update-machinery consolidation ("values bind, structure
 * re-renders"): when a `mount()` re-render's static-surrounds HTML differs
 * from the previous render ONLY in text content and attribute values — no
 * element added, removed, moved, or retagged — every changed hole could have
 * been a fine-grained binding instead (`{count}`, `class={sig}`), and the
 * whole render + byte-compare + morph pass was avoidable. This warner points
 * that out once per mount.
 *
 * Detection: parse both HTML strings into detached `<template>`s and walk the
 * two trees in lockstep. Text-node data and element attributes (names AND
 * values — a boolean attribute appearing/disappearing is a value change,
 * since `renderAttr` omits false/nullish) are allowed to differ; any change
 * of child count, node type, tag name, or comment data (marker comments are
 * deterministic per structure, so a changed marker implies a structural or
 * binding-shape change) classifies the render as structural and no warning
 * fires. Conservative by construction: false negatives are fine, false
 * positives would erode trust in the guidance.
 *
 * Why opt-in (docs/11 family rules): plenty of legitimate code re-renders on
 * `.value` reads — the warning is a migration aid for adopting the bound-first
 * idiom, not a lint on correctness. Production behavior is unchanged for zero
 * runtime cost: the env-var read short-circuits before any parsing runs, and
 * the parse itself happens only on the already-slow surrounds-changed path.
 */

import { isDevMode } from './utils/devMode.js';

/** Per-mount one-shot context — created by `mount()`, mirrors NarrowSetWarnContext. */
export interface ValueOnlyWarnContext {
  warned: boolean;
}

export function isOptedIn(): boolean {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  if (proc?.env?.KERF_DEV_WARN_VALUE_ONLY_RERENDER !== '1') return false;
  return isDevMode();
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

/**
 * Lockstep structural comparison: true when the two fragments have identical
 * element/comment shape, so every difference is confined to text data and
 * attributes ("value-only"). Exported for direct unit coverage of the branch
 * matrix; production callers go through `maybeWarnValueOnlyRerender`.
 */
export function _isValueOnlyDiff(a: Node, b: Node): boolean {
  const an = a.childNodes;
  const bn = b.childNodes;
  if (an.length !== bn.length) return false;
  for (let i = 0; i < an.length; i++) {
    const x = an[i];
    const y = bn[i];
    if (x.nodeType !== y.nodeType) return false;
    if (x.nodeType === ELEMENT_NODE) {
      if ((x as Element).tagName !== (y as Element).tagName) return false;
      if (!_isValueOnlyDiff(x, y)) return false;
    } else if (x.nodeType === COMMENT_NODE) {
      if ((x as Comment).data !== (y as Comment).data) return false;
    } else if (x.nodeType !== TEXT_NODE) {
      // Defensive: HTML parsing via template.innerHTML only produces
      // element/text/comment children (no CDATA; PIs parse as bogus
      // comments), so this arm is unreachable by construction — kept so an
      // exotic caller-supplied tree bails structural rather than guessing.
      /* c8 ignore next 2 */
      return false;
    }
    // TEXT_NODE: data may differ freely — that's the value change.
  }
  return true;
}

/**
 * Called by `mount()` on a surrounds-CHANGED re-render (the byte-compare
 * already failed, so the strings are known to differ). Parses + compares only
 * when the opt-in gate is open and this mount hasn't warned yet.
 */
export function maybeWarnValueOnlyRerender(
  prevHtml: string,
  nextHtml: string,
  ctx: ValueOnlyWarnContext,
): void {
  if (ctx.warned || !isOptedIn()) return;
  const a = document.createElement('template');
  const b = document.createElement('template');
  a.innerHTML = prevHtml;
  b.innerHTML = nextHtml;
  if (!_isValueOnlyDiff(a.content, b.content)) return;
  ctx.warned = true;
  console.warn(
    'kerf: this re-render changed only text content and attribute values — no structural '
    + 'change — so every changed hole could be a fine-grained binding instead. Values bind, '
    + 'structure re-renders: pass the signal/computed itself ({count}, class={sig}) rather than '
    + 'reading .value in the hole, and each change updates just that node with no render re-run '
    + '(a mount whose render reads no .value never re-renders at all). See docs/2-reactivity §2.9. '
    + 'Set KERF_DEV_WARN_VALUE_ONLY_RERENDER=0 (or unset it) to silence this warning.',
  );
}
