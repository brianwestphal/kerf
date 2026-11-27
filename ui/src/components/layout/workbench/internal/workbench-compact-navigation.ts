import type { Signal } from 'kerfjs';

import { realmOf } from '../../../../shared/dom/realm.js';
import {
  wireNavStack,
  type WireNavStackOptions,
} from '../../../navigation/nav-stack/wiring/wire-nav-stack.js';
import { workbenchRegionId } from '../model/workbench-resize.js';

export interface WireWorkbenchCompactNavigation extends WireNavStackOptions {
  /** Container width, inclusive. Named breakpoints scale with the root font. */
  at?: 'compact' | 'narrow' | number;
  /** App-owned state rendered as Workbench's compactNavigation.active. */
  active: Signal<boolean>;
}

const MAIN = ':scope > .kui-workbench__center > [data-workbench-main]';
const STACK = ':scope > [data-component="nav-stack"]';

/** Measure the Workbench and bind its own work-area stack, even on late mount. */
export function wireWorkbenchCompactNavigation(
  root: HTMLElement,
  findWorkbench: () => HTMLElement | null,
  { at = 'compact', active, onBack, duration }: WireWorkbenchCompactNavigation,
): () => void {
  const view = realmOf(root);
  const document = root.ownerDocument;
  let observed: HTMLElement | null = null;
  let stack: HTMLElement | null = null;
  let stopStack: (() => void) | undefined;
  let disposed = false;

  const measure = (): void => {
    if (!observed) return;
    const width = observed.getBoundingClientRect().width;
    if (width <= 0) return;
    const limit =
      typeof at === 'number'
        ? at
        : (at === 'narrow' ? 44 : 28) *
          Number.parseFloat(
            view.getComputedStyle(document.documentElement).fontSize,
          );
    const next = width <= limit;
    if (next === active.peek()) return;

    const focused = document.activeElement;
    const rightRail = observed.querySelector(
      ':scope > [data-workbench-rail="right"]',
    );
    const rightId = workbenchRegionId(observed.id, 'rightRail');
    const rightToggle =
      focused &&
      observed.contains(focused) &&
      focused.getAttribute('aria-controls')?.split(/\s+/).includes(rightId);
    const focusFromRail = next && (rightRail?.contains(focused) || rightToggle);
    active.value = next;
    if (focusFromRail) {
      // NavStack gets the first chance to focus a newly pushed view. If the
      // old rail or toggle disappeared without a push, focus the work area.
      view.queueMicrotask(() => {
        if (
          !disposed &&
          active.peek() &&
          document.activeElement === document.body
        )
          observed
            ?.querySelector<HTMLElement>(MAIN)
            ?.focus({ preventScroll: true });
      });
    }
  };

  const resizeObserver = new view.ResizeObserver(measure);
  const sync = (): void => {
    const workbench = findWorkbench();
    if (workbench !== observed) {
      if (observed) resizeObserver.unobserve(observed);
      observed = workbench;
      if (workbench) resizeObserver.observe(workbench, { box: 'border-box' });
      measure();
    }
    const nextStack =
      workbench?.querySelector(MAIN)?.querySelector<HTMLElement>(STACK) ?? null;
    if (nextStack !== stack) {
      stopStack?.();
      stack = nextStack;
      stopStack = stack ? wireNavStack(stack, { onBack, duration }) : undefined;
    }
  };
  const observer = new view.MutationObserver(() => {
    if (!stack?.isConnected || !observed || !root.contains(observed)) sync();
  });
  observer.observe(root, { childList: true, subtree: true });
  // Named breakpoints respond to text-size settings even at a fixed width.
  const remProbe =
    typeof at === 'number' ? undefined : document.createElement('div');
  if (remProbe) {
    remProbe.setAttribute('aria-hidden', 'true');
    remProbe.style.cssText =
      'position:absolute;width:1rem;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body.append(remProbe);
    resizeObserver.observe(remProbe);
  }
  sync();
  return () => {
    disposed = true;
    resizeObserver.disconnect();
    observer.disconnect();
    stopStack?.();
    remProbe?.remove();
  };
}
