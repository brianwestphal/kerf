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
        .querySelector('wa-option')!
        .append(
          ' — Attention needed for project configuration and deployment settings',
        );
    });
    for (const left of [0, 86, width - 68]) {
      await select.evaluate((element, x) => {
        element.parentElement!.style.left = `${x}px`;
      }, left);
      await select.evaluate((element) => {
        element.removeAttribute('data-qa-settled');
        element.addEventListener(
          'wa-after-show',
          () => {
            element.setAttribute('data-qa-settled', 'true');
          },
          { once: true },
        );
      });
      await select.click();
      await expect(select).toHaveAttribute('data-qa-settled', 'true');
      await expect(select).toHaveAttribute('open');
      await expect
        .poll(async () =>
          select.evaluate((element) => {
            const bounds = element
              .shadowRoot!.querySelector('[part~="listbox"]')!
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
            const label = element
              .querySelector('wa-option')!
              .shadowRoot!.querySelector('[part~="label"]')!;
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
    await select.click();
    const resizedWidth = width === 1100 ? 390 : 1100;
    await page.setViewportSize({ width: resizedWidth, height: 844 });
    await select.evaluate((element, x) => {
      element.parentElement!.style.left = `${x - 68}px`;
    }, resizedWidth);
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .shadowRoot!.querySelector('[part~="listbox"]')!
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
    await select.click();
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const popup = element.shadowRoot!.querySelector('wa-popup')!;
          const bounds = element
            .shadowRoot!.querySelector('[part~="listbox"]')!
            .getBoundingClientRect();
          const anchor = element.getBoundingClientRect();
          return (
            popup.getAttribute('sync') === 'width' &&
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
    await select.click();
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .shadowRoot!.querySelector('[part~="listbox"]')!
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
    await select.evaluate((element) => {
      element.addEventListener(
        'wa-after-show',
        () => {
          element.setAttribute('data-qa-settled', 'true');
        },
        { once: true },
      );
    });
    await select.click();
    await expect(select).toHaveAttribute('data-qa-settled', 'true');
    await expect(select).toHaveAttribute('open');
    await expect
      .poll(async () =>
        select.evaluate((element) => {
          const bounds = element
            .shadowRoot!.querySelector('[part~="listbox"]')!
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
