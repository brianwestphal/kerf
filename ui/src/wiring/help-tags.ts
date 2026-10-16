// Hover and keyboard-focus help tags for icon-only controls.
//
// An icon-only `Select` (single `selectedPresentation="icon-only"` or the
// multiple `triggerIcon` filter), an icon-only `PopupMenu` (a `label` instead
// of visible `text`), an icon-only `<button>` or link inside a
// `ToolbarControlGroup` (named only by `aria-label`), and an icon-only
// `Button` carry their purpose — and
// a Select its current choice — only in the accessible name. Sighted pointer
// and keyboard users see just the icon, so the registration boundary shows a
// tag naming the control (Apple HIG "help tag"):
//
// - after a short hover delay, or immediately when a previous tag just closed
//   (moving along a toolbar), and at once on keyboard (`:focus-visible`) focus;
// - never while the control's popup is open, and not again after a press or
//   Escape until the pointer or focus leaves and returns;
// - with the same text the accessible name already announces, so the tag is
//   `aria-hidden` and never joins the control's `aria-labelledby` — assistive
//   technology hears the name once.
//
// One tag shows at a time: a `popover="manual"` element in the top layer,
// placed 8px below its trigger (flipping above when short, kept 8px clear of
// the viewport edge) and following it while shown. It lives in a body-level
// layer (re-attached if a body morph drops it, and removed again once
// hidden), outside the control so the morph never sees it and `:has()`
// selectors on the control ignore it, and copies its trigger's
// `color-scheme`. Its look is a small stylesheet the install adopts, at zero
// specificity so a theme can restyle it. A button that already has a native
// `title`, or a Web Awesome tooltip `for` it, keeps that and gets no second
// tag.

import { followAnchor, positionPopup } from '../shared/popup/position-popup.js';

/** Hover delay before a help tag appears. */
export const HELP_TAG_SHOW_DELAY = 500;
/** After a tag closes, a neighboring trigger shows its tag at once for this long. */
export const HELP_TAG_WARM_WINDOW = 400;
/** A tag shifted inward stays this far from the viewport edge. */
export const HELP_TAG_VIEWPORT_MARGIN = 8;
/** The gap between a tag and its trigger. */
export const HELP_TAG_GAP = 8;

/**
 * The tag's look: the loud neutral fill and its on-loud text (14px), a 3px
 * radius, and a scale-and-fade entrance unless motion is reduced. Every
 * selector is wrapped in `:where()`, so any theme rule wins.
 */
export const HELP_TAG_STYLES = `
:where(.kui-help-tag) {
  position: fixed;
  inset: auto;
  box-sizing: border-box;
  width: max-content;
  max-width: min(30ch, var(--_kui-popup-available-width, 100vw));
  margin: 0;
  padding: 0.25em 0.5em;
  overflow: hidden;
  color: var(--kui-color-neutral-on-loud, #fff);
  font: inherit;
  font-size: var(--kui-font-s, 0.875rem);
  line-height: 1.6;
  text-align: start;
  white-space: normal;
  border: 1px solid var(--kui-color-neutral-fill-loud, #48484a);
  border-radius: 3px;
  background: var(--kui-color-neutral-fill-loud, #48484a);
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
@media (prefers-reduced-motion: no-preference) {
  :where(:root:not([data-kui-effects="static"]) .kui-help-tag:popover-open) {
    animation: kui-help-tag-show 150ms ease;
  }
  :where(.kui-help-tag[data-placement^="top"]) {
    transform-origin: bottom;
  }
  :where(.kui-help-tag[data-placement^="bottom"]) {
    transform-origin: top;
  }
}
@keyframes kui-help-tag-show {
  from {
    opacity: 0;
    scale: 0.8;
  }
}
@media (forced-colors: active) {
  :where(.kui-help-tag) {
    color: CanvasText;
    border-color: CanvasText;
    background: Canvas;
  }
}
`;

type HelpTagHost = HTMLElement;

export interface HelpTagOptions {
  /** Whether a newly focused element shows keyboard focus. */
  focusVisible?: (element: Element) => boolean;
}

const installed = new WeakSet<Document>();

/**
 * Adopt the tag's stylesheet into `doc` once. A document without a window
 * (one built by `createHTMLDocument`) never renders, so it needs none.
 */
function adoptStyles(doc: Document): void {
  const view = doc.defaultView;
  if (!view) return;
  const sheet = new view.CSSStyleSheet();
  sheet.replaceSync(HELP_TAG_STYLES);
  doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
}

/** Whether the engine implements the Popover API on `element`. */
const popoverSupported = (element: HTMLElement): boolean =>
  typeof element.showPopover === 'function';

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

const MENU_LABEL = ':scope > .kui-popup-menu__trigger > .kui-popup-menu__label';

/** A plain control (not a Web Awesome popup host) gets a body-layer tag. */
const isPlainControl = (host: HelpTagHost): boolean =>
  host.localName === 'button' || host.localName === 'a';

/** A Select root: its trigger, value, and listbox are light DOM. */
const isSelect = (host: HelpTagHost): boolean =>
  host.dataset.component === 'select';

