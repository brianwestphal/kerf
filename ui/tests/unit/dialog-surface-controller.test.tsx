import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeDialog,
  DIALOG_MOTION_ATTRIBUTE,
  FOOTER_BLOCK_SIZE_PROPERTY,
  HEADER_BLOCK_SIZE_PROPERTY,
  HEADER_DIVIDER_PROPERTY,
  installDialogSurfaces,
  KEYBOARD_INSET_PROPERTY,
  keyboardInset,
  openDialog,
  SHEET_HEIGHT_PROPERTY,
} from '../../src/components/surfaces/surface-scaffold/internal/dialog-surface-controller.js';
import {
  DialogSurface,
  type DialogSurfaceProps,
} from '../../src/components/surfaces/surface-scaffold/surface-scaffold.js';

/** Every ResizeObserver the controller creates, to drive by hand. */
type ResizeCallback = (
  entries: { target: Element; borderBoxSize?: { blockSize: number }[] }[],
) => void;
const resizeObservers: { callback: ResizeCallback; targets: Element[] }[] = [];

class FakeResizeObserver {
  readonly entry: { callback: ResizeCallback; targets: Element[] };
  constructor(callback: ResizeCallback) {
    this.entry = { callback, targets: [] };
    resizeObservers.push(this.entry);
  }
  observe(target: Element) {
    this.entry.targets.push(target);
  }
  disconnect() {
    this.entry.targets.length = 0;
  }
}

/** A stand-in visual viewport whose listeners the test fires. */
const viewport = {
  height: 800,
  offsetTop: 0,
  scale: 1,
  listeners: new Map<string, () => void>(),
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  },
  removeEventListener(type: string) {
    this.listeners.delete(type);
  },
};

beforeEach(() => {
  resizeObservers.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  installDialogSurfaces();
});

afterEach(() => {
  for (const dialog of document.querySelectorAll('dialog'))
    if (dialog.open) dialog.close();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const flush = () =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

function setup(props: Partial<DialogSurfaceProps> = {}) {
  const host = document.createElement('div');
  host.innerHTML = String(
    DialogSurface({
      id: 'edit',
      label: 'Edit',
      footer: (
        <button type="button" data-dialog-close>
          Cancel
        </button>
      ),
      children: <p>Body</p>,
      ...props,
    } as DialogSurfaceProps),
  );
  document.body.append(host);
  const dialog = host.querySelector('dialog')!;
  const requests: string[] = [];
  dialog.addEventListener('kui-request-close', (event) =>
    requests.push((event as CustomEvent<{ source: string }>).detail.source),
  );
  return { host, dialog, requests };
}

const click = (target: Element, init: MouseEventInit = {}) =>
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
  );

const pointerDown = (target: Element, init: PointerEventInit = {}) =>
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, ...init }),
  );

/** Give the panel a box, so presses can land inside or outside it. */
const placePanel = (dialog: HTMLElement) =>
  vi
    .spyOn(dialog, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(100, 100, 400, 300));

/** Make the panel report a running animation of `duration`. */
function animate(duration: string) {
  const real = globalThis.getComputedStyle;
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
    (element, pseudo) => {
      const style = real(element, pseudo);
      if (!(element instanceof HTMLDialogElement)) return style;
      return {
        ...style,
        animationName: 'kui-dialog-surface-show, other',
        animationDuration: duration,
      } as CSSStyleDeclaration;
    },
  );
}

