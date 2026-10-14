/**
 * `initialFocus` on a custom element that cannot take focus yet — not defined,
 * or defined but not rendered (a Web Awesome `wa-button` whose `focus()`
 * reaches into a shadow root it has not built, and throws). The open must
 * succeed: focus holds on the overlay, then moves to the element once it
 * renders, unless the overlay closed or the user moved focus first.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { overlay } from '../../src/overlay.js';

let tagCount = 0;
function uniqueTag(base: string): string {
  tagCount += 1;
  return `${base}-${tagCount}`;
}

/**
 * A Lit-like element: `focus()` throws until its update cycle has rendered a
 * shadow button; `updateComplete` resolves when that happens.
 */
function defineLazyButton(tag: string): { render: () => void } {
  let release!: () => void;
  const rendered = new Promise<void>((resolve) => {
    release = resolve;
  });
  class LazyButton extends HTMLElement {
    inner: HTMLButtonElement | null = null;
    get updateComplete(): Promise<void> {
      return rendered.then(() => {
        if (this.inner === null) {
          const root = this.attachShadow({ mode: 'open' });
          this.inner = document.createElement('button');
          root.appendChild(this.inner);
          this.tabIndex = 0;
        }
      });
    }
    override focus(): void {
      if (this.inner === null) throw new TypeError('not rendered');
      super.focus();
    }
  }
  globalThis.customElements.define(tag, LazyButton);
  return { render: () => release() };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('overlay() — initialFocus on a not-yet-rendered custom element', () => {
  it('opens, holds focus on the overlay, then focuses the element once it renders', async () => {
    const tag = uniqueTag('lazy-ok');
    const lazy = defineLazyButton(tag);
    const h = overlay(raw(`<${tag} id="ok"></${tag}>`), {
      initialFocus: '#ok',
    });
    expect(h.el.isConnected).toBe(true);
    expect(document.activeElement).toBe(h.el);
    lazy.render();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(h.el.querySelector('#ok')),
    );
    h.close();
  });

  it('initialFocus: true defers the same way when the first stop is such an element', async () => {
    const tag = uniqueTag('lazy-first');
    const lazy = defineLazyButton(tag);
    const h = overlay(raw(`<${tag} tabindex="0"></${tag}>`), {
      initialFocus: true,
    });
    expect(document.activeElement).toBe(h.el);
    lazy.render();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(h.el.querySelector(tag)),
    );
    h.close();
  });

  it('waits for an undefined custom element to be defined', async () => {
    const tag = uniqueTag('later-btn');
    // happy-dom focuses any element, so make the undefined element refuse
    // focus the way a browser does (tests/browser covers the real engines).
    const focus = vi
      .spyOn(HTMLElement.prototype, 'focus')
      .mockImplementationOnce(() => undefined);
    const h = overlay(raw(`<${tag} id="later"></${tag}>`), {
      initialFocus: '#later',
    });
    focus.mockRestore();
    expect(document.activeElement).toBe(h.el);
    globalThis.customElements.define(
      tag,
      class extends HTMLElement {
        connectedCallback(): void {
          this.tabIndex = 0;
        }
      },
    );
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(h.el.querySelector('#later')),
    );
    h.close();
  });

  it('does not steal focus back after the overlay closed', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const tag = uniqueTag('lazy-closed');
    const lazy = defineLazyButton(tag);
    const h = overlay(raw(`<${tag} id="x"></${tag}>`), { initialFocus: '#x' });
    h.close();
    expect(document.activeElement).toBe(trigger);
    lazy.render();
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(trigger);
  });

  it('leaves focus where the user moved it before the element rendered', async () => {
    const tag = uniqueTag('lazy-moved');
    const lazy = defineLazyButton(tag);
    const h = overlay(
      raw(`<${tag} id="x"></${tag}><button id="other">Other</button>`),
      { initialFocus: '#x' },
    );
    const other = h.el.querySelector<HTMLButtonElement>('#other')!;
    other.focus();
    lazy.render();
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(other);
    h.close();
  });

  it('a rendered custom element inside a shadow-root container takes focus at once', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    root.appendChild(container);
    const tag = uniqueTag('ready-btn');
    globalThis.customElements.define(
      tag,
      class extends HTMLElement {
        connectedCallback(): void {
          this.tabIndex = 0;
        }
      },
    );
    const h = overlay(raw(`<${tag} id="ready"></${tag}>`), {
      container,
      initialFocus: '#ready',
    });
    expect(root.activeElement).toBe(h.el.querySelector('#ready'));
    h.close();
  });

  it('a matched native element that cannot take focus is left alone, as before', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const focus = vi
      .spyOn(HTMLElement.prototype, 'focus')
      .mockImplementationOnce(() => undefined);
    const h = overlay(raw('<div id="plain">text</div>'), {
      initialFocus: '#plain',
    });
    focus.mockRestore();
    expect(document.activeElement).toBe(trigger);
    expect(h.el.hasAttribute('tabindex')).toBe(false);
    h.close();
  });
});
