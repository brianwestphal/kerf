// Hover and keyboard-focus help tags for icon-only controls.
//
// An icon-only `Select` (single `selectedPresentation="icon-only"` or the
// multiple `triggerIcon` filter), an icon-only `PopupMenu` (a `label` instead
// of visible `text`), and an icon-only `<button>` or link inside a
// `ToolbarControlGroup` (named only by `aria-label`) carry their purpose — and
// a Select its current choice — only in the accessible name. Sighted pointer
// and keyboard users see just the icon, so the registration boundary shows a
// Web Awesome `wa-tooltip` naming the control (Apple HIG "help tag"):
//
// - after a short hover delay, or immediately when a previous tag just closed
//   (moving along a toolbar), and at once on keyboard (`:focus-visible`) focus;
// - never while the control's popup is open, and not again after a press or
//   Escape until the pointer or focus leaves and returns;
// - with the same text the accessible name already announces, so the tag is
//   `aria-hidden` and never joins the control's `aria-labelledby` (a manual
//   trigger with a programmatic anchor, not `for`, so Web Awesome does not
//   add it) — assistive technology hears the name once.
//
// Every tag lives in one body-level layer (re-attached if a body morph drops
// it, and removed again once hidden), outside the control so the morph never
// sees it and `:has()` selectors on the control ignore it, and copies its
// trigger's `color-scheme`; the tag's Popover-API popup renders in the top
// layer, so its place in the document does not affect where or above what it
// shows. A button that already has a native `title`, or a Web Awesome tooltip
// `for` it, keeps that and gets no second tag. Each tag's own lifecycle events
// stop at the tag, so they never reach an application's listeners.

/** Hover delay before a help tag appears. */
export const HELP_TAG_SHOW_DELAY = 500;
/** After a tag closes, a neighboring trigger shows its tag at once for this long. */
export const HELP_TAG_WARM_WINDOW = 400;
/** A tag shifted inward stays this far from the viewport edge. */
export const HELP_TAG_VIEWPORT_MARGIN = 8;

type HelpTagHost = HTMLElement;

interface HelpTag extends HTMLElement {
  open: boolean;
  readonly updateComplete: Promise<unknown>;
  anchor: Element | null;
  trigger: string;
  placement: string;
}

export interface HelpTagOptions {
  /** Whether a newly focused element shows keyboard focus. */
  focusVisible?: (element: Element) => boolean;
}

const LIFECYCLE_EVENTS = [
  'wa-show',
  'wa-after-show',
  'wa-hide',
  'wa-after-hide',
] as const;

const installed = new WeakSet<Document>();

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
 * `IconToggleButton`: named by `aria-label`, with no visible text, and without
 * a native `title` or a Web Awesome tooltip of its own that a second tag would
 * duplicate.
 */
function isToolbarIconControl(target: HTMLElement): boolean {
  if (!target.matches('button, a[href]')) return false;
  if (!ariaLabel(target) || target.hasAttribute('title') || words(target))
    return false;
  if (!target.closest('.kui-toolbar-control-group, .kui-icon-toggle-button'))
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
    if (component === 'popup-menu' && target.querySelector(MENU_LABEL))
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
  const tags = new WeakMap<HelpTagHost, HelpTag>();
  let hovered: HelpTagHost | null = null;
  let focused: HelpTagHost | null = null;
  // The trigger whose tag is open, with that tag.
  let shown: { host: HelpTagHost; tag: HelpTag } | null = null;
  // A press, Escape, or an opened popup suppresses that trigger's tag.
  let dismissed: HelpTagHost | null = null;
  let timer: number | undefined;
  let warmUntil = 0;
  let layer: HTMLElement | null = null;

  // The body-level home of plain controls' tags. Its fixed, zero-size box
  // keeps it out of a grid or flex body's flow; a body morph that drops it is
  // repaired on the next show.
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

  const tagFor = (host: HelpTagHost): HelpTag => {
    const root = layerRoot();
    let tag = tags.get(host);
    if (!tag) {
      tag = doc.createElement('wa-tooltip') as HelpTag;
      tag.className = 'kui-help-tag';
      tag.setAttribute('aria-hidden', 'true');
      tag.setAttribute('trigger', 'manual');
      tag.setAttribute('placement', 'bottom');
      tag.style.pointerEvents = 'none';
      for (const type of LIFECYCLE_EVENTS)
        tag.addEventListener(type, (event) => event.stopPropagation());
      // A hidden tag leaves the layer, so tags for controls that a re-render
      // replaced never accumulate there.
      const created = tag;
      created.addEventListener('wa-after-hide', () => {
        if (created.open) return;
        created.remove();
        tags.delete(host);
      });
      root.append(tag);
      tags.set(host, tag);
    }
    return tag;
  };

  const hide = (host: HelpTagHost) => {
    if (shown?.host !== host) return;
    shown.tag.open = false;
    shown = null;
    warmUntil = Date.now() + HELP_TAG_WARM_WINDOW;
  };

  const show = (host: HelpTagHost) => {
    window.clearTimeout(timer);
    timer = undefined;
    if (popupOpen(host) || dismissed === host || !host.isConnected) return;
    const anchor = anchorOf(host);
    const text = helpText(host);
    if (!anchor || !text) return;
    const tag = tagFor(host);
    if (shown) hide(shown.host);
    // A body-layer tag takes its trigger's light or dark scheme, which a
    // subtree theme (`.wa-dark`) may set below the document root.
    tag.style.colorScheme = window.getComputedStyle(anchor).colorScheme;
    tag.anchor = anchor;
    tag.textContent = text;
    tag.open = true;
    shown = { host, tag };
    // A new tag's first update resets `anchor` from its (null) `for`. Its
    // popup also keeps the standard 8px clear of the viewport edge when it
    // shifts a long tag inward (Web Awesome's tooltip leaves this at 0).
    void tag.updateComplete.then(() => {
      if (tag.anchor !== anchor) tag.anchor = anchor;
      const popup = tag.shadowRoot?.querySelector<
        HTMLElement & { shiftPadding: number }
      >('wa-popup');
      if (popup) popup.shiftPadding = HELP_TAG_VIEWPORT_MARGIN;
    });
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
    if (shown && host === shown.host) shown.tag.textContent = helpText(host);
  };
  doc.addEventListener('change', refresh, true);
  doc.addEventListener('input', refresh, true);
}
