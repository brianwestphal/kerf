import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  area,
  inspectorBack,
  inspectorSettled,
  inspectorTop,
  openLibrary,
} from './areas.js';
import { sampleName } from './sample-name.js';

/**
 * Building a document the way a person does (KF-JN4PF5: build every ux-demo
 * configuration in the editor): palette drags, outline and canvas clicks,
 * and Inspector fields, never document surgery.
 */

/** Starts a new, empty document. */
export async function newDocument(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'New' }).click();
  // KF-PK3GVY: New has no root; its first component, a Pane by default,
  // becomes a filling root, as New's own Pane did before.
  await canvas(page)
    .locator('[data-editor-empty="root"]')
    .getByRole('button', { name: 'Add' })
    .click();
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
  await openLibrary(page);
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

/**
 * KF-QWDPM3: opens the Properties page holding prop `name` as a person
 * would, from its group's row and then its task's, unless the field (or its
 * Configure or content row) already shows.
 */
export async function showProp(page: Page, name: string) {
  const here = [
    `[data-editor-prop="${name}"]`,
    `[data-editor-open^='{"prop":"${name}"']`,
    `[data-editor-content-add="${name}"]`,
    `[data-editor-content-node="${name}"]`,
    `[data-editor-icon-place^='{"prop":"${name}"']`,
    `[data-editor-promote-prop="${name}"]`,
  ].join(', ');
  for (let step = 0; step < 6; step += 1) {
    if (await page.locator(here).filter({ visible: true }).count()) return;
    const row = inspectorTop(page)
      .locator(`[data-editor-group-props~="${name}"]`)
      .first();
    if (!(await row.count())) {
      // Another group's page: back out toward the overview.
      if (
        !(await inspectorTop(page).count()) ||
        (await inspectorTop(page).getAttribute('data-nav-key')) === 'inspector'
      )
        return;
      await inspectorBack(page);
      continue;
    }
    // The overview's directory shows under its Properties tab.
    if (!(await row.isVisible())) await area(page, 'Properties');
    await openGroupRow(page, row);
    // The page holding it, though its field may carry no hook (a content
    // prop holding nodes reads as a disabled field).
    if (
      !(await inspectorTop(page)
        .locator(`[data-editor-group-props~="${name}"]`)
        .count())
    )
      return;
  }
}

/** Follows a Properties directory row onto the page it opens. */
async function openGroupRow(page: Page, row: Locator) {
  const path = await row.getAttribute('data-editor-prop-group');
  await row.click();
  await expect(
    inspectorTop(page).locator(`[data-editor-properties-page="${path}"]`),
  ).toBeVisible();
  await inspectorSettled(page);
}

/**
 * KF-QWDPM3: shows `target` (a row on some Properties page, such as a
 * promoted prop's param field or a Configure button), opening each group's
 * page, and each task's, from the overview until it shows; `hint` names a
 * prop that page holds, tried first.
 */
export async function reveal(page: Page, target: Locator, hint?: string) {
  const shown = () => target.filter({ visible: true }).count();
  if (await shown()) return;
  if (hint) {
    await showProp(page, hint);
    if (await shown()) return;
  }
  await area(page, 'Properties');
  if (await shown()) return;
  const rows = (scope: Locator) =>
    scope.locator(
      // A group's or task's row; not All properties or a field's Bind row.
      `[data-action="editor-inspector-group"][data-editor-group-props]`,
    );
  const groups = await rows(inspectorTop(page)).evaluateAll((items) =>
    items.map((item) => item.getAttribute('data-editor-prop-group')!),
  );
  for (const group of groups) {
    await openGroupRow(
      page,
      inspectorTop(page).locator(`[data-editor-prop-group="${group}"]`),
    );
    if (await shown()) return;
    const tasks = await rows(inspectorTop(page)).evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-editor-prop-group')!),
    );
    for (const task of tasks) {
      await openGroupRow(
        page,
        inspectorTop(page).locator(`[data-editor-prop-group="${task}"]`),
      );
      if (await shown()) return;
      await inspectorBack(page);
    }
    await inspectorBack(page);
  }
  await expect(target.filter({ visible: true }).first()).toBeVisible();
}

/**
 * KF-FN28S3: opens the Bind page of the selected node's prop labeled
 * `label` (as the Inspector words it), from its row on the prop's page.
 */
export async function openBind(page: Page, label: string) {
  const words = label.split(' ');
  const hint = words
    .map((word, index) =>
      index ? word[0]!.toUpperCase() + word.slice(1) : word.toLowerCase(),
    )
    .join('');
  const row = page.getByRole('button', {
    name: new RegExp(`^Bind or promote ${label.toLowerCase()}:`),
  });
  await reveal(page, row, hint);
  await row.filter({ visible: true }).first().click();
  await expect(
    inspectorTop(page).locator('[data-editor-bind-page]'),
  ).toBeVisible();
  await inspectorSettled(page);
}

