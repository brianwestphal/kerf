/**
 * Real-browser spec for `overlay()` `initialFocus` on a custom element that
 * cannot take focus yet. A browser does not focus an undefined custom
 * element, and a Lit-style element (a Web Awesome `wa-button`) whose
 * `focus()` reaches into a shadow root it has not rendered throws. Either way
 * the open must succeed, focus must hold on the overlay, and focus must move
 * to the element once it renders — on the plain path and the native
 * `<dialog>` path alike.
 */
import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as any).kerfOverlay !== undefined);
});

async function focusedId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (el === null) return null;
    if (el.classList.contains('kerf-overlay')) return 'overlay';
    return el.id || el.localName;
  });
}

for (const native of [false, true]) {
  const path = native ? 'native <dialog>' : 'plain wrapper';

  test(`${path}: a not-yet-rendered element's throwing focus() does not abort the open`, async ({
    page,
  }) => {
    await page.evaluate((nativeHost) => {
      let release!: () => void;
      const rendered = new Promise<void>((resolve) => (release = resolve));
      (window as any)._render = release;
      const tag = nativeHost ? 'lazy-native-btn' : 'lazy-plain-btn';
      globalThis.customElements.define(
        tag,
        class extends HTMLElement {
          inner: HTMLButtonElement | null = null;
          get updateComplete(): Promise<void> {
            return rendered.then(() => {
              if (this.inner !== null) return;
              const root = this.attachShadow({
                mode: 'open',
                delegatesFocus: true,
              });
              this.inner = document.createElement('button');
              this.inner.textContent = 'OK';
              root.appendChild(this.inner);
            });
          }
          override focus(options?: FocusOptions): void {
            if (this.inner === null) throw new TypeError('not rendered');
            super.focus(options);
          }
        },
      );
      const { overlay } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      (window as any)._h = overlay(raw(`<${tag} id="ok"></${tag}>`), {
        native: nativeHost,
        initialFocus: '#ok',
      });
    }, native);
    expect(
      await page.evaluate(() => (window as any)._h.el.isConnected as boolean),
    ).toBe(true);
    expect(await focusedId(page)).toBe('overlay');
    await page.evaluate(() => (window as any)._render());
    await expect.poll(() => focusedId(page)).toBe('ok');
    // The rendered element is a real tab stop that took focus.
    expect(
      await page.evaluate(
        () =>
          (document.activeElement as HTMLElement).shadowRoot?.activeElement
            ?.localName,
      ),
    ).toBe('button');
    await page.evaluate(() => (window as any)._h.close());
  });

  test(`${path}: an undefined custom element takes focus once it is defined`, async ({
    page,
  }) => {
    const tag = native ? 'later-native-btn' : 'later-plain-btn';
    await page.evaluate(
      ({ nativeHost, name }) => {
        const { overlay } = (window as any).kerfOverlay;
        const { raw } = (window as any).jsxRuntime;
        (window as any)._h = overlay(raw(`<${name} id="later"></${name}>`), {
          native: nativeHost,
          initialFocus: '#later',
        });
      },
      { nativeHost: native, name: tag },
    );
    expect(await focusedId(page)).toBe('overlay');
    await page.evaluate((name) => {
      globalThis.customElements.define(
        name,
        class extends HTMLElement {
          connectedCallback(): void {
            this.tabIndex = 0;
          }
        },
      );
    }, tag);
    await expect.poll(() => focusedId(page)).toBe('later');
    await page.evaluate(() => (window as any)._h.close());
  });
}
