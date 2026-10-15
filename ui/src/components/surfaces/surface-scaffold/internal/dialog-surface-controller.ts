import { syncSheetHandleValues, wireSheetHandle } from './sheet-handle.js';

/** What asked an open DialogSurface to close. */
export type DialogCloseSource = 'close-button' | 'escape' | 'backdrop';

/** The detail of a DialogSurface's cancelable `kui-request-close` event. */
export interface DialogRequestCloseDetail {
  readonly source: DialogCloseSource;
}

const SURFACE = 'dialog.kui-dialog-surface';

/** The attribute marking a running enter, exit, or pulse animation. */
export const DIALOG_MOTION_ATTRIBUTE = 'data-kui-dialog-motion';

/** The panel variable a floating header's body clearance reads. */
export const HEADER_BLOCK_SIZE_PROPERTY =
  '--_kui-dialog-surface-header-block-size';

/** The panel variable a floating footer's body clearance reads. */
export const FOOTER_BLOCK_SIZE_PROPERTY =
  '--_kui-dialog-surface-footer-block-size';

/**
 * The panel variable a floating header's divider reads: set while content
 * is scrolled away beneath the header, unset (no divider) otherwise.
 */
export const HEADER_DIVIDER_PROPERTY = '--_kui-dialog-surface-header-divider';

/** The panel variable holding a resized sheet's visible height. */
export const SHEET_HEIGHT_PROPERTY = '--_kui-dialog-surface-sheet-height';

/** The panel variable holding the virtual keyboard's overlap. */
export const KEYBOARD_INSET_PROPERTY = '--_kui-dialog-surface-keyboard-inset';

/** The value published while the divider shows: the color the CSS owns. */
const DIVIDER_SHOWN = 'var(--_kui-dialog-surface-header-divider-color)';

/**
 * Scroll distance, in px, that counts as "away from the top": a scroller at
 * rest can report a fractional offset.
 */
const SCROLL_THRESHOLD = 1;

type Motion = 'enter' | 'exit' | 'pulse';

interface OpenState {
  /** Panel variables the controller owns while open, restored after a morph. */
  readonly owned: Map<string, string>;
  readonly stop: (() => void)[];
  motionTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  closing: boolean;
}

const states = new WeakMap<HTMLDialogElement, OpenState>();
const installed = new WeakSet<Document>();

const isSurface = (target: EventTarget | null): target is HTMLDialogElement =>
  target instanceof Element && target.matches(SURFACE);

/**
 * The layout viewport's bottom band a virtual keyboard covers: what the
 * visual viewport no longer shows below itself. Zero while pinch-zoomed (the
 * visual viewport then shrinks for another reason) and wherever the keyboard
 * resizes the layout viewport instead (`interactive-widget=resizes-content`).
 */
export function keyboardInset(
  viewport: Pick<VisualViewport, 'height' | 'offsetTop' | 'scale'>,
  layoutHeight: number,
): number {
  if (viewport.scale > 1.01) return 0;
  const inset = Math.round(layoutHeight - viewport.height - viewport.offsetTop);
  return inset > 0 ? inset : 0;
}

/** The longest running animation on the panel, in ms (0 when none runs). */
function motionDuration(dialog: HTMLElement): number {
  const style = globalThis.getComputedStyle(dialog);
  if (!style.animationName || style.animationName === 'none') return 0;
  return Math.max(
    0,
    ...style.animationDuration.split(',').map((part) => {
      const value = parseFloat(part);
      return part.trim().endsWith('ms') ? value : value * 1000;
    }),
  );
}

/**
 * Mark a motion while its keyframes run, then finish it. A timer, not
 * `animationend`, ends it, so an application re-render that drops the marker
 * mid-animation still closes the dialog.
 */
function runMotion(
  dialog: HTMLDialogElement,
  motion: Motion,
  done?: () => void,
): void {
  const state = states.get(dialog);
  if (state) globalThis.clearTimeout(state.motionTimer);
  dialog.setAttribute(DIALOG_MOTION_ATTRIBUTE, motion);
  const finish = () => {
    done?.();
    if (dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE) === motion)
      dialog.removeAttribute(DIALOG_MOTION_ATTRIBUTE);
  };
  const duration = motionDuration(dialog);
  if (duration === 0 || !state) finish();
  else state.motionTimer = globalThis.setTimeout(finish, duration);
}

/** Set (or, with `null`, clear) a panel variable the controller owns. */
function own(
  dialog: HTMLDialogElement,
  property: string,
  value: string | null,
): void {
  const owned = states.get(dialog)?.owned;
  if (value === null) {
    owned?.delete(property);
    dialog.style.removeProperty(property);
    return;
  }
  owned?.set(property, value);
  if (dialog.style.getPropertyValue(property) !== value)
    dialog.style.setProperty(property, value);
}