/** KF-FN28S3: shows the selected node's data attributes, on Integration. */
export async function showDataAttributes(page: Page) {
  const add = page
    .locator('[data-action="editor-add-data-attribute"]')
    .filter({ visible: true });
  if (await add.count()) return;
  await area(page, 'Properties');
  await openGroupRow(
    page,
    inspectorTop(page).locator('[data-editor-prop-group="Integration"]'),
  );
}

/** Shows the field of param `param`, on the page of the prop it binds. */
export const showParam = (page: Page, param: string) =>
  reveal(page, page.locator(`[data-editor-param="${param}"]`));

/** Shows a prop's Configure row by its button label (`Configure tabs`). */
export async function showConfigure(page: Page, label: string) {
  const words = label.replace(/^Configure /, '').split(' ');
  const hint = words
    .map((word, index) =>
      index ? word[0]!.toUpperCase() + word.slice(1) : word,
    )
    .join('');
  await reveal(page, page.getByRole('button', { name: label }), hint);
}

const prop = (page: Page, name: string) =>
  page
    .locator(`[data-editor-prop="${name}"]`)
    .filter({ visible: true })
    .first();

/**
 * Unsets optional text prop `name` with its Not set toggle (KF-3Y2GS2): an
 * emptied field is the empty string, not an unset prop.
 */
export async function unset(page: Page, name: string) {
  await showProp(page, name);
  const toggle = prop(page, name).locator('.kui-text-field__toggle');
  if ((await toggle.getAttribute('aria-pressed')) !== 'true')
    await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
}

/**
 * Types `value` into a text prop and commits it (empty is ""): Enter for a
 * one-line field, and leaving the field (Tab) for a multi-line one, where
 * Enter types a line break (KF-8FCJ02).
 */
export async function setText(page: Page, name: string, value: string) {
  await showProp(page, name);
  const field = prop(page, name).locator('input, textarea').first();
  await field.click();
  await page.keyboard.press('ControlOrMeta+a');
  if (value) await page.keyboard.type(value);
  else await page.keyboard.press('Backspace');
  const multiline = await field.evaluate(
    (element) => element.tagName === 'TEXTAREA',
  );
  await page.keyboard.press(multiline ? 'Tab' : 'Enter');
}

/** Picks `option` in an enum prop's Select. */
export async function choose(page: Page, name: string, option: string) {
  await showProp(page, name);
  await prop(page, name).locator('.kui-select__trigger').click();
  const choice = prop(page, name).getByRole('option', {
    name: option,
    exact: true,
  });
  await choice.click();
  // KF-GHMFPC: return only once the popup has closed. In WebKit a click that
  // follows at once (Configure, after picking "Custom…") could otherwise land
  // while the popup was still closing and be dropped.
  await expect(choice).toBeHidden();
}

/** Turns a boolean prop's Switch on. */
export async function turnOn(page: Page, name: string) {
  await showProp(page, name);
  await prop(page, name).locator('.kui-switch__control').click();
  await expect(prop(page, name).getByRole('switch')).toBeChecked();
}

/** Turns a boolean prop off with its switch. */
export async function turnOff(page: Page, name: string) {
  await showProp(page, name);
  await prop(page, name).locator('.kui-switch__control').click();
  await expect(prop(page, name).getByRole('switch')).not.toBeChecked();
}

/** Adds the suggested node to a content prop (an icon) and picks its glyph. */
export async function addIcon(page: Page, prop: string, glyph: string) {
  await showProp(page, prop);
  await page.locator(`[data-editor-content-add="${prop}"]`).click();
  // The new LucideIcon is selected; its icon row is on its Content page.
  await showProp(page, 'icon');
  await page
    .locator('[data-editor-icon-place]')
    .filter({ visible: true })
    .first()
    .click();
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
  await saveSample(document);
  return withoutIds(document.root);
}

/** Where each build's document is saved, for the editor's Open to load. */
export const SAMPLES = new URL('../../samples/', import.meta.url);

/**
 * Saves the exported document as the build's sample (`samples/<name>.kui.json`),
 * so each ux-demo configuration the editor builds can be opened in it. The
 * last export of a test wins. Chromium alone writes, so engines never race;
 * the document takes the test's name (`sampleName`) and node ids renumbered
 * in document order, so a rerun leaves an unchanged build's file
 * byte-identical.
 */
