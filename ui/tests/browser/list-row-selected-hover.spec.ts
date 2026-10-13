import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test } from '@playwright/test';

// Hovering a selected, current, or pressed list row (ListActionRow, ListItem)
// keeps its selected tint; only an unselected row takes the hover tokens.

const HOVER_BORDER = 'rgb(160, 50, 90)';
const HOVER_BACKGROUND = 'rgb(219, 242, 232)';
const SELECTED_BORDER = 'rgb(20, 80, 160)';
const SELECTED_BACKGROUND = 'rgb(242, 228, 247)';

test('a selected or pressed ListActionRow keeps its selected tint while hovered', async ({
  page,
}) => {
  const css = await readFile(
    resolve(
      import.meta.dirname,
      '../../src/components/collections/list-action-row/list-action-row.css',
    ),
    'utf8',
  );
  const row = (name: string, state: string) =>
    `<div class="kui-list-action-row" data-row="${name}" ${state}><button type="button" class="kui-list-action-row__primary">${name}</button></div>`;
  await page.setViewportSize({ width: 600, height: 400 });
  await page.setContent(
    `<style>:root {
      --kui-color-neutral-border-normal: ${HOVER_BORDER};
      --kui-color-neutral-fill-quiet: ${HOVER_BACKGROUND};
      --kui-color-brand-border-quiet: ${SELECTED_BORDER};
      --kui-color-brand-fill-normal: ${SELECTED_BACKGROUND};
    }</style>${row('rest', '')}${row('selected', 'data-selected="true"')}${row('pressed', 'data-pressed="true"')}`,
  );
  await page.addStyleTag({
    content: css.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });

  const tint = (name: string) =>
    page.locator(`[data-row="${name}"]`).evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { background: style.backgroundColor, shadow: style.boxShadow };
    });

  await page.locator('[data-row="rest"] button').hover();
  const rest = await tint('rest');
  expect(rest.background).toBe(HOVER_BACKGROUND);
  expect(rest.shadow).toContain(HOVER_BORDER);

  for (const name of ['selected', 'pressed']) {
    await page.locator(`[data-row="${name}"] button`).hover();
    const hovered = await tint(name);
    expect(hovered.background, name).toBe(SELECTED_BACKGROUND);
    expect(hovered.shadow, name).toContain(SELECTED_BORDER);
  }
});

test('a selected or current ListItem keeps its selected tint while hovered', async ({
  page,
}) => {
  const css = await readFile(
    resolve(
      import.meta.dirname,
      '../../src/components/collections/list-item/list-item.css',
    ),
    'utf8',
  );
  const item = (name: string, state: string) =>
    `<button type="button" class="kui-list-item" data-row="${name}" ${state}>${name}</button>`;
  await page.setViewportSize({ width: 600, height: 400 });
  await page.setContent(
    `<style>:root {
      --kui-list-item-hover-border: ${HOVER_BORDER};
      --kui-list-item-hover-background: ${HOVER_BACKGROUND};
      --kui-list-item-selected-border: ${SELECTED_BORDER};
      --kui-list-item-selected-background: ${SELECTED_BACKGROUND};
    }</style>${item('rest', '')}${item('current', 'aria-current="page"')}${item('pressed', 'aria-pressed="true"')}`,
  );
  await page.addStyleTag({
    content: css.replace(
      /remify\(([\d.]+)px\)/g,
      (_, pixels: string) => `${String(Number(pixels) / 16)}rem`,
    ),
  });

  const rest = page.locator('[data-row="rest"]');
  await rest.hover();
  await expect(rest).toHaveCSS('background-color', HOVER_BACKGROUND);
  await expect(rest).toHaveCSS('border-top-color', HOVER_BORDER);

  for (const name of ['current', 'pressed']) {
    const row = page.locator(`[data-row="${name}"]`);
    await row.hover();
    await expect(row).toHaveCSS('background-color', SELECTED_BACKGROUND);
    await expect(row).toHaveCSS('border-top-color', SELECTED_BORDER);
  }
});
