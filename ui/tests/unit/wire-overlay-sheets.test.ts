import { afterEach, describe, expect, it } from 'vitest';

import {
  OVERLAY_SHEET_HANDLE_CLASS,
  OVERLAY_SHEET_HEIGHT_PROPERTY,
  OVERLAY_SHEET_RESIZABLE_CLASS,
  wireOverlaySheets,
} from '../../src/components/surfaces/surface-scaffold/wiring/wire-overlay-sheets.js';

// wireOverlaySheets gives a core kerfjs/overlay bottom sheet that opts in
// with the kui-overlay-sheet-resizable class the resizable DialogSurface
// sheet's grabber, keeps it first in the sheet, and cleans up on removal.

const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

function sheetWrapper({
  tag = 'div',
  resizable = true,
  presentation = 'bottom-sheet',
  content = true,
}: {
  tag?: 'div' | 'dialog';
  resizable?: boolean;
  presentation?: string;
  content?: boolean;
} = {}): HTMLElement {
  const wrapper = document.createElement(tag);
  wrapper.className = resizable
    ? `kerf-overlay ${OVERLAY_SHEET_RESIZABLE_CLASS}`
    : 'kerf-overlay';
  wrapper.setAttribute('data-presentation', presentation);
  if (content) {
    const root = document.createElement('div');
    root.className = 'content';
    root.innerHTML = '<p>One</p><p>Two</p>';
    wrapper.append(root);
  }
  return wrapper;
}

const handleIn = (el: Element) =>
  el.querySelector<HTMLElement>(`.${OVERLAY_SHEET_HANDLE_CLASS}`);

afterEach(() => {
  document.body.replaceChildren();
});

describe('wireOverlaySheets', () => {
  it('wires a sheet already open, prepending a separator grabber to its content root', () => {
    const wrapper = sheetWrapper();
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    const handle = handleIn(wrapper)!;
    expect(wrapper.firstElementChild!.firstElementChild).toBe(handle);
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(handle.getAttribute('aria-label')).toBe('Resize sheet');
    expect(handle.hasAttribute('data-morph-preserve')).toBe(true);
    expect(handle.tabIndex).toBe(0);
    stop();
    expect(handleIn(wrapper)).toBeNull();
  });

  it('wires a sheet opened later, and a native dialog takes the grabber itself', async () => {
    const stop = wireOverlaySheets();
    const dialog = sheetWrapper({ tag: 'dialog' });
    document.body.append(dialog);
    await flush();
    expect(dialog.firstElementChild).toBe(handleIn(dialog));
    stop();
  });

  it('skips sheets without the opt-in class, other presentations, and other containers', async () => {
    const container = document.createElement('section');
    document.body.append(container);
    const stop = wireOverlaySheets(container);
    const plain = sheetWrapper({ resizable: false });
    const modal = sheetWrapper({ presentation: 'modal' });
    const elsewhere = sheetWrapper();
    container.append(plain, modal);
    document.body.append(elsewhere);
    await flush();
    expect(handleIn(plain)).toBeNull();
    expect(handleIn(modal)).toBeNull();
    expect(handleIn(elsewhere)).toBeNull();
    stop();
  });

  it('keeps the grabber first after a re-render moves or replaces the content', async () => {
    const wrapper = sheetWrapper();
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    const handle = handleIn(wrapper)!;
    const root = wrapper.firstElementChild!;
    root.append(handle);
    await flush();
    expect(root.firstChild).toBe(handle);
    const next = document.createElement('section');
    next.textContent = 'Replaced';
    root.replaceWith(next);
    await flush();
    expect(next.firstChild).toBe(handle);
    stop();
  });

  it('waits for a plain sheet with no content root yet', async () => {
    const wrapper = sheetWrapper({ content: false });
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    expect(handleIn(wrapper)).toBeNull();
    wrapper.append(document.createElement('div'));
    await flush();
    expect(wrapper.firstElementChild!.firstElementChild).toBe(
      handleIn(wrapper),
    );
    stop();
  });

  it('publishes the resized visible height on the wrapper, and ignores input while inert', () => {
    const wrapper = sheetWrapper();
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    const handle = handleIn(wrapper)!;
    const key = (k: string) =>
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, cancelable: true }),
      );
    key('End');
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      `${String(globalThis.innerHeight)}px`,
    );
    expect(handle.getAttribute('aria-valuenow')).toBe(
      String(globalThis.innerHeight),
    );
    wrapper.style.removeProperty(OVERLAY_SHEET_HEIGHT_PROPERTY);
    wrapper.inert = true;
    key('End');
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      '',
    );
    stop();
  });

  it('unwires a sheet when it leaves the container, clearing its height', async () => {
    const wrapper = sheetWrapper();
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    const handle = handleIn(wrapper)!;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(
      wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY),
    ).not.toBe('');
    wrapper.remove();
    await flush();
    expect(handleIn(wrapper)).toBeNull();
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      '',
    );
    // Re-adding it wires it afresh.
    document.body.append(wrapper);
    await flush();
    expect(handleIn(wrapper)).not.toBeNull();
    stop();
  });

  it('resizes by pointer drag from the grabber', () => {
    const wrapper = sheetWrapper();
    document.body.append(wrapper);
    const stop = wireOverlaySheets();
    const handle = handleIn(wrapper)!;
    const pointer = (type: string, clientY: number, button = 0) =>
      handle.dispatchEvent(
        new PointerEvent(type, {
          clientY,
          button,
          pointerId: 1,
          cancelable: true,
        }),
      );
    pointer('pointerdown', 500, 2);
    pointer('pointermove', 400);
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      '',
    );
    pointer('pointerdown', 500);
    pointer('pointermove', 400);
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      '100px',
    );
    pointer('pointerup', 400);
    pointer('pointermove', 300);
    expect(wrapper.style.getPropertyValue(OVERLAY_SHEET_HEIGHT_PROPERTY)).toBe(
      '100px',
    );
    stop();
  });
});
