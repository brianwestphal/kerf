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

test('a scoped FileDropZone lights up and takes drops anywhere on its panel', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=file-picker');
    const demo = page.locator('[data-demo="file-picker"]');
    const zone = demo.locator('[data-component="file-drop-zone"]').first();
    const heading = demo.getByRole('heading', { name: 'Attachments' });
    const drag = (type: string, related?: string) =>
      heading.evaluate(
        (node, [eventType, outside]) => {
          const transfer = new DataTransfer();
          transfer.items.add(
            new File(['x'], 'panel.png', { type: 'image/png' }),
          );
          const event = new DragEvent(eventType!, {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
            relatedTarget: outside ? document.body : null,
          });
          node.dispatchEvent(event);
          return event.defaultPrevented;
        },
        [type, related],
      );
    const resting = await zone.evaluate(
      (node) => globalThis.getComputedStyle(node).borderColor,
    );
    expect(await drag('dragover')).toBe(true);
    await expect(zone).toHaveAttribute('data-dragging', 'true');
    // The highlight is visible, not just an attribute.
    expect(
      await zone.evaluate(
        (node) => globalThis.getComputedStyle(node).borderColor,
      ),
    ).not.toBe(resting);
    await drag('dragleave', 'outside');
    await expect(zone).not.toHaveAttribute('data-dragging');
    await drag('dragover');
    await drag('drop');
    await expect(zone).not.toHaveAttribute('data-dragging');
    await expect(demo).toContainText('panel.png');
  }
});

// KF-W99E6W: the Button look keeps the native file label: choosing through it
// reports files, it matches the Button beside it, and keyboard focus on the
// hidden input draws the Button's ring on the face.
test('a FilePickerTrigger with the Button look chooses files and shows focus', async ({
  page,
  browserName,
}, info) => {
  await page.goto('/?component=file-picker');
  const demo = page.locator('[data-demo="file-picker"]');
  const row = demo.locator('[data-demo-file-buttons]');
  const open = row.locator('[data-file-picker-id="demo-open"]');
  const chooser = page.waitForEvent('filechooser');
  await open.click();
  await (
    await chooser
  ).setFiles([
    {
      name: 'plan.kui.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{}'),
    },
  ]);
  await expect(demo).toContainText('plan.kui.json');

  const face = open.locator('.kui-button');
  const save = row.getByRole('button', { name: 'Save' });
  const [faceBox, saveBox] = await Promise.all([
    face.boundingBox(),
    save.boundingBox(),
  ]);
  expect(Math.abs(faceBox!.height - saveBox!.height)).toBeLessThan(1);
  expect(Math.abs(faceBox!.y - saveBox!.y)).toBeLessThan(1);

  if (browserName === 'webkit') return;
  await open.locator('input[type="file"]').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await row.screenshot({
    path: info.outputPath(
      `kf-w99e6w-file-picker-button-look-${browserName}.png`,
    ),
    animations: 'disabled',
  });
  expect(
    await face.evaluate((node) => window.getComputedStyle(node).outlineStyle),
  ).not.toBe('none');
  expect(
    await open.evaluate((node) => window.getComputedStyle(node).outlineStyle),
  ).toBe('none');
});