describe('openDialog and closeDialog', () => {
  it('opens modally with focus on the panel and closes, idempotently', () => {
    const { dialog } = setup();
    openDialog(dialog);
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(dialog);
    // No animation runs (none in happy-dom): the motion ends at once.
    expect(dialog.hasAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe(false);
    openDialog(dialog);
    expect(dialog.open).toBe(true);
    closeDialog(dialog);
    expect(dialog.open).toBe(false);
    closeDialog(dialog);
    expect(dialog.open).toBe(false);
  });

  it('leaves focus to an autofocus element', () => {
    const { dialog } = setup({
      children: <input autofocus aria-label="Name" />,
    });
    const focus = vi.spyOn(dialog, 'focus');
    openDialog(dialog);
    expect(focus).not.toHaveBeenCalled();
  });

  it('plays the enter and exit motions for their durations', () => {
    vi.useFakeTimers();
    animate('0.15s, 300ms');
    const { dialog } = setup();
    openDialog(dialog);
    expect(dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe('enter');
    vi.advanceTimersByTime(300);
    expect(dialog.hasAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe(false);
    closeDialog(dialog);
    expect(dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe('exit');
    expect(dialog.open).toBe(true);
    // A second close while the exit runs changes nothing.
    closeDialog(dialog);
    vi.advanceTimersByTime(300);
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe(false);
  });

  it('keeps a dialog reopened during its exit motion open', () => {
    vi.useFakeTimers();
    animate('150ms');
    const { dialog } = setup();
    openDialog(dialog);
    vi.advanceTimersByTime(150);
    closeDialog(dialog);
    openDialog(dialog);
    expect(dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe('enter');
    vi.advanceTimersByTime(500);
    expect(dialog.open).toBe(true);
  });

  it('still closes when a re-render drops the motion marker', () => {
    vi.useFakeTimers();
    animate('150ms');
    const { dialog } = setup();
    openDialog(dialog);
    closeDialog(dialog);
    dialog.removeAttribute(DIALOG_MOTION_ATTRIBUTE);
    vi.advanceTimersByTime(150);
    expect(dialog.open).toBe(false);
  });

  it('closes, and pulses at once, a dialog the application opened natively', () => {
    const { dialog } = setup();
    dialog.showModal();
    placePanel(dialog);
    pointerDown(dialog, { clientX: 10, clientY: 10 });
    click(dialog, { clientX: 10, clientY: 10 });
    expect(dialog.hasAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe(false);
    closeDialog(dialog);
    expect(dialog.open).toBe(false);
  });

  it('measures no header without one, and lets go of a removed grabber', async () => {
    const { dialog } = setup({
      withoutHeader: true,
      presentation: 'bottom-sheet',
      resizable: true,
    });
    openDialog(dialog);
    expect(dialog.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe('');
    const handle = dialog.querySelector('.kui-dialog-surface__sheet-handle')!;
    handle.remove();
    await flush();
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('');
  });
});

describe('close requests', () => {
  it('keeps the native close request with quiet emphasis and an accessible label', () => {
    const normal = setup({ closeLabel: 'Dismiss' }).dialog.querySelector(
      '.kui-dialog-surface__close',
    )!;
    expect(normal.getAttribute('aria-label')).toBe('Dismiss');
    expect(normal.hasAttribute('data-emphasis')).toBe(false);
    expect(normal.querySelector('svg')?.getAttribute('data-size')).toBe('l');

    const { dialog, requests } = setup({
      closeLabel: 'Dismiss setup',
      closeEmphasis: 'quiet',
    });
    const close = dialog.querySelector('.kui-dialog-surface__close')!;
    expect(close.localName).toBe('button');
    expect(close.getAttribute('aria-label')).toBe('Dismiss setup');
    expect(close.getAttribute('data-emphasis')).toBe('quiet');
    expect(close.querySelector('svg')?.getAttribute('data-size')).toBe('m');
    openDialog(dialog);
    click(close);
    expect(requests).toEqual(['close-button']);
    expect(dialog.open).toBe(false);
  });

  it('closes from the close button and data-dialog-close, which a listener may refuse', () => {
    const { dialog, requests } = setup();
    openDialog(dialog);
    click(dialog.querySelector('.kui-dialog-surface__close svg')!);
    expect(requests).toEqual(['close-button']);
    expect(dialog.open).toBe(false);

    openDialog(dialog);
    const refuse = (event: Event) => event.preventDefault();
    dialog.addEventListener('kui-request-close', refuse);
    click(dialog.querySelector('footer [data-dialog-close]')!);
    expect(requests).toEqual(['close-button', 'close-button']);
    expect(dialog.open).toBe(true);
    dialog.removeEventListener('kui-request-close', refuse);
  });

  it('pulses a refused close', () => {
    vi.useFakeTimers();
    animate('250ms');
    const { dialog } = setup();
    openDialog(dialog);
    vi.advanceTimersByTime(250);
    dialog.addEventListener('kui-request-close', (event) =>
      event.preventDefault(),
    );
    click(dialog.querySelector('.kui-dialog-surface__close')!);
    expect(dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe('pulse');
    vi.advanceTimersByTime(250);
    expect(dialog.hasAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe(false);
    expect(dialog.open).toBe(true);
  });

  it('asks to close on Escape (the cancel event), which a listener may refuse', () => {
    const { dialog, requests } = setup();
    openDialog(dialog);
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(requests).toEqual(['escape']);
    expect(dialog.open).toBe(false);
    // A cancel on another dialog is not ours.
    const other = document.createElement('dialog');
    document.body.append(other);
    const foreign = new Event('cancel', { cancelable: true });
    other.dispatchEvent(foreign);
    expect(foreign.defaultPrevented).toBe(false);
  });

  it('light-dismisses on a backdrop press, and pulses without lightDismiss', () => {
    const light = setup({ lightDismiss: true });
    openDialog(light.dialog);
    placePanel(light.dialog);
    // A press inside the panel, or one that starts inside and ends outside,
    // is not a backdrop press.
    pointerDown(light.dialog, { clientX: 200, clientY: 200 });
    click(light.dialog, { clientX: 200, clientY: 200 });
    pointerDown(light.dialog, { clientX: 200, clientY: 200 });
    click(light.dialog, { clientX: 10, clientY: 10 });
    expect(light.dialog.open).toBe(true);
    pointerDown(light.dialog, { clientX: 10, clientY: 10 });
    click(light.dialog, { clientX: 10, clientY: 10 });
    expect(light.requests).toEqual(['backdrop']);
    expect(light.dialog.open).toBe(false);

    vi.useFakeTimers();
    animate('250ms');
    const { dialog, requests } = setup({ id: 'strict' });
    openDialog(dialog);
    vi.advanceTimersByTime(250);
    placePanel(dialog);
    pointerDown(dialog, { clientX: 700, clientY: 700 });
    click(dialog, { clientX: 700, clientY: 700 });
    expect(requests).toEqual([]);
    expect(dialog.getAttribute(DIALOG_MOTION_ATTRIBUTE)).toBe('pulse');
    expect(dialog.open).toBe(true);
  });

  it('ignores clicks outside open dialogs and closers of another dialog', () => {
    const { dialog, requests } = setup();
    const outer = document.createElement('button');
    outer.setAttribute('data-dialog-close', '');
    document.body.append(outer);
    click(outer);
    // A closed dialog's closer does nothing.
    click(dialog.querySelector('.kui-dialog-surface__close')!);
    openDialog(dialog);
    // A closer inside a nested dialog belongs to that dialog.
    const nested = setup({ id: 'nested', label: 'Nested' });
    dialog.querySelector('.kui-dialog-surface__body')!.append(nested.host);
    click(nested.dialog.querySelector('.kui-dialog-surface__close')!);
    click(dialog.querySelector('p')!);
    document.body.dispatchEvent(new Event('close'));
    expect(requests).toEqual([]);
    expect(dialog.open).toBe(true);
    expect(installDialogSurfaces()).toBe(undefined);
  });
});

describe('while open', () => {
  it('measures the header and footer and keeps the sizes across a re-render', async () => {
    const { dialog } = setup({ headerPresentation: 'floating' });
    const header = dialog.querySelector<HTMLElement>(
      '.kui-dialog-surface__header',
    )!;
    const footer = dialog.querySelector<HTMLElement>(
      '.kui-dialog-surface__footer',
    )!;
    const height = (element: HTMLElement, value: number) =>
      Object.defineProperty(element, 'offsetHeight', {
        configurable: true,
        value,
      });
    height(header, 56);
    height(footer, 76);
    openDialog(dialog);
    expect(dialog.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '56px',
    );
    expect(dialog.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '76px',
    );
    // A re-render resets the style attribute; the sizes come back.
    dialog.setAttribute('style', '--_kui-dialog-surface-height:480px');
    await flush();
    expect(dialog.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '56px',
    );
    expect(dialog.style.getPropertyValue('--_kui-dialog-surface-height')).toBe(
      '480px',
    );
    // The chrome resizes.
    // A resize observation reports the exact border box.
    resizeObservers[0]!.callback([
      { target: footer, borderBoxSize: [{ blockSize: 96.5 }] },
      { target: header, borderBoxSize: undefined },
    ]);
    expect(dialog.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '96.5px',
    );
    // A re-render that drops the footer drops its size, and a new header is
    // followed.
    footer.remove();
    const replaced = header.cloneNode(true) as HTMLElement;
    height(replaced, 64);
    header.replaceWith(replaced);
    await flush();
    expect(dialog.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe('');
    expect(dialog.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '64px',
    );
    expect(resizeObservers[0]!.targets).toEqual([replaced]);
    // Closed, the controller lets go of everything it set.
    closeDialog(dialog);
    expect(dialog.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe('');
    expect(resizeObservers[0]!.targets).toEqual([]);
  });

  it('shows a floating header divider while content scrolls beneath it', () => {
    const { dialog } = setup({ headerPresentation: 'floating' });
    const header = dialog.querySelector('.kui-dialog-surface__header')!;
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 56),
    );
    const body = dialog.querySelector<HTMLElement>(
      '.kui-dialog-surface__body',
    )!;
    vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 300),
    );
    openDialog(dialog);
    const scroll = (element: HTMLElement, top: number) => {
      Object.defineProperty(element, 'scrollTop', {
        configurable: true,
        value: top,
      });
      element.dispatchEvent(new Event('scroll'));
    };
    scroll(body, 40);
    expect(dialog.style.getPropertyValue(HEADER_DIVIDER_PROPERTY)).toBe(
      'var(--_kui-dialog-surface-header-divider-color)',
    );
    // A scroller that starts below the header never counts.
    const lower = document.createElement('div');
    body.append(lower);
    vi.spyOn(lower, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 120, 400, 100),
    );
    scroll(lower, 40);
    // A scroller that left keeps no divider of its own.
    const gone = document.createElement('div');
    body.append(gone);
    vi.spyOn(gone, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 400, 100),
    );
    scroll(gone, 40);
    gone.remove();
    scroll(body, 0);
    expect(dialog.style.getPropertyValue(HEADER_DIVIDER_PROPERTY)).toBe('');
    // A docked header draws none.
    dialog.removeAttribute('data-header-presentation');
    scroll(body, 40);
    expect(dialog.style.getPropertyValue(HEADER_DIVIDER_PROPERTY)).toBe('');
  });

  it('follows the virtual keyboard and resizes a bottom sheet, kept across a re-render', async () => {
    vi.stubGlobal('visualViewport', viewport);
    vi.stubGlobal('innerHeight', 800);
    const { dialog } = setup({
      presentation: 'bottom-sheet',
      resizable: true,
    });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 400, 390, 400),
    );
    openDialog(dialog);
    const handle = dialog.querySelector<HTMLElement>(
      '.kui-dialog-surface__sheet-handle',
    )!;
    expect(handle.getAttribute('aria-valuenow')).toBe('400');
    viewport.height = 500;
    viewport.listeners.get('resize')!();
    expect(dialog.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe(
      '300px',
    );
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('416px');
    dialog.setAttribute('style', '');
    await flush();
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('416px');
    // A re-render that replaces the grabber rewires the new one.
    const replaced = handle.cloneNode(true) as HTMLElement;
    handle.replaceWith(replaced);
    await flush();
    replaced.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('384px');
    viewport.height = 800;
    viewport.listeners.get('scroll')!();
    expect(dialog.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
    // Each opening starts at the configured height again.
    closeDialog(dialog);
    expect(viewport.listeners.size).toBe(0);
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('');
  });

  it('resizes a sheet by dragging its grabber within the sheet bounds', () => {
    const { dialog } = setup({
      presentation: 'bottom-sheet',
      resizable: true,
    });
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 400, 390, 400),
    );
    openDialog(dialog);
    const handle = dialog.querySelector<HTMLElement>(
      '.kui-dialog-surface__sheet-handle',
    )!;
    handle.setPointerCapture = vi.fn();
    // Only a primary-button press drags.
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { button: 2, clientY: 400 }),
    );
    expect(handle.setPointerCapture).not.toHaveBeenCalled();
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        clientY: 400,
        pointerId: 3,
      }),
    );
    expect(handle.setPointerCapture).toHaveBeenCalledWith(3);
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: 300 }));
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('500px');
    handle.dispatchEvent(new PointerEvent('pointerup'));
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: 0 }));
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('500px');
    // A capped sheet stops at its cap, and focus reports the bounds.
    dialog.style.maxHeight = '450px';
    handle.dispatchEvent(new FocusEvent('focus'));
    expect(handle.getAttribute('aria-valuemax')).toBe('450');
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(dialog.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('450px');
    // Keys the grabber does not use pass through.
    const tab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    handle.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('measures the keyboard overlap only when the layout does not resize', () => {
    expect(keyboardInset({ height: 500, offsetTop: 0, scale: 1 }, 800)).toBe(
      300,
    );
    expect(keyboardInset({ height: 800, offsetTop: 0, scale: 1 }, 800)).toBe(0);
    expect(keyboardInset({ height: 400, offsetTop: 0, scale: 2 }, 800)).toBe(0);
  });

  it('skips the keyboard where there is no visual viewport', () => {
    const { dialog } = setup({ presentation: 'bottom-sheet' });
    openDialog(dialog);
    expect(dialog.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
  });
});
