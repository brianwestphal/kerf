import { expect, test } from '@playwright/test';

// KF-C0RV1G: browsers deliver a dialog's native `close` event as a later
// task. A DialogSurface reopened after its exit motion closed it, but before
// that event arrived, used to stay closed: openDialog took the "cancel the
// exit" path for a dialog that was no longer open, and the late event then
// settled the reopened one. A MutationObserver sees `open` go away inside the
// closing task and reopens from a microtask, which deterministically lands in
// that window.

const DIALOG = '#catalog-thread-dialog';

test('a DialogSurface reopened before its close event arrives stays open', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  const open = page.getByRole('button', { name: 'Open Release Thread' });
  const dialog = page.locator(DIALOG);
  await open.click();
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).not.toHaveAttribute('data-kui-dialog-motion');

  await dialog.evaluate((element) => {
    const record = { reopenedBeforeClose: false, closeEvents: 0 };
    (globalThis as { reopenRecord?: typeof record }).reopenRecord = record;
    element.ownerDocument.body.addEventListener(
      'close',
      (event) => {
        if (event.target === element) record.closeEvents += 1;
      },
      true,
    );
    const trigger = element.ownerDocument.querySelector<HTMLElement>(
      '[data-action="show-dialog"][data-dialog-id="catalog-thread-dialog"]',
    )!;
    const observer = new MutationObserver(() => {
      if ((element as HTMLDialogElement).open) return;
      observer.disconnect();
      // Still before the queued close event: it has not reached the body.
      record.reopenedBeforeClose = record.closeEvents === 0;
      trigger.click();
    });
    observer.observe(element, { attributes: true, attributeFilter: ['open'] });
  });

  await dialog.getByRole('button', { name: /close/i }).first().click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as { reopenRecord?: { reopenedBeforeClose: boolean } })
            .reopenRecord?.reopenedBeforeClose,
      ),
    )
    .toBe(true);
  // Well past the enter motion and the stale close event, it is still open,
  // its enter motion finished, and the application never saw that event.
  await page.waitForFunction(
    (selector) =>
      document
        .querySelector(selector)!
        .getAnimations()
        .every((animation) => animation.playState === 'finished'),
    DIALOG,
  );
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog).not.toHaveAttribute('data-kui-dialog-motion');
  expect(
    await page.evaluate(
      () =>
        (globalThis as { reopenRecord?: { closeEvents: number } }).reopenRecord
          ?.closeEvents,
    ),
  ).toBe(0);

  // It still closes normally afterward, and that close reaches the app.
  await dialog.getByRole('button', { name: /close/i }).first().click();
  await expect(dialog).not.toHaveAttribute('open');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (globalThis as { reopenRecord?: { closeEvents: number } })
            .reopenRecord?.closeEvents,
      ),
    )
    .toBe(1);
});