/** Whether the control's own popup is showing. */
const popupOpen = (host: HelpTagHost): boolean =>
  isSelect(host)
    ? host.hasAttribute('open')
    : host
        .querySelector(':scope > .kui-popup-menu__trigger')
        ?.getAttribute('aria-expanded') === 'true';

/** An element's text with whitespace collapsed (an element's is never null). */
const words = (node: Element): string =>
  (node.textContent as string).replace(/\s+/g, ' ').trim();

/** The trimmed `aria-label` of a plain control. */
const ariaLabel = (control: Element): string =>
  (control.getAttribute('aria-label') ?? '').replace(/\s+/g, ' ').trim();

/**
 * An icon-only toolbar button or link (inside a `ToolbarControlGroup`) or an
 * icon-only `Button`: named by `aria-label`, with no visible text, and without
 * a native `title` or a Web Awesome tooltip of its own that a second tag would
 * duplicate.
 */
function isToolbarIconControl(target: HTMLElement): boolean {
  if (!target.matches('button, a[href]')) return false;
  if (!ariaLabel(target) || target.hasAttribute('title') || words(target))
    return false;
  if (
    !target.closest('.kui-toolbar-control-group, .kui-button[data-icon-only]')
  )
    return false;
  return !(
    target.id &&
    target.ownerDocument.querySelector(
      `wa-tooltip[for="${CSS.escape(target.id)}"]`,
    )
  );
}

/** The icon-only Kerf control on an event path, if any. */
function helpTagHost(path: readonly EventTarget[]): HelpTagHost | null {
  for (const target of path) {
    if (!(target instanceof HTMLElement)) continue;
    if (isToolbarIconControl(target)) return target;
    const { component, selectedPresentation } = target.dataset;
    if (
      component === 'select' &&
      target.localName === 'kui-select' &&
      selectedPresentation === 'icon-only'
    )
      return target;
    // A content trigger (a Badge) shows its own meaning, so it gets no tag.
    if (
      component === 'popup-menu' &&
      target.dataset.trigger !== 'content' &&
      target.querySelector(MENU_LABEL)
    )
      return target;
  }
  return null;
}

/** The visible trigger the tag describes and anchors to. */
function anchorOf(host: HelpTagHost): Element | null {
  if (isPlainControl(host)) return host;
  return host.querySelector(
    isSelect(host)
      ? ':scope > .kui-select__trigger'
      : ':scope > .kui-popup-menu__trigger',
  );
}

/** The tag text: the same words as the trigger's accessible name. */
function helpText(host: HelpTagHost): string {
  if (isPlainControl(host)) return ariaLabel(host);
  if (!isSelect(host)) return words(host.querySelector(MENU_LABEL)!);
  // A Select's trigger name (a multiple icon trigger's already ends with the
  // chosen labels), then a single choice's visually hidden value.
  const trigger = anchorOf(host)!;
  const name = ariaLabel(trigger);
  const value = trigger.querySelector('.kui-select__value');
  const choice = value ? words(value) : '';
  return choice && choice !== name ? `${name}: ${choice}` : name;
}

/**
 * Install once at an explicit registration boundary. Idempotent per document.
 */
