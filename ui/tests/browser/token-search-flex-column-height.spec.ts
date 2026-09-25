import { expect, test } from '@playwright/test';

// KF-EPEM88: an expanded collapsible TokenSearchField placed directly in a flex
// column must stay a single line tall. It previously took its expanded WIDTH as a
// `flex-basis`, which the column read as the field's HEIGHT — stretching it to
// ~480px. The fix drives the inline size through `width` and uses `flex: 0 1 auto`,
// so the field never leaks its width into the cross axis.
const FIELD = `
  <div class="kui-token-search" data-component="token-search-field"
       data-collapsible="true" data-expanded="true" data-disabled="false"
       data-has-trailing="false">
    <span class="kui-token-search__leading" aria-hidden="true"></span>
    <div class="kui-token-search__editor" role="searchbox" contenteditable="true"
         data-placeholder="Search"></div>
  </div>`;

test('a collapsible field in a flex column stays a single line tall', async ({
  page,
}) => {
  // Load the page that pulls in token-search-field.css + the foundation tokens.
  await page.goto('/?component=token-search-field');
  await expect(
    page
      .locator('[data-demo="token-search-field"] [data-collapsible="true"]')
      .first(),
  ).toBeVisible();

  const heights = await page.evaluate((markup) => {
    const make = (flexDirection: string) => {
      const host = document.createElement('div');
      host.style.display = 'flex';
      host.style.flexDirection = flexDirection;
      host.style.alignItems = flexDirection === 'row' ? 'center' : 'flex-start';
      host.style.width = '360px';
      host.innerHTML = markup;
      document.body.appendChild(host);
      const field = host.querySelector('.kui-token-search') as HTMLElement;
      const height = field.getBoundingClientRect().height;
      host.remove();
      return height;
    };
    return { column: make('column'), row: make('row') };
  }, FIELD);

  // A single-line search field is ~44px; well under 60px in every engine.
  expect(heights.column).toBeLessThan(60);
  // The row context (a toolbar) is unaffected and also a single line.
  expect(heights.row).toBeLessThan(60);
});
