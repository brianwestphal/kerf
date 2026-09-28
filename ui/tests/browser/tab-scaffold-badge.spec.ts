import { expect, type Page, test } from '@playwright/test';

async function badgeGeometry(page: Page) {
  const tab = page.getByRole('tab', { name: 'Projects, 3 updated' });
  await expect(tab).toBeVisible();
  return tab.evaluate((button) => {
    const rect = (element: Element | null) => {
      const box = element!.getBoundingClientRect();
      return {
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
      };
    };
    const icon = button.querySelector('.kui-tab-scaffold__tab-icon svg');
    const badge = button.querySelector('[data-component="badge"]');
    return {
      icon: rect(icon),
      badge: rect(badge),
      bar: rect(button.closest('.kui-tab-scaffold__bar')),
      text: badge?.textContent,
      hidden: badge?.closest('[aria-hidden="true"]') !== null,
    };
  });
}

function expectTopTrailing(
  geometry: Awaited<ReturnType<typeof badgeGeometry>>,
) {
  const { icon, badge, bar } = geometry;
  expect(geometry.text).toBe('3');
  expect(geometry.hidden).toBe(true);
  const iconCenter = (icon.left + icon.right) / 2;
  // Leading edge just past the icon's center, extending past its trailing edge.
  expect(badge.left).toBeGreaterThan(iconCenter);
  expect(badge.left).toBeLessThan(icon.right);
  expect(badge.right).toBeGreaterThan(icon.right);
  // Rides the icon's top edge without leaving the bar.
  expect(badge.top).toBeLessThan(icon.top);
  expect(badge.bottom).toBeGreaterThan(icon.top);
  expect(badge.bottom).toBeLessThan(icon.bottom);
  expect(badge.top).toBeGreaterThanOrEqual(bar.top);
}

test('TabScaffold tab badge folds into the name and sits top-trailing on the icon', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?component=tab-scaffold');
  const scaffold = page.locator('#catalog-tab-scaffold');
  await expect(scaffold).toBeVisible();
  expectTopTrailing(await badgeGeometry(page));
  // A tab without a badge keeps its plain label as its name.
  await expect(
    page.getByRole('tab', { name: 'Search', exact: true }),
  ).toHaveCount(1);
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-scaffold-badge-wide.png',
    });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(scaffold).toBeVisible();
  expectTopTrailing(await badgeGeometry(page));
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-scaffold-badge-narrow.png',
    });

  await page.emulateMedia({ colorScheme: 'dark' });
  if (testInfo.project.name === 'chromium')
    await scaffold.screenshot({
      path: 'test-results/tab-scaffold-badge-narrow-dark.png',
    });
});
