/**
 * Real-browser spec for stacked `kerfjs/overlay` surfaces: a tooltip shown
 * inside a modal must not take Escape / Tab-trap arbitration from it, a native
 * `<dialog>` stacked with a fallback surface must close exactly one surface per
 * Escape (the UA's own close request included), and focus restoration across a
 * stack must never strand focus on a detached node. The happy-dom half of this
 * matrix lives in `tests/unit/overlay-stacking.test.ts`.
 */
import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

const activeId = (page: Page) =>
  page.evaluate(() => document.activeElement?.id ?? null);

const activeConnected = (page: Page) =>
  page.evaluate(() => document.activeElement?.isConnected ?? false);

for (const native of [false, true]) {
  const label = native ? 'native <dialog>' : 'fallback';
  test(`${label} modal + a tooltip inside it: Tab stays trapped and Escape closes the modal`, async ({
    page,
  }) => {
    await page.evaluate((native) => {
      const { overlay, tooltip } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      (window as any)._modal = overlay(
        // Explicit tabindex: WebKit on macOS skips implicitly tabbable buttons
        // unless the system keyboard-navigation preference is on, and a native
        // <dialog> leaves Tab order to the engine (kerf's trap is not in play).
        raw(
          '<button id="m1" tabindex="0">one</button><button id="m2" tabindex="0">two</button>',
        ),
        { className: 'stack-modal', native, initialFocus: '#m1' },
      );
      // A focus-triggered tooltip on the first control shows immediately.
      tooltip(document.getElementById('m1'), 'Hint', {
        delay: 0,
        hideDelay: 0,
        native,
      });
      document.getElementById('m1')!.blur();
      document.getElementById('m1')!.focus();
    }, native);

    await expect(page.locator('.kerf-tooltip')).toHaveCount(1);
    expect(await activeId(page)).toBe('m1');
    await page.keyboard.press('Tab');
    expect(await activeId(page)).toBe('m2');
    if (!native) {
      // kerf's own trap wraps. A native modal <dialog> instead hands Tab past
      // its last control to the browser chrome (the document stays inert).
      await page.keyboard.press('Tab');
      expect(await activeId(page)).toBe('m1');
      await page.keyboard.press('Shift+Tab');
      expect(await activeId(page)).toBe('m2');
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('.stack-modal')).toHaveCount(0);
  });
}

test('fallback modal beneath a native <dialog>: one Escape closes only the dialog', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<button id="low">low</button>'), {
      className: 'low-modal',
      initialFocus: '#low',
    });
    overlay(
      // Explicit tabindex for macOS WebKit (see the first test above).
      raw(
        '<button id="d1" tabindex="0">d1</button><button id="d2" tabindex="0">d2</button>',
      ),
      {
        className: 'top-dialog',
        native: true,
        initialFocus: '#d1',
      },
    );
  });

  // The fallback modal's trap must not hijack the dialog's own Tab order.
  await page.keyboard.press('Tab');
  expect(await activeId(page)).toBe('d2');

  await page.keyboard.press('Escape');
  await expect(page.locator('.top-dialog')).toHaveCount(0);
  await expect(page.locator('.low-modal')).toHaveCount(1);
  expect(await activeId(page)).toBe('low');

  await page.keyboard.press('Escape');
  await expect(page.locator('.low-modal')).toHaveCount(0);
});

test('fallback surface above a native <dialog>: Escape closes the upper surface and withholds the dialog close request', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<button id="d1">d1</button>'), {
      className: 'under-dialog',
      native: true,
      initialFocus: '#d1',
    });
    overlay(raw('<p>menu</p>'), {
      className: 'upper-menu',
      trap: false,
      dismiss: ['escape'],
      initialFocus: false,
    });
  });

  await page.keyboard.press('Escape');
  await expect(page.locator('.upper-menu')).toHaveCount(0);
  await expect(page.locator('.under-dialog')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => (document.querySelector('.under-dialog') as HTMLDialogElement).open,
    ),
  ).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.under-dialog')).toHaveCount(0);
});

test('focus restoration across a stack: in-order and out-of-order closes land on connected targets', async ({
  page,
}) => {
  const open = () =>
    page.evaluate(() => {
      document.body.innerHTML = '';
      const opener = document.createElement('button');
      opener.id = 'x';
      opener.textContent = 'open';
      document.body.appendChild(opener);
      opener.focus();
      const { overlay } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      (window as any)._a = overlay(
        raw('<button id="a1">a1</button><button id="a2">a2</button>'),
        { initialFocus: '#a2' },
      );
      (window as any)._b = overlay(raw('<button id="b1">b1</button>'), {
        initialFocus: '#b1',
      });
    });

  await open();
  expect(await activeId(page)).toBe('b1');
  await page.keyboard.press('Escape');
  expect(await activeId(page)).toBe('a2');
  await page.keyboard.press('Escape');
  expect(await activeId(page)).toBe('x');

  await open();
  await page.evaluate(() => (window as any)._a.close());
  expect(await activeId(page)).toBe('b1');
  await page.keyboard.press('Escape');
  expect(await activeId(page)).toBe('x');
  expect(await activeConnected(page)).toBe(true);
});

for (const native of [false, true]) {
  test(`closing a ${native ? 'native' : 'fallback'} modal removes the tooltip and popover anchored inside it`, async ({
    page,
  }) => {
    await page.evaluate((native) => {
      const { overlay, popover, tooltip } = (window as any).kerfOverlay;
      const { raw } = (window as any).jsxRuntime;
      overlay(
        raw('<button id="hint">hint</button><button id="menu">menu</button>'),
        { className: 'anchor-modal', native, initialFocus: '#menu' },
      );
      tooltip(document.getElementById('hint'), 'Hint', {
        delay: 0,
        hideDelay: 10_000, // only the anchor leaving may hide it in time
      });
      popover(document.getElementById('menu'), raw('<p>items</p>'), {
        className: 'anchor-menu',
        dismiss: false,
      });
    }, native);

    await page.locator('#hint').hover();
    await expect(page.locator('.kerf-tooltip')).toHaveCount(1);
    await expect(page.locator('.anchor-menu')).toHaveCount(1);

    await page.keyboard.press('Escape'); // the modal is the only Escape owner
    await expect(page.locator('.anchor-modal')).toHaveCount(0);
    await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
    await expect(page.locator('.anchor-menu')).toHaveCount(0);
  });
}
