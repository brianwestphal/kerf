/**
 * Dev warning for an `each()` list whose rows carry no `id` / `data-key`
 * (KF-173). Always on when `kerfjs/dev` is installed — no env var, because a
 * keyless list is never intentional.
 *
 * The reconciler falls back to positional matching without a key, which
 * silently shifts row state (focused inputs, mid-edit textareas) on insert or
 * delete. The warning names the fix and quotes the row HTML so the author can
 * locate the call site.
 *
 * Called per-binding with the FIRST row only — rows come from one render
 * function, so sampling row 0 is representative; per-row checking would just
 * repeat the same verdict. The caller passes a mutable flag holder so the
 * warning fires at most once per `mount()`-lifetime per `each()` call site.
 *
 * Lives in its own `dev-*` module (rather than beside the row-contract helpers
 * it borrows `truncateRowHtml` from) so it is reachable only from the
 * `kerfjs/dev` entry and drops out of production bundles with the rest of the
 * family.
 */

import { truncateRowHtml } from './utils/rowContract.js';

export function maybeWarnMissingRowKey(
  rowEl: Element,
  rowHtml: string,
  binding: { warnedMissingKey?: boolean },
): void {
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