async function saveSample(document: { name: string; root: unknown }) {
  const info = test.info();
  if (
    info.project.name !== 'chromium' ||
    !/[\\/]demo-builds[\\/][^\\/]+\.spec\.ts$/.test(info.file) ||
    !info.title.startsWith('builds ')
  )
    return;
  const { name, file } = sampleName(info.title);
  const ids = new Map<string, string>();
  const renumber = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(renumber);
    if (value === null || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => {
        if (key === 'id' && 'type' in value && typeof inner === 'string') {
          if (!ids.has(inner))
            ids.set(inner, String(ids.size + 1).padStart(26, '0'));
          return [key, ids.get(inner)];
        }
        return [key, renumber(inner)];
      }),
    );
  };
  const sample = { ...document, name, root: renumber(document.root) };
  await mkdir(SAMPLES, { recursive: true });
  await writeFile(
    new URL(file, SAMPLES),
    // Stable two-space JSON, as the editor's own Save writes it.
    `${JSON.stringify(sample, null, 2)}\n`,
  );
}

function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds);
  if (value === null || typeof value !== 'object') return value;
  // A node's id, not an `id` prop.
  const isNode = 'type' in value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !(isNode && key === 'id'))
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

/**
 * The new document's root Pane holding `content`. It starts with `fill` on
 * (KF-Z70DBC), so the view fills an app's or play mode's screen.
 */
export const page = (...content: unknown[]) =>
  node('pane', { fill: true }, { content });

/** A field inside a prop value, by its place (`choices`, `[0, 'label']`). */
const field = (page: Page, prop: string, path: readonly (string | number)[]) =>
  page
    .locator(`[data-editor-field='${JSON.stringify({ prop, path })}']`)
    .first();

/**
 * Types `value` into a field of a prop value and commits it with Enter. A
 * typed choice's open member (a Number… badge) shares its place with the
 * choice's Select; the text input is the one typed into.
 */
export async function setField(
  page: Page,
  prop: string,
  path: readonly (string | number)[],
  value: string,
) {
  await page
    .locator(`[data-editor-field='${JSON.stringify({ prop, path })}']`)
    .locator('input, textarea')
    .first()
    .click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(value);
  await page.keyboard.press('Enter');
}

/** Picks `option` in a field's Select (an enum, or a typed choice's type). */
export async function chooseField(
  page: Page,
  prop: string,
  path: readonly (string | number)[],
  option: string,
) {
  const select = field(page, prop, path);
  if (!path.length) await showProp(page, prop);
  await select.locator('.kui-select__trigger').click();
  await select.getByRole('option', { name: option, exact: true }).click();
}

/**
 * Embeds the selected node in a new container from the Embed in section of
 * the Inspector's Flow area (KF-6MGYSG); the container is selected afterwards.
 */
export async function embedIn(page: Page, name: string) {
  await area(page, 'Flow');
  await page
    .locator('[data-editor-embed-section] [data-editor-embed]', {
      hasText: new RegExp(`^${name}$`),
    })
    .click();
}

/**
 * Embeds the selected node in a container the Embed in section does not
 * offer first, through Other… and its filter; the container is selected
 * afterwards.
 */
export async function embedInOther(page: Page, name: string) {
  await area(page, 'Flow');
  await page.getByRole('button', { name: 'Other…' }).click();
  const dialog = page.locator('dialog[open]');
  // The filter has focus when the dialog opens.
  await expect(dialog.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type(name);
  await dialog.getByRole('button', { name, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

/** A whole-screen layout embedded as Embed in › SizedRegion leaves it. */
export const sized = (layout: unknown) =>
  node(
    'sized-region',
    { minHeight: { $css: 'rem(20)' } },
    {
      children: [layout],
    },
  );

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
  // KF-QWDPM3: a LucideIcon's icon row is on its Content page.
  if (!(await row.filter({ visible: true }).count()))
    await showProp(page, 'icon');
  await row.filter({ visible: true }).first().click();
  await page.keyboard.type(glyph.replaceAll('-', ' '));
  await page.locator(`[data-editor-icon="${glyph}"]`).click();
}

/** An empty Toolbar zone's placeholder on the canvas, by its zone label. */
export const zoneSpot = (page: Page, label: string) =>
  canvas(page).locator('[data-editor-empty]', { hasText: label }).first();

/** Picks `option` in one of Children › Add a child's Selects. */
async function chooseAdd(page: Page, which: string, option: string) {
  const control = page.locator(`[data-editor-add="${which}"]`);
  await control.locator('.kui-select__trigger').click();
  await control.getByRole('option', { name: option, exact: true }).click();
}

/**
 * Adds component `name` under Children › Add a child, to `zone` when given
 * (a field zone reads `choices › 1 › content`) or to the zone already chosen.
 */
export async function addChild(page: Page, name: string, zone?: string) {
  await area(page, 'Children');
  if (zone) await chooseAdd(page, 'zone', zone);
  await chooseAdd(page, 'component', name);
  await page.locator('[data-action="editor-add-child"]').click();
}
