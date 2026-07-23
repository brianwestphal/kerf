/**
 * Dev-mode warning for each() containers rebuilt by the morph
 * (KERF_DEV_WARN_LIST_REBIND=1).
 *
 * When the opt-in env var is set, `mount()` calls `maybeWarnListRebind()` from
 * the self-heal branch of `bindListsFromMarkers` — the point where an existing
 * list binding's marker is discovered to have left the mount root because the
 * morph rebuilt the list's container (an ancestor's tag changed, so
 * `replaceChild` swapped the whole subtree, cloning a fresh marker).
 *
 * Why the pattern matters: the self-heal makes the rebuild *correct* — the
 * stale binding is dropped, the list re-binds against the fresh marker, and
 * the next reconcile repopulates the rows — but the recovery is lossy. The
 * rows are re-created from scratch, so focus, scroll positions, in-progress
 * IME composition, and any imperative listeners on the old row nodes are
 * silently discarded. An author who didn't intend the ancestor tag swap gets
 * no other signal that their rows are being churned.
 *
 * Why opt-in: swapping an ancestor's tag across renders (`<section>` ↔
 * `<article>` around the same list) is occasionally intentional — semantic
 * element changes driven by state — and the rebuild-with-repopulate behavior
 * is then exactly what the author wants. The opt-in keeps the diagnostic
 * available for projects that want it without penalising that pattern.
 */

import { isDevMode } from './utils/devMode.js';

const warnedIds = new Set<string>();

function isOptedIn(): boolean {
  if (!isDevMode()) return false;
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.KERF_DEV_WARN_LIST_REBIND === '1';
}

/**
 * Fire the one-shot (per list id) rebuild warning. `liveParent` is the fresh
 * container the cloned marker landed in — named in the message so the author
 * can find the swap site.
 */
export function maybeWarnListRebind(id: string, liveParent: Element): void {
  if (!isOptedIn()) return;
  if (warnedIds.has(id)) return;
  warnedIds.add(id);
  console.warn(
    `kerf: each() list '${id}' had its container (<${liveParent.tagName.toLowerCase()}>) rebuilt by the morph this render — `
    + 'an ancestor\'s tag changed so the subtree was replaced, or a same-tag sibling positionally took the '
    + 'container\'s place. The list re-binds and repopulates automatically, but its rows were re-created '
    + 'from scratch: focus, scroll positions, in-progress IME composition, and any imperative listeners on '
    + 'the old row nodes are lost. Keep the structure around a list stable across renders (stable ancestor '
    + 'tags; give a conditional same-tag sibling a distinguishing id/data-key, or wrap it in an '
    + 'always-present container) if the rows should survive. '
    + 'Set KERF_DEV_WARN_LIST_REBIND=0 (or unset it) to silence this warning.',
  );
}

/** Test helper — resets the one-shot dedup set for unit tests. */
export function _resetWarnedForTests(): void {
  warnedIds.clear();
}
