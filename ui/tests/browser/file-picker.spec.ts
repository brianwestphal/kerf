import { Buffer } from 'node:buffer';

import { expect, test } from '@playwright/test';

// Real file inputs behind both controls: choosing through the trigger and
// dropping on the zone both report through wireFilePickers, drops are
// filtered by accept, the zone highlights while dragging, and keyboard focus
// on the hidden input shows on the visible control.
test('FilePicker reports chosen and dropped files and shows focus', async ({
  page,
  browserName,
}) => {
  await page.goto('/?component=file-picker');
  const demo = page.locator('[data-demo="file-picker"]');
  await demo
    .getByLabel('Browse attachments')
    .setInputFiles([
      { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('x') },
    ]);
  await expect(demo).toContainText('notes.txt');

  const zone = demo.locator('[data-component="file-drop-zone"]').first();
  const drag = (type: string) =>
    zone.evaluate((node, eventType) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['x'], 'shot.png', { type: 'image/png' }));
      transfer.items.add(
        new File(['x'], 'tool.exe', { type: 'application/x-msdownload' }),
      );
      node.dispatchEvent(
        new DragEvent(eventType, {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    }, type);
  await drag('dragover');
  await expect(zone).toHaveAttribute('data-dragging', 'true');
  await drag('drop');
  await expect(zone).not.toHaveAttribute('data-dragging');
  await expect(demo).toContainText('notes.txt, shot.png');
  await expect(demo).not.toContainText('tool.exe');

  // WebKit on macOS skips form controls on Tab unless Full Keyboard Access is
  // on, so it never shows keyboard focus here.
  if (browserName === 'webkit') return;
  await zone.locator('input[type="file"]').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await zone.evaluate(
    (node) => window.getComputedStyle(node).outlineStyle,
  );
  expect(outline).not.toBe('none');
});