/** Watch an open dialog: owned state, chrome sizes, divider, and sheet. */
function follow(dialog: HTMLDialogElement, state: OpenState): void {
  const sheet = dialog.getAttribute('data-presentation') === 'bottom-sheet';
  // Layout sizes, not boxes: the panel opens scaled while its enter motion
  // runs. A resize observation reports the exact border box; until the first
  // one, `offsetHeight` stands in.
  const blockSizes = new WeakMap<Element, number>();
  const sizes = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.borderBoxSize?.[0];
      if (box) blockSizes.set(entry.target, box.blockSize);
    }
    measure();
  });
  const blockSize = (element: HTMLElement) =>
    `${blockSizes.get(element) ?? element.offsetHeight}px`;
  let header: HTMLElement | null = null;
  let footer: HTMLElement | null = null;
  let handle: HTMLElement | null = null;
  let unwireHandle: (() => void) | undefined;
  const measure = () => {
    own(dialog, HEADER_BLOCK_SIZE_PROPERTY, header ? blockSize(header) : null);
    own(dialog, FOOTER_BLOCK_SIZE_PROPERTY, footer ? blockSize(footer) : null);
  };
  // The header, footer, and grabber the template renders; a re-render may
  // replace them.
  const track = () => {
    const nextHeader = dialog.querySelector<HTMLElement>(
      ':scope > .kui-dialog-surface__header',
    );
    const nextFooter = dialog.querySelector<HTMLElement>(
      ':scope > .kui-dialog-surface__footer',
    );
    if (nextHeader !== header || nextFooter !== footer) {
      sizes.disconnect();
      header = nextHeader;
      footer = nextFooter;
      for (const element of [header, footer])
        if (element) sizes.observe(element);
      measure();
    }
    const nextHandle = dialog.querySelector<HTMLElement>(
      ':scope > .kui-dialog-surface__sheet-handle',
    );
    if (nextHandle !== handle) {
      unwireHandle?.();
      unwireHandle = undefined;
      handle = nextHandle;
      if (handle) {
        unwireHandle = wireSheetHandle(handle, {
          panel: dialog,
          host: dialog,
          property: SHEET_HEIGHT_PROPERTY,
          enabled: () => true,
          publish: (value) => own(dialog, SHEET_HEIGHT_PROPERTY, value),
        });
        syncSheetHandleValues(handle, dialog);
      }
    }
  };
  track();
  // An application re-render morphs the panel back to its rendered
  // attributes and may replace its chrome: restore the owned variables and
  // follow the new elements.
  const restore = new MutationObserver(() => {
    for (const [property, value] of state.owned)
      if (dialog.style.getPropertyValue(property) !== value)
        dialog.style.setProperty(property, value);
    track();
  });
  restore.observe(dialog, {
    attributes: true,
    attributeFilter: ['style'],
    childList: true,
  });
  // A floating header's divider shows while a scroller reaching beneath it
  // is scrolled away from its top. `scroll` does not bubble: capture it.
  const scrolled = new Set<Element>();
  const onScroll = (event: Event) => {
    const scroller = event.target as Element;
    const floating =
      dialog.getAttribute('data-header-presentation') === 'floating';
    if (
      floating &&
      header &&
      scroller.scrollTop > SCROLL_THRESHOLD &&
      scroller.getBoundingClientRect().top <=
        header.getBoundingClientRect().bottom
    )
      scrolled.add(scroller);
    else scrolled.delete(scroller);
    for (const element of scrolled)
      if (!element.isConnected) scrolled.delete(element);
    own(
      dialog,
      HEADER_DIVIDER_PROPERTY,
      scrolled.size > 0 ? DIVIDER_SHOWN : null,
    );
  };
  dialog.addEventListener('scroll', onScroll, { capture: true, passive: true });
  state.stop.push(() => {
    sizes.disconnect();
    restore.disconnect();
    unwireHandle?.();
    dialog.removeEventListener('scroll', onScroll, { capture: true });
  });
  // A bottom sheet keeps its content above a virtual keyboard.
  const viewport = dialog.ownerDocument.defaultView?.visualViewport;
  if (sheet && viewport) {
    const publish = () => {
      const inset = keyboardInset(viewport, globalThis.innerHeight);
      own(dialog, KEYBOARD_INSET_PROPERTY, inset > 0 ? `${inset}px` : null);
    };
    viewport.addEventListener('resize', publish);
    viewport.addEventListener('scroll', publish);
    state.stop.push(() => {
      viewport.removeEventListener('resize', publish);
      viewport.removeEventListener('scroll', publish);
    });
    publish();
  }
}

