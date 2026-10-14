import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  installBottomSheet,
  KEYBOARD_INSET_PROPERTY,
  keyboardInset,
  SHEET_HANDLE_PART,
  SHEET_HEIGHT_PROPERTY,
  SHEET_MOTION_ATTRIBUTE,
} from '../../src/components/surfaces/surface-scaffold/internal/install-bottom-sheet.js';

// KF-0AGJ5W bottom-sheet DialogSurface: the register injects a resize
// grabber into the wa-dialog shadow panel, follows the virtual keyboard
// through visualViewport while open, and marks the show/hide animation.

type SheetHost = HTMLElement & {
  dialog?: HTMLDialogElement;
  open?: boolean;
  update(changed: unknown): void;
  show(): Promise<void>;
  requestClose(source: Element): Promise<void>;
};

interface FixtureOptions {
  scoped?: boolean;
  presentation?: string;
  resizable?: boolean;
  /** The class Web Awesome's show() / requestClose() adds synchronously. */
  showClass?: string;
  closeClass?: string;
}

function fixture({
  scoped = true,
  presentation = 'bottom-sheet',
  resizable = true,
  showClass = 'show',
  closeClass = 'hide',
}: FixtureOptions = {}) {
  const surface = document.createElement('div');
  if (scoped) surface.className = 'kui-dialog-surface';
  surface.setAttribute('data-presentation', presentation);
  if (resizable) surface.setAttribute('data-resizable', '');
  const host = document.createElement('wa-dialog') as unknown as SheetHost;
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('dialog');
  panel.append(document.createElement('div'));
  shadow.append(panel);
  host.dialog = panel;
  host.open = false;
  let finishShow!: () => void;
  let finishClose!: () => void;
  const update = vi.fn();
  host.update = update;
  host.show = vi.fn(function (this: SheetHost) {
    this.dialog!.classList.add(showClass);
    return new Promise<void>((resolve) => {
      finishShow = () => {
        this.dialog!.classList.remove(showClass);
        resolve();
      };
    });
  });
  host.requestClose = vi.fn(function (this: SheetHost) {
    this.dialog!.classList.add(closeClass);
    return new Promise<void>((resolve) => {
      finishClose = () => {
        this.dialog!.classList.remove(closeClass);
        resolve();
      };
    });
  });
  surface.append(host);
  document.body.append(surface);
  installBottomSheet(host);
  return {
    surface,
    host,
    panel,
    update,
    finishShow: () => finishShow(),
    finishClose: () => finishClose(),
  };
}

const handleOf = (panel: HTMLElement) =>
  panel.querySelector<HTMLElement>(`:scope > [part~="${SHEET_HANDLE_PART}"]`);

/** Give the panel resolved bounds and a current height, as layout would. */
function layout(
  panel: HTMLElement,
  { height = 400, min = 200, max = 800, clearance = 34 } = {},
) {
  panel.style.minHeight = `${min}px`;
  panel.style.maxHeight = `${max}px`;
  panel.style.paddingBlockEnd = `${clearance}px`;
  let current = height;
  vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(
    () => ({ height: current }) as DOMRect,
  );
  return {
    set: (value: number) => {
      current = value;
    },
  };
}

function stubViewport(initial: { height: number; offsetTop?: number }) {
  const listeners = new Map<string, () => void>();
  const viewport = {
    height: initial.height,
    offsetTop: initial.offsetTop ?? 0,
    scale: 1,
    addEventListener: vi.fn((type: string, listener: () => void) =>
      listeners.set(type, listener),
    ),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
  };
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 800);
  return { viewport, listeners };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('bottom sheet keyboard inset', () => {
  it('is what the visual viewport no longer shows below itself', () => {
    expect(keyboardInset({ height: 500, offsetTop: 0, scale: 1 }, 800)).toBe(
      300,
    );
    // A browser that pans the visual viewport to reveal the focused field.
    expect(keyboardInset({ height: 500, offsetTop: 100, scale: 1 }, 800)).toBe(
      200,
    );
    // No keyboard, or one that resized the layout viewport instead.
    expect(keyboardInset({ height: 800, offsetTop: 0, scale: 1 }, 800)).toBe(0);
    expect(keyboardInset({ height: 810, offsetTop: 0, scale: 1 }, 800)).toBe(0);
    // Pinch zoom shrinks the visual viewport for another reason.
    expect(keyboardInset({ height: 400, offsetTop: 0, scale: 2 }, 800)).toBe(0);
  });
});

