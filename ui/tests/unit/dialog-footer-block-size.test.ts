import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FOOTER_BLOCK_SIZE_PROPERTY,
  installFooterBlockSize,
} from '../../src/components/surfaces/surface-scaffold/internal/install-footer-block-size.js';

type ResizeCallback = (entries: Partial<ResizeObserverEntry>[]) => void;

function fixture({ scoped = true, footer = true } = {}) {
  const parent = document.createElement('div');
  if (scoped) parent.className = 'kui-dialog-surface';
  const host = document.createElement('wa-dialog') as unknown as HTMLElement & {
    dialog?: HTMLDialogElement;
    update(changed: unknown): void;
  };
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('dialog');
  shadow.append(panel);
  const footerPart = document.createElement('div');
  footerPart.setAttribute('part', 'footer');
  if (footer) panel.append(footerPart);
  host.dialog = panel;
  const update = vi.fn();
  host.update = update;
  parent.append(host);
  installFooterBlockSize(host);
  return { host, panel, footerPart, update };
}

function stubResizeObserver() {
  const callbacks: ResizeCallback[] = [];
  const observe = vi.fn();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeCallback) {
        callbacks.push(callback);
      }
      observe = observe;
    },
  );
  return { callbacks, observe };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DialogSurface footer measurement', () => {
  it('publishes the footer block size on the panel once per footer and follows resizes', () => {
    const { callbacks, observe } = stubResizeObserver();
    const { host, panel, footerPart, update } = fixture();
    const patched = host.update;
    installFooterBlockSize(host);
    expect(host.update).toBe(patched);
    host.update('changed');
    expect(update).toHaveBeenCalledExactlyOnceWith('changed');
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '0px',
    );
    expect(observe).toHaveBeenCalledExactlyOnceWith(footerPart);
    host.update(undefined);
    expect(callbacks).toHaveLength(1);
    callbacks[0]!([{ borderBoxSize: [{ blockSize: 72, inlineSize: 400 }] }]);
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '72px',
    );
    // An unchanged size leaves the declaration alone; an entry without a
    // border box falls back to the measured rectangle.
    const setProperty = vi.spyOn(panel.style, 'setProperty');
    callbacks[0]!([{ borderBoxSize: [{ blockSize: 72, inlineSize: 400 }] }]);
    expect(setProperty).not.toHaveBeenCalled();
    vi.spyOn(footerPart, 'getBoundingClientRect').mockReturnValue({
      height: 48,
    } as DOMRect);
    callbacks[0]!([{}]);
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '48px',
    );
  });

  it('ignores dialogs outside a DialogSurface and dialogs without a footer or ResizeObserver', () => {
    const { observe } = stubResizeObserver();
    const outside = fixture({ scoped: false });
    outside.host.update(undefined);
    expect(
      outside.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY),
    ).toBe('');
    const footerless = fixture({ footer: false });
    footerless.host.update(undefined);
    expect(
      footerless.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY),
    ).toBe('');
    expect(observe).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.stubGlobal('ResizeObserver', undefined);
    const unobserved = fixture();
    unobserved.host.update(undefined);
    expect(
      unobserved.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY),
    ).toBe('0px');
  });
});
