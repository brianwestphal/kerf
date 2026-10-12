import { expect, type Locator, type Page, test } from '@playwright/test';

const COMMANDS = '[data-list-id="demo-reorder-commands"]';
const FILES = '[data-list-id="demo-reorder-files"]';
const ROW =
  ':is([data-component="list-item"], [data-component="list-action-row"])';

function order(page: Page, list: string) {
  return page
    .locator(`${list} ${ROW}`)
    .evaluateAll((rows) =>
      rows.map((row) => (row as HTMLElement).dataset.itemId),
    );
}

function row(page: Page, list: string, id: string): Locator {
  return page.locator(`${list} ${ROW}[data-item-id="${id}"]`);
}

/** Drag `source` and hover `target` near its top or bottom edge without dropping. */
async function hoverDrag(
  page: Page,
  source: Locator,
  target: Locator,
  edge: 'top' | 'bottom',
) {
  await target.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 6, {
    steps: 4,
  });
  const y = edge === 'top' ? to.y + 6 : to.y + to.height - 6;
  await page.mouse.move(to.x + to.width / 2, y, { steps: 8 });
}

test.describe('list row drag-to-reorder', () => {
  test('dragging a ListItem paints the dragging row and insertion edge, then reorders on drop', async ({
    page,
  }) => {
    await page.goto('/?component=list-item');
    const source = row(page, COMMANDS, 'run-tests');
    const target = row(page, COMMANDS, 'lint');

    await hoverDrag(page, source, target, 'bottom');
    await expect(source).toHaveAttribute('data-dragging', 'true');
    await expect(source).toHaveCSS('opacity', '0.55');
    await expect(target).toHaveAttribute('data-drop-position', 'after');

    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 6, { steps: 4 });
    await expect(target).toHaveAttribute('data-drop-position', 'before');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 6, {
      steps: 4,
    });
    await expect(target).toHaveAttribute('data-drop-position', 'after');
    await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height - 6);
    await page.mouse.up();

    await expect
      .poll(() => order(page, COMMANDS))
      .toEqual(['build', 'lint', 'run-tests', 'deploy-preview']);
    await expect(page.locator(`${COMMANDS} [data-dragging]`)).toHaveCount(0);
    await expect(page.locator(`${COMMANDS} [data-drop-position]`)).toHaveCount(
      0,
    );
  });

  test('a pressed selection drags together', async ({ page }) => {
    await page.goto('/?component=list-item');
    await row(page, COMMANDS, 'lint').click();
    await row(page, COMMANDS, 'deploy-preview').click();
    await expect(row(page, COMMANDS, 'lint')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await row(page, COMMANDS, 'deploy-preview').dragTo(
      row(page, COMMANDS, 'run-tests'),
      { targetPosition: { x: 40, y: 4 } },
    );
    await expect
      .poll(() => order(page, COMMANDS))
      .toEqual(['lint', 'deploy-preview', 'run-tests', 'build']);
  });

  test('ListActionRow drags by its root', async ({ page }) => {
    await page.goto('/?component=list-action-row');
    const source = row(page, FILES, 'readme');
    await expect(source).toHaveAttribute('draggable', 'true');
    await source.dragTo(row(page, FILES, 'package'), {
      targetPosition: { x: 40, y: 38 },
    });
    await expect
      .poll(() => order(page, FILES))
      .toEqual(['changelog', 'package', 'readme']);
  });

  test('Alt+Shift+Arrow moves the focused row and keeps focus on it', async ({
    page,
  }) => {
    await page.goto('/?component=list-item');
    await row(page, COMMANDS, 'deploy-preview').focus();
    await page.keyboard.press('Alt+Shift+ArrowUp');
    await page.keyboard.press('Alt+Shift+ArrowUp');
    await expect
      .poll(() => order(page, COMMANDS))
      .toEqual(['run-tests', 'deploy-preview', 'build', 'lint']);
    await expect(row(page, COMMANDS, 'deploy-preview')).toBeFocused();

    await page.goto('/?component=list-action-row');
    const primary = row(page, FILES, 'readme').locator(
      '.kui-list-action-row__primary',
    );
    await primary.focus();
    await page.keyboard.press('Alt+Shift+ArrowDown');
    await expect
      .poll(() => order(page, FILES))
      .toEqual(['changelog', 'readme', 'package']);
    await expect(
      row(page, FILES, 'readme').locator('.kui-list-action-row__primary'),
    ).toBeFocused();
  });

  test('state specimens draw a 2px brand insertion line inside each edge', async ({
    page,
  }) => {
    for (const component of ['list-item', 'list-action-row']) {
      await page.goto(`/?component=${component}`);
      const dragged = page.locator(`${ROW}[data-item-id="reorder-dragging"]`);
      await expect(dragged).toHaveCSS('opacity', '0.55');
      for (const [id, edge] of [
        ['reorder-before', 'top'],
        ['reorder-after', 'bottom'],
      ] as const) {
        const geometry = await page
          .locator(`${ROW}[data-item-id="${id}"]`)
          .first()
          .evaluate((element) => {
            const line = window.getComputedStyle(element, '::after');
            const brand = window
              .getComputedStyle(element)
              .getPropertyValue('--kui-color-brand-border-loud');
            const probe = document.createElement('span');
            probe.style.color = brand;
            document.body.append(probe);
            const brandColor = window.getComputedStyle(probe).color;
            probe.remove();
            return {
              height: line.height,
              top: line.top,
              bottom: line.bottom,
              background: line.backgroundColor,
              brandColor,
            };
          });
        expect(geometry.height).toBe('2px');
        expect(geometry.background).toBe(geometry.brandColor);
        expect(edge === 'top' ? geometry.top : geometry.bottom).toBe('0px');
      }
    }
  });
});
