// KF-JN4PF5: each ux-demo configuration, built in the editor the way a
// person would (palette drags, outline and canvas selection, Inspector
// fields), then exported and compared with what the demo renders. A
// configuration the editor cannot build yet has a ticket instead of a test.
import { expect, test } from '@playwright/test';

import {
  addIcon,
  canvas,
  choose,
  dragComponent,
  emptySpot,
  exported,
  icon,
  newDocument,
  node,
  page as pane,
  select,
  setText,
  turnOn,
} from './build.js';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await newDocument(page);
});

test('builds Button › Tones', async ({ page }) => {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Button/);
  for (let copy = 0; copy < 3; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  const buttons = [
    ['Cancel', undefined],
    ['Save', 'brand'],
    ['Price Check', 'success'],
    ['Delete', 'danger'],
  ] as const;
  for (const [index, [label, tone]] of buttons.entries()) {
    await select(page, /^Button/, index);
    await setText(page, 'children', label);
    if (tone) await choose(page, 'tone', tone);
    await setText(page, 'action', 'log-more');
  }
  await expect(canvas(page).locator('.kui-button')).toHaveText(
    buttons.map(([label]) => label),
  );
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { wrap: true },
        {
          children: buttons.map(([children, tone]) =>
            node('button', {
              children,
              ...(tone ? { tone } : {}),
              action: 'log-more',
            }),
          ),
        },
      ),
    ),
  );
});

test('builds Button › Compact and Icons', async ({ page }) => {
  await dragComponent(page, 'Row', () => emptySpot(page));
  await dragComponent(page, 'Button', () => emptySpot(page));
  await select(page, /^Row/);
  await turnOn(page, 'wrap');
  await choose(page, 'vAlign', 'middle');
  // One Button set up, then duplicated twice and changed.
  await select(page, /^Button/);
  await setText(page, 'children', 'New Item');
  await choose(page, 'size', 'compact');
  await setText(page, 'action', 'log-more');
  await addIcon(page, 'icon', 'plus');
  await choose(page, 'size', 's');
  await select(page, /^Button/);
  await page.keyboard.press('ControlOrMeta+d');
  await page.keyboard.press('ControlOrMeta+d');
  // The second: a secondary link that downloads.
  await select(page, /^Button/, 1);
  await setText(page, 'children', 'Download');
  await choose(page, 'size', 'Not set');
  await choose(page, 'emphasis', 'secondary');
  await setText(page, 'action', '');
  await setText(page, 'href', '#button');
  await select(page, /^LucideIcon/, 1);
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('download');
  await page.locator('[data-editor-icon="download"]').click();
  // The third: a plain danger action.
  await select(page, /^Button/, 2);
  await setText(page, 'children', 'Remove');
  await choose(page, 'size', 'Not set');
  await choose(page, 'tone', 'danger');
  await choose(page, 'emphasis', 'plain');
  await select(page, /^LucideIcon/, 2);
  await page.locator('[data-editor-icon-place]').first().click();
  await page.keyboard.type('trash 2');
  await page.locator('[data-editor-icon="trash-2"]').click();
  await expect(canvas(page).locator('.kui-button')).toHaveText([
    'New Item',
    'Download',
    'Remove',
  ]);
  const withIcon = (glyph: string) => ({ icon: [icon(glyph, { size: 's' })] });
  expect(await exported(page)).toEqual(
    pane(
      node(
        'row',
        { wrap: true, vAlign: 'middle' },
        {
          children: [
            node(
              'button',
              { children: 'New Item', size: 'compact', action: 'log-more' },
              withIcon('plus'),
            ),
            node(
              'button',
              { children: 'Download', emphasis: 'secondary', href: '#button' },
              withIcon('download'),
            ),
            node(
              'button',
              {
                children: 'Remove',
                tone: 'danger',
                emphasis: 'plain',
                action: 'log-more',
              },
              withIcon('trash-2'),
            ),
          ],
        },
      ),
    ),
  );
});

test('builds TextField › Labels and Hints', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'TextField', () => emptySpot(page));
  await select(page, /^List/);
  await choose(page, 'gap', 'xs');
  await select(page, /^TextField/);
  await page.keyboard.press('ControlOrMeta+d');
  await select(page, /^TextField/);
  await setText(page, 'label', 'Project Name');
  await setText(page, 'value', 'Component library');
  await setText(page, 'hint', 'Visible to collaborators');
  await turnOn(page, 'clearable');
  await select(page, /^TextField/, 1);
  await setText(page, 'ariaLabel', 'Search Components');
  await setText(page, 'label', '');
  await setText(page, 'placeholder', 'Search components');
  await choose(page, 'type', 'search');
  await turnOn(page, 'clearable');
  await addIcon(page, 'icon', 'search');
  await choose(page, 'size', 's');
  expect(await exported(page)).toEqual(
    pane(
      node(
        'list',
        { gap: 'xs' },
        {
          children: [
            node('text-field', {
              label: 'Project Name',
              value: 'Component library',
              hint: 'Visible to collaborators',
              clearable: true,
            }),
            node(
              'text-field',
              {
                ariaLabel: 'Search Components',
                placeholder: 'Search components',
                type: 'search',
                clearable: true,
              },
              { icon: [icon('search', { size: 's' })] },
            ),
          ],
        },
      ),
    ),
  );
});

test('builds ListItem › Divided List', async ({ page }) => {
  await dragComponent(page, 'List', () => emptySpot(page));
  await dragComponent(page, 'ListItem', () => emptySpot(page));
  await select(page, /^ListItem/);
  await setText(page, 'description', 'Member');
  await setText(page, 'action', 'log-projects');
  await choose(page, 'divider', 'after');
  for (let copy = 0; copy < 3; copy += 1)
    await page.keyboard.press('ControlOrMeta+d');
  const names = ['Ana Ruiz', 'Ben Okafor', 'Chen Wei', 'Dana Holt'];
  for (const [index, name] of names.entries()) {
    await select(page, /^ListItem/, index);
    await setText(page, 'label', name);
    await setText(page, 'itemId', `member-${index}`);
    if (index === 1) await turnOn(page, 'selected');
    // The demo's last row passes divider="none", the default.
    if (index === names.length - 1) await choose(page, 'divider', 'Not set');
  }
  expect(await exported(page)).toEqual(
    pane(
      node('list', undefined, {
        children: names.map((label, index) =>
          node('list-item', {
            label,
            action: 'log-projects',
            itemId: `member-${index}`,
            description: 'Member',
            ...(index < names.length - 1 ? { divider: 'after' } : {}),
            ...(index === 1 ? { selected: true } : {}),
          }),
        ),
      }),
    ),
  );
});
