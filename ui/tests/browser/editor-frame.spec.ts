import { expect, test } from '@playwright/test';

test('EditorFrame keeps one scroll owner below a fixed toolbar in source and preview modes', async ({
  page,
  browserName,
}, testInfo) => {
  await page.goto('/?component=editor-frame');
  const demo = page.locator('[data-demo="editor-frame"]');
  const source = demo.getByRole('region', {
    name: 'Markdown Editor',
    exact: true,
  });
  const preview = demo.getByRole('region', { name: 'Markdown Preview' });
  const embedded = demo.getByRole('region', {
    name: 'Embedded Markdown Editor',
  });
  const restored = demo.getByRole('region', {
    name: 'Restored Markdown Editor',
  });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await source.scrollIntoViewIfNeeded();
    const field = source.getByRole('textbox', { name: 'Markdown Source' });
    await expect(field).toHaveValue(/Project Notes/);
    const sourceGeometry = await source.evaluate((frame) => {
      const surface = frame.querySelector<HTMLElement>(
        '.kui-editor-frame__surface',
      )!;
      const textarea = surface.querySelector('textarea')!;
      const toolbar = frame.querySelector<HTMLElement>(
        '.kui-editor-frame__toolbar',
      )!;
      return {
        width: frame.getBoundingClientRect().width,
        height: frame.getBoundingClientRect().height,
        surfaceOverflow: globalThis.getComputedStyle(surface).overflowY,
        fieldOverflow: globalThis.getComputedStyle(textarea).overflowY,
        fieldScrollable: textarea.scrollHeight > textarea.clientHeight,
        toolbarBottom: toolbar.getBoundingClientRect().bottom,
        fieldTop: textarea.getBoundingClientRect().top,
      };
    });
    expect(sourceGeometry.width).toBeLessThanOrEqual(672);
    expect(sourceGeometry.height).toBeCloseTo(320, 0);
    expect(sourceGeometry.surfaceOverflow).toBe('hidden');
    expect(sourceGeometry.fieldOverflow).toBe('auto');
    expect(sourceGeometry.fieldScrollable).toBe(true);
    expect(sourceGeometry.fieldTop).toBeGreaterThanOrEqual(
      sourceGeometry.toolbarBottom,
    );
    const toolbarTopBefore = await source
      .locator('.kui-editor-frame__toolbar')
      .evaluate((node) => node.getBoundingClientRect().top);
    await field.evaluate((node: HTMLTextAreaElement) => {
      node.scrollTop = node.scrollHeight;
    });
    expect(
      await field.evaluate((node: HTMLTextAreaElement) => node.scrollTop),
    ).toBeGreaterThan(0);
    expect(
      await source
        .locator('.kui-editor-frame__toolbar')
        .evaluate((node) => node.getBoundingClientRect().top),
    ).toBeCloseTo(toolbarTopBefore, 0);
    const previewSurface = preview.locator('.kui-editor-frame__surface');
    await preview.scrollIntoViewIfNeeded();
    const previewScroll = await previewSurface.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
      return {
        overflow: globalThis.getComputedStyle(node).overflowY,
        scrollTop: node.scrollTop,
        toolbarTop: node.previousElementSibling!.getBoundingClientRect().top,
      };
    });
    expect(previewScroll.overflow).toBe('auto');
    expect(previewScroll.scrollTop).toBeGreaterThan(0);
    expect(
      await preview
        .locator('.kui-editor-frame__toolbar')
        .evaluate((node) => node.getBoundingClientRect().top),
    ).toBeCloseTo(previewScroll.toolbarTop, 0);

    const embeddedStyle = await embedded.evaluate((node) => {
      const surface = node.querySelector<HTMLElement>(
        '.kui-editor-frame__surface',
      )!;
      const frame = globalThis.getComputedStyle(node);
      return {
        border: frame.borderTopWidth,
        background: frame.backgroundColor,
        padding: globalThis.getComputedStyle(surface).paddingLeft,
        value: surface.querySelector('textarea')?.value,
      };
    });
    expect(embeddedStyle.border).toBe('0px');
    expect(embeddedStyle.background).toBe('rgba(0, 0, 0, 0)');
    expect(embeddedStyle.padding).toBe('0px');
    expect(embeddedStyle.value).toContain('A recovered draft');
    const restoredStyle = await restored.evaluate((node) => {
      const textarea = node.querySelector('textarea')!;
      return {
        height: textarea.getBoundingClientRect().height,
        resize: globalThis.getComputedStyle(textarea).resize,
      };
    });
    expect(restoredStyle.height).toBeCloseTo(160, 0);
    expect(restoredStyle.resize).toBe('vertical');

    if (browserName === 'chromium') {
      await source.screenshot({
        path: testInfo.outputPath(`editor-frame-source-${width}.png`),
      });
      await preview.screenshot({
        path: testInfo.outputPath(`editor-frame-preview-${width}.png`),
      });
      await embedded.screenshot({
        path: testInfo.outputPath(`editor-frame-embedded-${width}.png`),
      });
      await restored.screenshot({
        path: testInfo.outputPath(`editor-frame-restored-${width}.png`),
      });
    }
  }

  const field = source.getByRole('textbox', { name: 'Markdown Source' });
  await field.fill('');
  await field.fill('Recovered draft edited in the native textarea.');
  await expect(field).toHaveValue(
    'Recovered draft edited in the native textarea.',
  );
  await page.setViewportSize({ width: 1100, height: 800 });
  await source.evaluate((node) => node.setAttribute('data-expanded', 'true'));
  const expanded = await source.boundingBox();
  expect(expanded?.x).toBeCloseTo(32, 0);
  expect(expanded?.y).toBeCloseTo(32, 0);
  expect(expanded?.width).toBeCloseTo(1036, 0);
  expect(expanded?.height).toBeCloseTo(736, 0);
});
