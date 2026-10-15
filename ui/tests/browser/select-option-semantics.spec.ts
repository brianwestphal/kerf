import { expect, type Locator, type Page, test } from '@playwright/test';

// Each Select option renders its own `role="option"` and an `aria-selected`
// that the controller updates as the person chooses. A kerf re-render (the
// morph applies the template's attributes) must leave every option's role and
// selected state in step with the Select's value, so screen readers never
// lose them. This spec is the end-to-end regression guard: the semantics must
// survive re-renders in single and multiple mode, before and after the person
// interacts.

type OptionSemantics = {
  value: string | null;
  role: string | null;
  ariaSelected: string | null;
  selected: boolean;
};

function semantics(select: Locator): Promise<OptionSemantics[]> {
  return select.evaluate((host) =>
    [...host.querySelectorAll('.kui-select__option')].map((option) => {
      const value = option.getAttribute('data-value');
      const chosen = (host as HTMLElement & { value: string | string[] }).value;
      return {
        value,
        role: option.getAttribute('role'),
        ariaSelected: option.getAttribute('aria-selected'),
        selected: Array.isArray(chosen)
          ? chosen.includes(value!)
          : chosen === value,
      };
    }),
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
  await page.locator(`kui-select[name="${name}"]`).evaluate((host, next) => {
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
  const select = page.locator('kui-select[name="plain-rendering-balance"]');
  await expect(select).toBeVisible();
  await expectConsistent(select, ['balanced']);

  await select.scrollIntoViewIfNeeded();
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('.kui-select__option[data-value="explicit"]').click();
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
  const select = page.locator('kui-select[name="ticket-labels"]');
  await expect(select).toBeVisible();
  await expectConsistent(select, ['bug', 'docs']);

  await select.scrollIntoViewIfNeeded();
  await select.getByRole('combobox').click();
  await expect(select).toHaveAttribute('open', '');
  await select.locator('.kui-select__option[data-value="feature"]').click();
  await expectConsistent(select, ['bug', 'feature', 'docs']);
  await page.keyboard.press('Escape');

  // An unrelated re-render driven by a single Select's signal.
  await chooseProgrammatically(page, 'plain-rendering-balance', 'quiet');
  await expectConsistent(select, ['bug', 'feature', 'docs']);
  await expect(
    select.getByRole('option', { selected: true, includeHidden: true }),
  ).toHaveText(['Bug', 'Feature', 'Docs']);
  await expectConsistent(
    page.locator('kui-select[name="plain-rendering-balance"]'),
    ['quiet'],
  );
});
