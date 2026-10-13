import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FOOTER_BLOCK_SIZE_PROPERTY,
  HEADER_BLOCK_SIZE_PROPERTY,
  installChromeBlockSize,
} from '../../src/components/surfaces/surface-scaffold/internal/install-chrome-block-size.js';

type ResizeCallback = (entries: Partial<ResizeObserverEntry>[]) => void;

function part(name: string) {
  const element = document.createElement('div');
  element.setAttribute('part', name);
  return element;
}

function fixture({ scoped = true, footer = true, header = true } = {}) {
  const parent = document.createElement('div');
  if (scoped) parent.className = 'kui-dialog-surface';
  const host = document.createElement('wa-dialog') as unknown as HTMLElement & {
    dialog?: HTMLDialogElement;
    update(changed: unknown): void;
  };
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('dialog');
  shadow.append(panel);
  const headerPart = part('header');
  // A sibling part whose name only contains "header" is not the header.
  const actionsPart = part('header-actions');
  if (header) panel.append(headerPart);
  else panel.append(actionsPart);
  const footerPart = part('footer');
  if (footer) panel.append(footerPart);
  host.dialog = panel;
  const update = vi.fn();
  host.update = update;
  parent.append(host);
  document.body.append(parent);
  installChromeBlockSize(host);
  return { host, panel, headerPart, footerPart, update };
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
  document.body.replaceChildren();
});

describe('DialogSurface chrome measurement', () => {
  it('publishes the header and footer block sizes on the panel once per part and follows resizes', () => {
    const { callbacks, observe } = stubResizeObserver();
    const { host, panel, headerPart, footerPart, update } = fixture();
    const patched = host.update;
    installChromeBlockSize(host);
    expect(host.update).toBe(patched);
    host.update('changed');
    expect(update).toHaveBeenCalledExactlyOnceWith('changed');
    expect(panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '0px',
    );
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '0px',
    );
    expect(observe.mock.calls).toEqual([[headerPart], [footerPart]]);
    host.update(undefined);
    expect(callbacks).toHaveLength(2);
    const [onHeader, onFooter] = callbacks;
    onHeader!([{ borderBoxSize: [{ blockSize: 56, inlineSize: 400 }] }]);
    onFooter!([{ borderBoxSize: [{ blockSize: 72, inlineSize: 400 }] }]);
    expect(panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '56px',
    );
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '72px',
    );
    // An unchanged size leaves the declaration alone; an entry without a
    // border box falls back to the measured rectangle.
    const setProperty = vi.spyOn(panel.style, 'setProperty');
    onFooter!([{ borderBoxSize: [{ blockSize: 72, inlineSize: 400 }] }]);
    expect(setProperty).not.toHaveBeenCalled();
    vi.spyOn(footerPart, 'getBoundingClientRect').mockReturnValue({
      height: 48,
    } as DOMRect);
    onFooter!([{}]);
    expect(panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '48px',
    );
  });

  it('follows a header Web Awesome removes and renders again', () => {
    const { callbacks, observe } = stubResizeObserver();
    const { host, panel, headerPart } = fixture();
    host.update(undefined);
    callbacks[0]!([{ borderBoxSize: [{ blockSize: 56, inlineSize: 400 }] }]);
    // `without-header`: the part is gone, so its clearance is withdrawn, and
    // the detached part's late resize report no longer publishes.
    headerPart.remove();
    host.update(undefined);
    expect(panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe('');
    callbacks[0]!([{ borderBoxSize: [{ blockSize: 0, inlineSize: 0 }] }]);
    expect(panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe('');
    // A new header part is observed in its place.
    const replacement = part('header');
    panel.prepend(replacement);
    host.update(undefined);
    expect(observe).toHaveBeenLastCalledWith(replacement);
    callbacks.at(-1)!([
      { borderBoxSize: [{ blockSize: 64, inlineSize: 400 }] },
    ]);
    expect(panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '64px',
    );
  });

  it('ignores dialogs outside a DialogSurface and parts that are missing, and measures once without ResizeObserver', () => {
    const { observe } = stubResizeObserver();
    const outside = fixture({ scoped: false });
    outside.host.update(undefined);
    expect(
      outside.panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY),
    ).toBe('');
    expect(
      outside.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY),
    ).toBe('');
    const bare = fixture({ footer: false, header: false });
    bare.host.update(undefined);
    expect(bare.panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY)).toBe(
      '',
    );
    expect(bare.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY)).toBe(
      '',
    );
    expect(observe).not.toHaveBeenCalled();
    const panelless = fixture();
    delete panelless.host.dialog;
    panelless.host.update(undefined);
    expect(observe).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.stubGlobal('ResizeObserver', undefined);
    const unobserved = fixture();
    unobserved.host.update(undefined);
    expect(
      unobserved.panel.style.getPropertyValue(HEADER_BLOCK_SIZE_PROPERTY),
    ).toBe('0px');
    expect(
      unobserved.panel.style.getPropertyValue(FOOTER_BLOCK_SIZE_PROPERTY),
    ).toBe('0px');
  });
});
