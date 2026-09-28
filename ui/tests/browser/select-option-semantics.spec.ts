import { expect, type Locator, type Page, test } from '@playwright/test';

// Web Awesome gives each wa-option `role="option"` and an `aria-selected`
// that tracks its live `selected` state. The Select's template does not
// render those attributes, so a kerf re-render (the morph removes attributes
// the template omits) used to strip them, and screen readers lost every
// option's role and selected state. They must survive re-renders in single
// and multiple mode, before and after the person interacts.

type OptionSemantics = {
  value: string | null;
  role: string | null;
  ariaSelected: string | null;
  selected: boolean;
};

function semantics(select: Locator): Promise<OptionSemantics[]> {
  return select.evaluate((host) =>
    [...host.querySelectorAll('wa-option')].map((option) => ({
      value: option.getAttribute('value'),
      role: option.getAttribute('role'),
      ariaSelected: option.getAttribute('aria-selected'),
      selected: (option as HTMLElement & { selected: boolean }).selected,
    })),
  );
}

async function expectConsistent(select: Locator, chosen: readonly string[]) {
  await expect
    .poll(async () =>
      (await semantics(select)).map(
        (option) =>
          `${option.value}:${option.role}:${option.ariaSelected}:${option.selected}`,
      ),
    )
    .toEqual(
      (await semantics(select)).map((option) => {
        const on = chosen.includes(option.value ?? '');
        return `${option.value}:option:${on}:${on}`;
      }),
    );
}

/** Re-render the demo by changing a single Select's controlling signal. */
async function chooseProgrammatically(page: Page, name: string, value: string) {
  await page.locator(`wa-select[name="${name}"]`).evaluate((host, next) => {
    (host as HTMLElement & { value: string }).value = next;
    host.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(
    page.locator('[data-demo="select"] [data-select-value]').first(),
  ).toHaveText(value);
}

test('single Select options keep role and aria-selected across re-renders', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="plain-rendering-balance"]');
  await expect(select).toBeVisible();
  await expectConsistent(select, ['balanced']);

  await select.scrollIntoViewIfNeeded();
  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('wa-option[value="explicit"]').click();
  // The demo's change handler updates the controlling signal and re-renders.
  await expect(
    page.locator('[data-demo="select"] [data-select-value]').first(),
  ).toHaveText('explicit');
  await expectConsistent(select, ['explicit']);
  // The accessibility tree agrees: exactly one selected option, the chosen one.
  await expect(
    select.getByRole('option', { selected: true, includeHidden: true }),
  ).toHaveText(['Explicit']);
  await expect(select.getByRole('option', { includeHidden: true })).toHaveCount(
    3,
  );

  // A re-render driven by another Select that shares the signal.
  await chooseProgrammatically(page, 'rendering-balance', 'quiet');
  await expectConsistent(select, ['quiet']);
});

test('multiple Select options keep role and aria-selected across re-renders', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=select');
  const select = page.locator('wa-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await expectConsistent(select, ['bug', 'docs']);

  await select.scrollIntoViewIfNeeded();
  await select.click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('wa-option[value="feature"]').click();
  await expectConsistent(select, ['bug', 'feature', 'docs']);
  await page.keyboard.press('Escape');

  // An unrelated re-render driven by a single Select's signal.
  await chooseProgrammatically(page, 'plain-rendering-balance', 'quiet');
  await expectConsistent(select, ['bug', 'feature', 'docs']);
  await expect(
    select.getByRole('option', { selected: true, includeHidden: true }),
  ).toHaveText(['Bug', 'Feature', 'Docs']);
  await expectConsistent(
    page.locator('wa-select[name="plain-rendering-balance"]'),
    ['quiet'],
  );
});
