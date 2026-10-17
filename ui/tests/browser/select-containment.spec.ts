import { expect, test } from '@playwright/test';

for (const width of [1100, 390]) {
  test(`Select contains long menus at both viewport edges (${width}px)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=select');
    const select = page.locator('[name="toolbar-rendering-balance"]');
    // Move the unchanged production group to controlled viewport anchors.
    // No Select or popup styles are overridden.
    await select.evaluate((element) => {
      const group = element.parentElement!;
      group.style.position = 'fixed';
      group.style.top = '120px';
      element
        .querySelector('.kui-select__option-label')!
        .append(
          ' — Attention Needed for Project Configuration and Deployment Settings',
        );
    });
    for (const left of [0, 86, width - 68]) {
      await select.evaluate((element, x) => {
        element.parentElement!.style.left = `${x}px`;
      }, left);
      await select.getByRole('combobox').click();
      await expect(select).toHaveAttribute('open');
      await expect(select.locator('.kui-select__popup')).toHaveCSS(
        'opacity',
        '1',
      );
      await expect
        .poll(async () =>
          select.evaluate((element) => {
            const bounds = element
              .querySelector(':scope > .kui-select__popup')!
              .getBoundingClientRect();
            return (
              bounds.left >= 9.5 && bounds.right <= window.innerWidth - 9.5
            );
          }),
        )
        .toBe(true);
      await expect
        .poll(async () =>
          select.evaluate((element) => {
            const label = element.querySelector('.kui-select__option-label')!;
            return label.scrollWidth <= label.clientWidth + 1;
          }),
        )
        .toBe(true);
      if (left === 86)
        await page.screenshot({
          path: testInfo.outputPath(`select-containment-${width}.png`),
        });
      await page.keyboard.press('Escape');
      await expect(select).not.toHaveAttribute('open');
    }
    await select.getByRole('combobox').click();
    const resizedWidth = width === 1100 ? 390 : 1100;
    await page.setViewportSize({ width: resizedWidth, height: 844 });
    await select.evaluate((element, x) => {
      element.parentElement!.style.left = `${x - 68}px`;
    }, resizedWidth);
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .querySelector(':scope > .kui-select__popup')!
            .getBoundingClientRect();
          return bounds.left >= 9.5 && bounds.right <= window.innerWidth - 9.5;
        }),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(select).not.toHaveAttribute('open');
    await page.setViewportSize({ width, height: 844 });
    await select.evaluate((element, x) => {
      element.parentElement!.style.left = `${x - 68}px`;
    }, width);
    await select.evaluate((element) => {
      element.classList.add('kui-select--fit-menu');
    });
    await select.getByRole('combobox').click();
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .querySelector(':scope > .kui-select__popup')!
            .getBoundingClientRect();
          const anchor = element
            .querySelector(':scope > .kui-select__trigger')!
            .getBoundingClientRect();
          return (
            Math.abs(bounds.width - anchor.width) <= 1 &&
            bounds.left >= 9.5 &&
            bounds.right <= window.innerWidth - 9.5
          );
        }),
      )
      .toBe(true);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(select).not.toHaveAttribute('open');
    await expect(select).toHaveJSProperty('value', 'explicit');
    await select.evaluate((element) => {
      element.classList.remove('kui-select--fit-menu');
    });
    await select.getByRole('combobox').click();
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .querySelector(':scope > .kui-select__popup')!
            .getBoundingClientRect();
          return (
            bounds.width > element.getBoundingClientRect().width &&
            bounds.left >= 9.5 &&
            bounds.right <= window.innerWidth - 9.5
          );
        }),
      )
      .toBe(true);
    await page.keyboard.press('Escape');
  });
}

for (const width of [1100, 390]) {
  test(`Long-option demo visual QA (${width}px)`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=select');
    const select = page.locator('[name="viewport-attention"]');
    await select.scrollIntoViewIfNeeded();
    await select.getByRole('combobox').click();
    await expect(select).toHaveAttribute('open');
    await expect(select.locator('.kui-select__popup')).toHaveCSS(
      'opacity',
      '1',
    );
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .querySelector(':scope > .kui-select__popup')!
            .getBoundingClientRect();
          return bounds.left >= 9.5 && bounds.right <= window.innerWidth - 9.5;
        }),
      )
      .toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`select-long-options-${width}.png`),
    });
  });
}

// A tall listbox at a short viewport takes the side with more room and
// scrolls inside its cap instead of shifting over its trigger, so a second
// press on the trigger reaches it and closes the listbox (the popup contract
// a PopupMenu shares).
test('a tall Select listbox never covers its trigger at a short viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto('/?component=select');
  const select = page.locator('[name="toolbar-rendering-balance"]');
  const combobox = select.getByRole('combobox');
  // Move the unchanged production group to controlled viewport anchors and
  // lengthen the listbox. No Select or popup styles are overridden.
  await select.evaluate((element) => {
    const group = element.parentElement!;
    group.style.position = 'fixed';
    group.style.left = '400px';
    const option = element.querySelector('.kui-select__option')!;
    for (let index = 0; index < 30; index += 1) {
      const copy = option.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      option.parentElement!.append(copy);
    }
  });
  for (const [top, side] of [
    [80, 'bottom'],
    [480, 'top'],
  ] as const) {
    await select.evaluate((element, y) => {
      element.parentElement!.style.top = `${y}px`;
    }, top);
    await combobox.click();
    await expect(select).toHaveAttribute('open');
    const popup = select.locator(':scope > .kui-select__popup');
    await expect
      .poll(() => popup.getAttribute('data-placement'))
      .toMatch(new RegExp(`^${side}`));
    const geometry = await select.evaluate((element) => {
      const trigger = element
        .querySelector(':scope > .kui-select__trigger')!
        .getBoundingClientRect();
      const listbox = element.querySelector<HTMLElement>(
        ':scope > .kui-select__popup',
      )!;
      const box = listbox.getBoundingClientRect();
      return {
        overlap:
          Math.min(box.bottom, trigger.bottom) - Math.max(box.top, trigger.top),
        top: box.top,
        bottom: box.bottom,
        scrolls: listbox.scrollHeight > listbox.clientHeight,
      };
    });
    expect(geometry.overlap).toBeLessThanOrEqual(0.5);
    expect(geometry.top).toBeGreaterThanOrEqual(9.5);
    expect(geometry.bottom).toBeLessThanOrEqual(600 - 9.5);
    expect(geometry.scrolls).toBe(true);
    await combobox.click();
    await expect(select).not.toHaveAttribute('open');
  }
});
