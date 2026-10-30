import { readFile } from 'node:fs/promises';

import { expect, type Locator, type Page } from '@playwright/test';

import { area } from './areas.js';

/**
 * Building a document the way a person does (KF-JN4PF5: build every ux-demo
 * configuration in the editor): palette drags, outline and canvas clicks,
 * and Inspector fields, never document surgery.
 */

/** Starts a new, empty document. */
export async function newDocument(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New' }).click();
  await expect(canvas(page).locator('[data-editor-empty]')).toBeVisible();
}

export const canvas = (page: Page) => page.locator('[data-editor-canvas]');

/** The first empty container's placeholder on the canvas. */
export const emptySpot = (page: Page) =>
  canvas(page).locator('[data-editor-empty]').first();

/** A canvas node by its outline position among nodes of one type. */
export const outlineRow = (page: Page, name: RegExp | string) =>
  page.locator('[data-action="editor-select-node"]', { hasText: name });

/**
 * Drags component `name` from the Components palette and drops it on
 * `target` at `fraction` of its height (the middle drops inside a container,
 * the bottom edge after a node).
 */
export async function dragComponent(
  page: Page,
  name: string,
  target: () => Locator,
  fraction = 0.5,
) {
  await area(page, 'Components');
  const row = page.locator('[data-editor-palette]', {
    hasText: new RegExp(`^${name}$`),
  });
  await row.scrollIntoViewIfNeeded();
  const from = (await row.boundingBox())!;
  await page.mouse.move(from.x + 20, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + from.height / 2, { steps: 3 });
  const to = (await target().boundingBox())!;
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * fraction, {
    steps: 12,
  });
  await page.mouse.up();
}

/** Selects the `nth` outline row matching `name` and shows its Properties. */
export async function select(page: Page, name: RegExp | string, nth = 0) {
  await area(page, 'Outline');
  await outlineRow(page, name).nth(nth).click();
  await area(page, 'Properties');
}

const prop = (page: Page, name: string) =>
  page.locator(`[data-editor-prop="${name}"]`).first();

/** Types `value` into a text prop and commits it with Enter (empty clears). */
export async function setText(page: Page, name: string, value: string) {
  await prop(page, name).locator('input, textarea').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  if (value) await page.keyboard.type(value);
  else await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
}

/** Picks `option` in an enum prop's Select. */
export async function choose(page: Page, name: string, option: string) {
  await prop(page, name).locator('.kui-select__trigger').click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** Turns a boolean prop's Switch on. */
export async function turnOn(page: Page, name: string) {
  await prop(page, name).locator('.kui-switch__control').click();
  await expect(prop(page, name).getByRole('switch')).toBeChecked();
}

/** Adds the suggested node to a content prop (an icon) and picks its glyph. */
export async function addIcon(page: Page, prop: string, glyph: string) {
  await page.locator(`[data-editor-content-add="${prop}"]`).click();
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type(glyph);
  await page.locator(`[data-editor-icon="${glyph}"]`).click();
}

/** Exports the document and returns it without node ids. */
export async function exported(page: Page): Promise<unknown> {
  await page
    .locator('.kui-popup-menu')
    .filter({ hasText: 'Export' })
    .getByRole('button', { name: 'Export' })
    .click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Document (.kui.json)' }).click(),
  ]);
  const document = JSON.parse(await readFile((await download.path())!, 'utf8'));
  return withoutIds(document.root);
}

function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, inner]) => [key, withoutIds(inner)]),
  );
}

/** A node as the exported document spells it, without its id. */
export const node = (
  component: string,
  props?: Record<string, unknown>,
  zones?: Record<string, unknown[]>,
) => ({
  type: `@kerfjs/ui:${component}`,
  ...(props ? { props } : {}),
  ...(zones ? { zones } : {}),
});

/** A LucideIcon named after its glyph, as the demos write them. */
export const icon = (glyph: string, props: Record<string, unknown> = {}) =>
  node('lucide-icon', { icon: { $icon: glyph }, name: glyph, ...props });

/** The new document's root Pane holding `content`. */
export const page = (...content: unknown[]) =>
  node('pane', undefined, { content });

/** A field inside a prop value, such as `choices › 0 › label`. */
const field = (page: Page, prop: string, path: readonly (string | number)[]) =>
  page
    .locator(`[data-editor-field='${JSON.stringify({ prop, path })}']`)
    .first();

/** Types `value` into a field of a prop value and commits it with Enter. */
export async function setField(
  page: Page,
  prop: string,
  path: readonly (string | number)[],
  value: string,
) {
  await field(page, prop, path).locator('input, textarea').first().click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

/** Turns a boolean field of a prop value on. */
export async function turnFieldOn(
  page: Page,
  prop: string,
  path: readonly (string | number)[],
) {
  await field(page, prop, path).locator('.kui-switch__control').click();
}

/** Picks `glyph` in the icon picker its row opens. */
export async function pickIcon(page: Page, row: Locator, glyph: string) {
  await row.click();
  await page.keyboard.type(glyph.replaceAll('-', ' '));
  await page.locator(`[data-editor-icon="${glyph}"]`).click();
}

/** An empty Toolbar zone's placeholder on the canvas, by its zone label. */
export const zoneSpot = (page: Page, label: string) =>
  canvas(page).locator('[data-editor-empty]', { hasText: label }).first();
