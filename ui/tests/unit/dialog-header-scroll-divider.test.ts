import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HEADER_DIVIDER_PROPERTY,
  installHeaderScrollDivider,
} from '../../src/components/surfaces/surface-scaffold/internal/install-header-scroll-divider.js';

const SHOWN = 'var(--_kui-dialog-surface-header-divider-color)';

/** Give an element a fixed rect and a writable scrollTop. */
function geometry(element: Element, top: number, bottom: number) {
  element.getBoundingClientRect = () =>
    ({ top, bottom, height: bottom - top }) as DOMRect;
  let scrollTop = 0;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value;
    },
  });
}

function fixture({
  scoped = true,
  floating = true,
  header = true,
}: { scoped?: boolean; floating?: boolean; header?: boolean } = {}) {
  const parent = document.createElement('div');
  if (scoped) parent.className = 'kui-dialog-surface';
  if (floating) parent.setAttribute('data-header-presentation', 'floating');
  const host = document.createElement('wa-dialog') as unknown as HTMLElement & {
    dialog?: HTMLDialogElement;
    update(changed: unknown): void;
  };
  const shadow = host.attachShadow({ mode: 'open' });
  const panel = document.createElement('dialog');
  shadow.append(panel);
  const headerPart = document.createElement('header');
  headerPart.setAttribute('part', 'header');
  geometry(headerPart, 0, 60);
  if (header) panel.append(headerPart);
  // The body reaches beneath the floating header, from the panel's top.
  const body = document.createElement('div');
  body.setAttribute('part', 'body');
  geometry(body, 0, 400);
  body.append(document.createElement('slot'));
  panel.append(body);
  // A slotted filling transcript that also reaches beneath the header, and a
  // nested scroller (a code block) that starts well below it.
  const transcript = document.createElement('div');
  geometry(transcript, 0, 400);
  const nested = document.createElement('pre');
  geometry(nested, 200, 300);
  host.append(transcript, nested);
  host.dialog = panel;
  const update = vi.fn();
  host.update = update;
  parent.append(host);
  document.body.append(parent);
  installHeaderScrollDivider(host);
  return { parent, host, panel, body, transcript, nested, update };
}

/** Scroll an element and fire the scroll event it would fire. */
function scroll(element: Element, top: number) {
  element.scrollTop = top;
  element.dispatchEvent(new Event('scroll'));
}

const divider = (panel: HTMLElement) =>
  panel.style.getPropertyValue(HEADER_DIVIDER_PROPERTY);

afterEach(() => {
  document.body.replaceChildren();
});

describe('DialogSurface floating header scroll divider', () => {
  it('shows while the body is scrolled beneath the header and hides back at the top', () => {
    const { host, panel, body, update } = fixture();
    const patched = host.update;
    installHeaderScrollDivider(host);
    expect(host.update).toBe(patched);
    host.update('changed');
    host.update(undefined);
    expect(update.mock.calls).toEqual([['changed'], [undefined]]);
    expect(divider(panel)).toBe('');

    scroll(body, 1);
    expect(divider(panel)).toBe('');
    scroll(body, 40);
    expect(divider(panel)).toBe(SHOWN);
    scroll(body, 80);
    expect(divider(panel)).toBe(SHOWN);
    scroll(body, 0);
    expect(divider(panel)).toBe('');
  });

  it('follows a slotted filling transcript, keeps showing while any scroller is away, and ignores a nested scroller below the header', () => {
    const { host, panel, body, transcript, nested } = fixture();
    host.update(undefined);
    scroll(nested, 50);
    expect(divider(panel)).toBe('');
    scroll(transcript, 120);
    expect(divider(panel)).toBe(SHOWN);
    scroll(body, 30);
    scroll(transcript, 0);
    // The body is still away from its top.
    expect(divider(panel)).toBe(SHOWN);
    scroll(body, 0);
    expect(divider(panel)).toBe('');

    // A scrolled transcript a rerender removes no longer holds the divider.
    scroll(transcript, 120);
    transcript.remove();
    scroll(nested, 60);
    expect(divider(panel)).toBe('');
  });

  it('draws nothing for a docked header, a header-less dialog, or a dialog outside a DialogSurface', () => {
    const docked = fixture({ floating: false });
    docked.host.update(undefined);
    scroll(docked.body, 80);
    expect(divider(docked.panel)).toBe('');
    // Switching to floating takes effect on the next scroll.
    docked.parent.setAttribute('data-header-presentation', 'floating');
    scroll(docked.body, 90);
    expect(divider(docked.panel)).toBe(SHOWN);

    const headerless = fixture({ header: false });
    headerless.host.update(undefined);
    scroll(headerless.body, 80);
    expect(divider(headerless.panel)).toBe('');

    const unscoped = fixture({ scoped: false });
    unscoped.host.update(undefined);
    scroll(unscoped.body, 80);
    expect(divider(unscoped.panel)).toBe('');
  });

  it('waits for a panel and ignores a scroll event from a non-element target', () => {
    const { host, panel, body } = fixture();
    const missing = host.dialog;
    host.dialog = undefined;
    host.update(undefined);
    scroll(body, 80);
    expect(divider(panel)).toBe('');
    host.dialog = missing;
    host.update(undefined);
    const text = panel.appendChild(document.createTextNode('label'));
    text.dispatchEvent(new Event('scroll'));
    expect(divider(panel)).toBe('');
    scroll(body, 80);
    expect(divider(panel)).toBe(SHOWN);
  });
});
