/**
 * `kerfjs/actions` — the delegated action-table helper.
 *
 * The most-reinvented idiom across real kerf apps: one table of `data-action`
 * attribute specs used as the single source of truth for BOTH the JSX attribute
 * and the delegate selector, plus a hand-rolled `switch (dataset.action)`
 * dispatcher. This subpath blesses it as two thin helpers over the existing
 * `attr()` + `delegate()` — it does NOT replace them.
 *
 *   import { action, delegateActions } from 'kerfjs/actions';
 *
 *   const A = {
 *     select: action('select-file'),
 *     remove: action('remove-file'),
 *   };
 *
 *   // JSX — spread the attr (rename-safe; no hardcoded attribute name):
 *   //   <button {...A.select.attrs} data-id={id}>…</button>
 *
 *   // Wire the whole table with ONE delegated listener; returns a disposer:
 *   const dispose = delegateActions(root, 'click', {
 *     [A.select.value]: (_e, el) => selectFile(el.getAttribute('data-id')),
 *     [A.remove.value]: (_e, el) => removeFile(el.getAttribute('data-id')),
 *   });
 *
 * Contract: `delegateActions` returns a `() => void` disposer and holds no
 * per-instance state — the same shape as `delegate()`, which it builds on (so
 * it inherits the single-listener dispatch and the capture auto-promotion for
 * well-known non-bubbling event types). One event type per call, mirroring
 * `delegate()`; collect the disposers for a root that needs several.
 */
import { attr, type AttrSpec } from './attrSelector.js';
import { delegate, type DelegateOptions } from './delegate.js';

/** The attribute an action table keys on by default. */
const DEFAULT_ACTION_ATTR = 'data-action';

/**
 * A handler in a {@link delegateActions} table. Receives the DOM event and the
 * matched element (walk-up `closest()` match by default) — the same shape as a
 * `delegate()` handler.
 */
export type ActionHandler<E extends Element = Element> = (event: Event, el: E) => void;

/**
 * `action(value)` — an {@link AttrSpec} on `data-action`. A thin specialization
 * of `attr('data-action', value)`: spread its `.attrs` in JSX and use its
 * `.value` as the handler-table key, so the action name lives in exactly one
 * place and can't drift between the markup and the dispatcher.
 */
export function action<V extends string>(value: V): AttrSpec<'data-action', V> {
  return attr(DEFAULT_ACTION_ATTR, value);
}

/** Options for {@link delegateActions}. Extends {@link DelegateOptions}. */
export interface DelegateActionsOptions extends DelegateOptions {
  /**
   * The attribute the table keys on. Default `'data-action'`. Override it only
   * if you also author the specs with `attr(yourName, …)` instead of `action()`.
   */
  attr?: string;
}

/**
 * Wire a whole table of action handlers with ONE delegated listener.
 *
 * On `eventType`, the nearest element carrying the action attribute (walk-up
 * `closest()` by default; pass `{ match: 'direct' }` for an exact-element match)
 * is looked up in `table` by its attribute value, and the matching handler
 * runs. An element whose action is absent from the table is ignored — the same
 * behavior as a `switch (dataset.action)` with no matching `case`.
 *
 * Returns a `() => void` disposer. One event type per call (the smallest
 * surface, mirroring `delegate()`); collect the disposers when a root needs
 * several event types.
 */
export function delegateActions<E extends Element = Element>(
  root: HTMLElement,
  eventType: string,
  table: Readonly<Record<string, ActionHandler<E>>>,
  options?: DelegateActionsOptions,
): () => void {
  const attrName = options?.attr ?? DEFAULT_ACTION_ATTR;
  return delegate<E>(
    root,
    eventType,
    `[${attrName}]`,
    (event, el) => {
      // `el` matched `[${attrName}]`, so the attribute is always present.
      const handler = table[el.getAttribute(attrName) as string];
      if (handler !== undefined) handler(event, el);
    },
    options,
  );
}