export function installHelpTags(
  doc: Document = document,
  { focusVisible = isFocusVisible }: HelpTagOptions = {},
): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  adoptStyles(doc);
  let hovered: HelpTagHost | null = null;
  let focused: HelpTagHost | null = null;
  // The trigger whose tag is open, and how to stop following it.
  let shown: { host: HelpTagHost; stop: () => void } | null = null;
  // A press, Escape, or an opened popup suppresses that trigger's tag.
  let dismissed: HelpTagHost | null = null;
  let timer: number | undefined;
  let warmUntil = 0;
  let layer: HTMLElement | null = null;
  // The one tag element, reused for every trigger.
  let tag: HTMLElement | null = null;

  // The body-level home of the tag. Its fixed, zero-size box keeps it out of
  // a grid or flex body's flow; a body morph that drops it is repaired on the
  // next show.
  const layerRoot = (): HTMLElement => {
    if (!layer) {
      layer = doc.createElement('div');
      layer.className = 'kui-help-tag-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.setAttribute('data-morph-skip', '');
      Object.assign(layer.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '0',
        height: '0',
      });
    }
    if (!layer.isConnected) doc.body.append(layer);
    return layer;
  };

  const tagElement = (): HTMLElement => {
    if (!tag) {
      tag = doc.createElement('div');
      tag.className = 'kui-help-tag';
      tag.setAttribute('popover', 'manual');
      tag.setAttribute('aria-hidden', 'true');
    }
    return tag;
  };

  const hide = (host: HelpTagHost) => {
    if (shown?.host !== host) return;
    shown.stop();
    shown = null;
    // A hidden tag leaves the layer. (Hiding a popover a morph already hid,
    // by dropping the layer, is a no-op.)
    const current = tagElement();
    if (popoverSupported(current)) current.hidePopover();
    current.remove();
    warmUntil = Date.now() + HELP_TAG_WARM_WINDOW;
  };

  const show = (host: HelpTagHost) => {
    window.clearTimeout(timer);
    timer = undefined;
    if (popupOpen(host) || dismissed === host || !host.isConnected) return;
    const anchor = anchorOf(host);
    const text = helpText(host);
    if (!anchor || !text) return;
    if (shown) hide(shown.host);
    const current = tagElement();
    layerRoot().append(current);
    // The tag takes its trigger's light or dark scheme, which a subtree
    // theme (`.wa-dark`) may set below the document root.
    current.style.colorScheme = window.getComputedStyle(anchor).colorScheme;
    current.textContent = text;
    // Without the Popover API (a test DOM), the fixed tag still shows, just
    // outside the top layer.
    if (popoverSupported(current)) current.showPopover();
    const stop = followAnchor(
      anchor,
      current,
      () =>
        void positionPopup(anchor, current, {
          placement: 'bottom',
          gap: HELP_TAG_GAP,
          padding: HELP_TAG_VIEWPORT_MARGIN,
        }),
    );
    shown = { host, stop };
  };

  /** The tagged host whose trigger (not its popup) is on the path. */
  const triggerHost = (event: Event): HelpTagHost | null => {
    const path = event.composedPath();
    const host = helpTagHost(path);
    if (!host) return null;
    const anchor = anchorOf(host);
    return anchor && path.includes(anchor) ? host : null;
  };

  // A pending hover belongs to the hovered trigger; a tag stays while either
  // the pointer or keyboard focus is still on its trigger.
  const leave = (host: HelpTagHost) => {
    if (hovered !== host) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    if (hovered !== host && focused !== host) hide(host);
  };

  // A press, Escape, or an opened popup dismisses a trigger's tag until the
  // pointer moves onto something else while the popup is closed, or focus
  // leaves the control.
  const release = (host: HelpTagHost | null) => {
    if (dismissed && dismissed !== host && !popupOpen(dismissed))
      dismissed = null;
  };

  doc.addEventListener(
    'pointerover',
    (event) => {
      if ((event as PointerEvent).pointerType === 'touch') return;
      const host = triggerHost(event);
      release(host);
      if (host === hovered) return;
      const previous = hovered;
      hovered = host;
      if (previous) leave(previous);
      if (
        !host ||
        popupOpen(host) ||
        dismissed === host ||
        shown?.host === host
      )
        return;
      window.clearTimeout(timer);
      if (Date.now() < warmUntil) show(host);
      else timer = window.setTimeout(() => show(host), HELP_TAG_SHOW_DELAY);
    },
    true,
  );

  doc.addEventListener(
    'pointerout',
    (event) => {
      // Leaving the window: nothing new is hovered.
      if ((event as PointerEvent).relatedTarget !== null || !hovered) return;
      const previous = hovered;
      hovered = null;
      leave(previous);
    },
    true,
  );

  // A pending hover show for this host re-checks the dismissal and no-ops.
  const dismiss = (host: HelpTagHost) => {
    dismissed = host;
    hide(host);
  };

  doc.addEventListener(
    'pointerdown',
    (event) => {
      const host = helpTagHost(event.composedPath());
      if (host) dismiss(host);
    },
    true,
  );

  doc.addEventListener(
    'focusin',
    (event) => {
      // Only keyboard focus (`:focus-visible`) shows a tag; a click focuses
      // the trigger without one.
      const target = event.composedPath()[0];
      const host =
        target instanceof Element && focusVisible(target)
          ? triggerHost(event)
          : null;
      if (host === focused) return;
      const previous = focused;
      focused = host;
      if (previous) leave(previous);
      if (host && dismissed !== host) show(host);
    },
    true,
  );

  doc.addEventListener(
    'focusout',
    (event) => {
      const host = helpTagHost(event.composedPath());
      // Focus moving within the control (into its popup and back) is handled
      // by focusin; only focus leaving the control ends a dismissal.
      const next = (event as FocusEvent).relatedTarget;
      if (!host || (next instanceof Node && host.contains(next))) return;
      if (dismissed === host) dismissed = null;
      if (host !== focused) return;
      focused = null;
      leave(host);
    },
    true,
  );

  doc.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && shown) dismiss(shown.host);
    },
    true,
  );

  // Opening the popup (a native popover) hides the tag: the popup itself now
  // shows the choices.
  doc.addEventListener(
    'beforetoggle',
    (event) => {
      const menu = event.target;
      if (
        (event as ToggleEvent).newState !== 'open' ||
        !(menu instanceof HTMLElement) ||
        !menu.matches(
          '.kui-popup-menu > .kui-popup-menu__menu, kui-select > .kui-select__popup',
        )
      )
        return;
      const host = menu.parentElement as HelpTagHost;
      if (helpTagHost([host]) === host) dismiss(host);
    },
    true,
  );

  // Keep a visible tag's text in step with the selection.
  const refresh = (event: Event) => {
    const host = helpTagHost(event.composedPath());
    if (shown && host === shown.host) tagElement().textContent = helpText(host);
  };
  doc.addEventListener('change', refresh, true);
  doc.addEventListener('input', refresh, true);
}