/** Stop following a closed dialog and drop the state it owned. */
function settle(dialog: HTMLDialogElement): void {
  const state = states.get(dialog);
  if (!state) return;
  states.delete(dialog);
  globalThis.clearTimeout(state.motionTimer);
  for (const stop of state.stop) stop();
  for (const property of state.owned.keys())
    dialog.style.removeProperty(property);
  dialog.removeAttribute(DIALOG_MOTION_ATTRIBUTE);
}

/**
 * Open a DialogSurface as a modal dialog: in the top layer, the rest of the
 * page inert, focus on its `autofocus` element or else the panel. It plays
 * its enter motion and, with the controller installed here, keeps its
 * measured chrome, sheet height, and keyboard clearance across application
 * re-renders. Opening an open dialog does nothing.
 */
export function openDialog(dialog: HTMLDialogElement): void {
  installDialogSurfaces(dialog.ownerDocument);
  const closing = states.get(dialog);
  if (closing?.closing) {
    // The latest request wins: reopening during the exit motion keeps it open.
    closing.closing = false;
    runMotion(dialog, 'enter');
    return;
  }
  if (dialog.open) return;
  dialog.showModal();
  const state: OpenState = {
    owned: new Map(),
    stop: [],
    motionTimer: undefined,
    closing: false,
  };
  states.set(dialog, state);
  if (!dialog.querySelector('[autofocus]'))
    dialog.focus({ preventScroll: true });
  follow(dialog, state);
  runMotion(dialog, 'enter');
}

/**
 * Close an open DialogSurface after its exit motion. The application's own
 * close is never refused: no `kui-request-close` is dispatched. The native
 * `close` event fires once it has closed.
 */
export function closeDialog(dialog: HTMLDialogElement): void {
  const state = states.get(dialog);
  if (!dialog.open) return;
  if (!state) {
    dialog.close();
    return;
  }
  if (state.closing) return;
  state.closing = true;
  runMotion(dialog, 'exit', () => dialog.close());
}

/**
 * A person asked to close the dialog: dispatch the cancelable
 * `kui-request-close`; refused, the panel pulses, otherwise it closes.
 */
function requestClose(
  dialog: HTMLDialogElement,
  source: DialogCloseSource,
): void {
  const allowed = dialog.dispatchEvent(
    new CustomEvent<DialogRequestCloseDetail>('kui-request-close', {
      bubbles: true,
      cancelable: true,
      detail: { source },
    }),
  );
  if (allowed) closeDialog(dialog);
  else runMotion(dialog, 'pulse');
}

const outside = (dialog: HTMLElement, event: MouseEvent): boolean => {
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
};

/**
 * Wire every DialogSurface in `doc`: the close button and any element with
 * `data-dialog-close`, Escape, and a press on the backdrop (closing with
 * `lightDismiss`, pulsing without) ask to close through `kui-request-close`;
 * a closed dialog stops being followed. `openDialog` installs this itself;
 * the `surface-scaffold/register` entry installs it for the document.
 * Idempotent per document.
 */
export function installDialogSurfaces(doc: Document = document): void {
  if (installed.has(doc)) return;
  installed.add(doc);
  // A backdrop press starts and ends outside the panel; a drag out of the
  // panel (a text selection) is not one.
  let pressedOutside: HTMLDialogElement | null = null;
  doc.addEventListener(
    'pointerdown',
    (event) => {
      pressedOutside =
        isSurface(event.target) && outside(event.target, event)
          ? event.target
          : null;
    },
    true,
  );
  doc.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element;
      const dialog = target.closest?.<HTMLDialogElement>(SURFACE);
      if (!dialog?.open) return;
      if (target === dialog) {
        if (pressedOutside !== dialog || !outside(dialog, event)) return;
        if (dialog.hasAttribute('data-light-dismiss'))
          requestClose(dialog, 'backdrop');
        else runMotion(dialog, 'pulse');
        return;
      }
      const closer = target.closest('[data-dialog-close]');
      if (closer && closer.closest(SURFACE) === dialog) {
        event.preventDefault();
        requestClose(dialog, 'close-button');
      }
    },
    true,
  );
  // Escape fires `cancel`; the dialog closes through the same request.
  doc.addEventListener(
    'cancel',
    (event) => {
      if (!isSurface(event.target)) return;
      event.preventDefault();
      requestClose(event.target, 'escape');
    },
    true,
  );
  // However it closed (including an engine closing it past a refused
  // Escape), stop following it.
  doc.addEventListener(
    'close',
    (event) => {
      if (isSurface(event.target)) settle(event.target);
    },
    true,
  );
}