describe('bottom sheet register', () => {
  it('patches the prototype once and leaves dialogs outside a DialogSurface alone', async () => {
    const { host, panel, update } = fixture({ scoped: false });
    const patched = host.update;
    installBottomSheet(host);
    expect(host.update).toBe(patched);
    host.update('changed');
    expect(update).toHaveBeenCalledExactlyOnceWith('changed');
    expect(handleOf(panel)).toBeNull();
    const shown = host.show();
    expect(host.hasAttribute(SHEET_MOTION_ATTRIBUTE)).toBe(false);
    host.dialog = undefined;
    host.update(undefined);
    void shown;
    await Promise.resolve();
  });

  it('waits for the shadow panel before wiring a surface dialog', () => {
    const { host, panel } = fixture();
    host.dialog = undefined;
    host.update(undefined);
    expect(handleOf(panel)).toBeNull();
  });

  it('injects a separator grabber only for a resizable bottom sheet and hides it when that changes', () => {
    const { surface, host, panel } = fixture({ resizable: false });
    host.update(undefined);
    expect(handleOf(panel)).toBeNull();
    surface.setAttribute('data-resizable', '');
    host.update(undefined);
    const handle = handleOf(panel)!;
    expect(panel.firstElementChild).toBe(handle);
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('aria-label')).toBe('Resize sheet');
    expect(handle.tabIndex).toBe(0);
    expect(handle.hidden).toBe(false);
    surface.setAttribute('data-presentation', 'modal');
    host.update(undefined);
    expect(handleOf(panel)).toBe(handle);
    expect(handle.hidden).toBe(true);
  });

  it('resizes by pointer drag within the computed bounds and reports visible values', () => {
    const { host, panel } = fixture();
    host.update(undefined);
    const handle = handleOf(panel)!;
    const box = layout(panel);
    handle.setPointerCapture = vi.fn();
    // A secondary button does nothing.
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
    // 400 + 100 border-box, less the 34px clearance.
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('466px');
    box.set(500);
    expect(handle.getAttribute('aria-valuenow')).toBe('466');
    expect(handle.getAttribute('aria-valuemin')).toBe('166');
    expect(handle.getAttribute('aria-valuemax')).toBe('766');
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: -900 }));
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('766px');
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: 900 }));
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('166px');
    handle.dispatchEvent(new PointerEvent('pointerup'));
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: 0 }));
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('166px');
    // A pointer cancel ends a drag the same way.
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, clientY: 400 }),
    );
    handle.dispatchEvent(new PointerEvent('pointercancel'));
    handle.dispatchEvent(new PointerEvent('pointermove', { clientY: 0 }));
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('166px');
  });

  it('resizes from the keyboard and ignores other keys and non-resizable sheets', () => {
    const { surface, host, panel } = fixture();
    host.update(undefined);
    const handle = handleOf(panel)!;
    layout(panel);
    const press = (key: string) => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      handle.dispatchEvent(event);
      return event.defaultPrevented;
    };
    const value = () => panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY);
    expect(press('ArrowUp')).toBe(true);
    expect(value()).toBe('382px');
    press('ArrowDown');
    expect(value()).toBe('350px');
    press('PageUp');
    expect(value()).toBe('430px');
    press('PageDown');
    expect(value()).toBe('302px');
    press('Home');
    expect(value()).toBe('166px');
    press('End');
    expect(value()).toBe('766px');
    expect(press('Enter')).toBe(false);
    handle.dispatchEvent(new FocusEvent('focus'));
    expect(handle.getAttribute('aria-valuenow')).toBe('366');
    surface.removeAttribute('data-resizable');
    panel.style.removeProperty(SHEET_HEIGHT_PROPERTY);
    expect(press('ArrowUp')).toBe(false);
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(value()).toBe('');
  });

  it('falls back to the window height when the panel has no max height', () => {
    const { host, panel } = fixture();
    host.update(undefined);
    const handle = handleOf(panel)!;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      height: 300,
    } as DOMRect);
    vi.stubGlobal('innerHeight', 640);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('640px');
  });

  it('marks a real show and hide for the slide, resets a resized height on each opening, and reports values', async () => {
    const { host, panel, finishShow, finishClose } = fixture();
    host.update(undefined);
    layout(panel);
    panel.style.setProperty(SHEET_HEIGHT_PROPERTY, '500px');
    const shown = host.show();
    expect(panel.style.getPropertyValue(SHEET_HEIGHT_PROPERTY)).toBe('');
    expect(host.getAttribute(SHEET_MOTION_ATTRIBUTE)).toBe('enter');
    finishShow();
    await shown;
    await Promise.resolve();
    expect(handleOf(panel)!.getAttribute('aria-valuenow')).toBe('366');
    expect(host.hasAttribute(SHEET_MOTION_ATTRIBUTE)).toBe(false);
    const closed = host.requestClose(panel);
    expect(host.getAttribute(SHEET_MOTION_ATTRIBUTE)).toBe('exit');
    finishClose();
    await closed;
    expect(host.hasAttribute(SHEET_MOTION_ATTRIBUTE)).toBe(false);
  });

  it('leaves a prevented close (Web Awesome pulses instead) and a newer mark alone', async () => {
    const { host, panel, finishClose } = fixture({ closeClass: 'pulse' });
    host.update(undefined);
    const closed = host.requestClose(panel);
    expect(host.hasAttribute(SHEET_MOTION_ATTRIBUTE)).toBe(false);
    finishClose();
    await closed;
    const other = fixture({ resizable: false });
    const shown = other.host.show();
    other.host.setAttribute(SHEET_MOTION_ATTRIBUTE, 'exit');
    other.finishShow();
    await shown;
    expect(other.host.getAttribute(SHEET_MOTION_ATTRIBUTE)).toBe('exit');
    expect(handleOf(other.panel)).toBeNull();
  });

  it('publishes the keyboard inset while an open bottom sheet is connected', () => {
    const { viewport, listeners } = stubViewport({ height: 800 });
    const { surface, host, panel } = fixture();
    host.update(undefined);
    expect(viewport.addEventListener).not.toHaveBeenCalled();
    host.open = true;
    host.update(undefined);
    host.update(undefined);
    expect(viewport.addEventListener).toHaveBeenCalledTimes(2);
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
    viewport.height = 460;
    listeners.get('resize')!();
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('340px');
    viewport.offsetTop = 40;
    listeners.get('scroll')!();
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('300px');
    // Another presentation never clears a keyboard.
    surface.setAttribute('data-presentation', 'modal');
    listeners.get('resize')!();
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
    surface.setAttribute('data-presentation', 'bottom-sheet');
    listeners.get('resize')!();
    host.open = false;
    host.update(undefined);
    expect(viewport.removeEventListener).toHaveBeenCalledTimes(2);
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
  });

  it('stops following the viewport once the dialog leaves the document', () => {
    const { viewport, listeners } = stubViewport({ height: 500 });
    const { surface, host, panel } = fixture();
    host.open = true;
    host.update(undefined);
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('300px');
    const resize = listeners.get('resize')!;
    surface.remove();
    resize();
    expect(viewport.removeEventListener).toHaveBeenCalledTimes(2);
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
  });

  it('does nothing for the keyboard without a visualViewport', () => {
    vi.stubGlobal('visualViewport', undefined);
    const { host, panel } = fixture();
    host.open = true;
    host.update(undefined);
    expect(panel.style.getPropertyValue(KEYBOARD_INSET_PROPERTY)).toBe('');
  });
});
