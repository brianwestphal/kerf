import { expect, test } from '@playwright/test';

test('ContentItem owns the 8/1/8 geometry and frames without moving content', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=content-item');

  const item = (name: string) =>
    page.locator(`[data-demo="content-item"] [data-demo-item="${name}"]`);
  const geometry = (name: string) =>
    item(name).evaluate((element) => {
      const style = globalThis.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const content = element.firstElementChild!.getBoundingClientRect();
      return {
        component: element.getAttribute('data-component'),
        marginLeft: style.marginLeft,
        padding: style.paddingTop,
        borderWidth: style.borderTopWidth,
        borderColor: style.borderTopColor,
        radius: style.borderTopLeftRadius,
        contentInset: content.left - box.left,
      };
    });

  const plain = await geometry('plain');
  const framed = await geometry('framed');
  const pill = await geometry('pill');

  expect(plain).toMatchObject({
    component: 'content-item',
    marginLeft: '8px',
    padding: '8px',
    borderWidth: '1px',
    borderColor: 'rgba(0, 0, 0, 0)',
    radius: '12px',
    contentInset: 9,
  });
  expect(framed).toMatchObject({
    marginLeft: '8px',
    padding: '8px',
    borderWidth: '1px',
    radius: '12px',
    contentInset: 9,
  });
  expect(framed.borderColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(pill).toMatchObject({ radius: '22px', contentInset: 9 });
  expect(pill.borderColor).not.toBe('rgba(0, 0, 0, 0)');

  const flush = item('flush');
  await expect(flush).toHaveClass(/kui-content-item--flush/);
  expect(
    await flush.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return [
        style.paddingTop,
        style.paddingBottom,
        style.borderTopWidth,
        style.borderBottomWidth,
        style.paddingLeft,
        style.borderLeftWidth,
      ];
    }),
  ).toEqual(['0px', '0px', '0px', '0px', '8px', '1px']);

  // Framing changes only the border paint: both items' content starts at the
  // same x position inside the shared pane.
  const lefts = await Promise.all(
    ['plain', 'framed'].map((name) =>
      item(name).evaluate(
        (element) => element.firstElementChild!.getBoundingClientRect().left,
      ),
    ),
  );
  expect(lefts[0]).toBe(lefts[1]);

  if (browserName === 'chromium')
    await page
      .locator('[data-demo="content-item"]')
      .screenshot({ path: 'test-results/content-item-wide.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator('html')
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
});

test('a rich static card gives its primary and secondary buttons independent actions', async ({
  page,
}) => {
  await page.goto('/?component=content-item');
  const card = page.locator('[data-demo-item="multi-action-card"]');
  await expect(card).not.toHaveAttribute('role', 'button');
  const primary = card.locator('[data-action="log-card-primary"]');
  const secondary = card.locator('[data-action="log-more"]');
  await primary.focus();
  await primary.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText('Quotation opened');
  await secondary.focus();
  await secondary.press('Enter');
  await expect(page.locator('.catalog-log')).toHaveText(
    'More actions requested',
  );
});

test('a nested Web Awesome button keeps Enter and Space from activating its ContentItem', async ({
  page,
}) => {
  await page.goto('/?component=content-item');
  const card = page.locator('[data-demo-item="card-with-action"]');
  const action = card.locator('wa-button');
  await page.evaluate(() => {
    document.body.dataset.testCardClicks = '0';
    document.addEventListener('click', (event) => {
      if (
        event.target instanceof Element &&
        event.target.matches('[data-demo-item="card-with-action"]')
      )
        document.body.dataset.testCardClicks = String(
          Number(document.body.dataset.testCardClicks) + 1,
        );
    });
  });
  for (const key of ['Enter', 'Space']) {
    await action.focus();
    await action.press(key);
    await expect(page.locator('.catalog-log')).toHaveText(
      'More actions requested',
    );
    await expect(page.locator('body')).toHaveAttribute(
      'data-test-card-clicks',
      '0',
    );
    await expect(card).not.toHaveAttribute('data-kui-pressed');
  }
  await card.focus();
  await card.press('Enter');
  await expect(page.locator('body')).toHaveAttribute(
    'data-test-card-clicks',
    '1',
  );
});
