import { expect, test } from '@playwright/test';

test('applies typed dialog and popup surface geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await expect(demo).toBeVisible();

  await demo.getByRole('button', { name: 'Open dialog' }).click();
  const dialog = page.locator('#catalog-wa-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const dialogGeometry = await dialog.evaluate((element) => {
    const root = element.shadowRoot!;
    const panel = root.querySelector('[part~="dialog"]')!;
    const body = root.querySelector('[part~="body"]')!;
    const footer = root.querySelector('[part~="footer"]')!;
    return {
      width: Math.round(panel.getBoundingClientRect().width),
      bodyPadding: window.getComputedStyle(body).padding,
      footerPadding: window.getComputedStyle(footer).padding,
    };
  });
  expect(dialogGeometry.width).toBeLessThanOrEqual(560);
  expect(dialogGeometry.bodyPadding).toBe('0px');
  expect(dialogGeometry.footerPadding).toBe('16px');
  const dialogList = dialog.locator('[data-component="list"]');
  const dialogText = dialog.locator('[data-component="list-inset-text"]');
  await expect(dialogList).toBeVisible();
  await expect(dialogText).toHaveText(
    'Dialog content uses list-owned item geometry.',
  );
  const listGeometry = await dialogText.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      marginInline: [style.marginInlineStart, style.marginInlineEnd],
      paddingInline: [style.paddingInlineStart, style.paddingInlineEnd],
      borderInline: [style.borderInlineStartWidth, style.borderInlineEndWidth],
    };
  });
  expect(listGeometry).toEqual({
    marginInline: ['8px', '8px'],
    paddingInline: ['8px', '8px'],
    borderInline: ['1px', '1px'],
  });
  // A plain-string label is inset to the body's text edge.
  const labelAlignment = await dialog.evaluate((element) => {
    const textLeft = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().left;
    };
    const title = element.shadowRoot!.querySelector('[part~="title"]')!;
    const body = element.querySelector('[data-component="list-inset-text"]')!;
    return { title: textLeft(title), body: textLeft(body) };
  });
  expect(Math.abs(labelAlignment.title - labelAlignment.body)).toBeLessThan(1);
  const wideClip = await dialog.evaluate((element) => {
    const rect = element
      .shadowRoot!.querySelector('[part~="dialog"]')!
      .getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-wide.png'),
    clip: wideClip,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const narrowGeometry = await dialog.evaluate((element) => {
    const panel = element.shadowRoot!.querySelector('[part~="dialog"]')!;
    const text = element.querySelector('[data-component="list-inset-text"]')!;
    const panelRect = panel.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    return {
      panelLeft: Math.round(panelRect.left),
      panelRight: Math.round(panelRect.right),
      textLeft: Math.round(textRect.left),
      textRight: Math.round(textRect.right),
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(narrowGeometry.textLeft).toBeGreaterThan(narrowGeometry.panelLeft);
  expect(narrowGeometry.textRight).toBeLessThan(narrowGeometry.panelRight);
  expect(narrowGeometry.bodyScrollWidth).toBeLessThanOrEqual(
    narrowGeometry.viewportWidth,
  );
  const narrowClip = await dialog.evaluate((element) => {
    const rect = element
      .shadowRoot!.querySelector('[part~="dialog"]')!
      .getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-narrow.png'),
    clip: narrowClip,
  });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  const dropdown = demo.locator('wa-dropdown');
  await dropdown.getByRole('button', { name: 'Choose view' }).click();
  await expect(dropdown.locator('wa-dropdown-item').first()).toBeVisible();
  expect(
    await dropdown.evaluate(
      (element) =>
        window.getComputedStyle(
          element.shadowRoot!.querySelector('[part~="menu"]')!,
        ).padding,
    ),
  ).toBe('0px');
});
