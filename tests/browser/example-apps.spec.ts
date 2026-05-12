/**
 * KF-165 — smoke specs for the six complete example apps under
 * `site/src/examples/complete/`. Each test exercises the app's headline
 * interaction end-to-end against the latest `dist/` via the test build at
 * `tests/dist/example-apps/<name>/` (see `tests/browser/global-setup.mjs`).
 *
 * Goal is regression-prevention for usage-level bugs that the framework's
 * unit tests can't catch — e.g. KF-163, where the kanban example baked a
 * memo key that froze the dragged card at translate(0,0). The kanban test
 * below would have caught it.
 */

import { expect, test } from '@playwright/test';

const BASE = '/tests/dist/example-apps';

test.describe('kanban', () => {
  test('drag updates the card transform during pointermove (KF-163 regression)', async ({ page }) => {
    await page.goto(`${BASE}/kanban/`);
    const card = page.locator('.card[data-card="a"]');
    await expect(card).toBeVisible();

    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Step the pointer in a few hops so onMove fires.
    await page.mouse.move(startX + 120, startY + 40, { steps: 5 });

    // The card should carry a non-zero transform NOW (not the initial
    // translate(0px, 0px) baked at drag-start). This is the assertion that
    // would have failed under KF-163.
    const transform = await card.evaluate((el) => (el as HTMLElement).style.transform);
    expect(transform).toMatch(/translate\(\s*1\d\dpx/); // dx ≈ 120
    expect(transform).toContain('rotate(2deg)');

    // KF-163 round 2: the dragging row must have NO CSS transition on transform,
    // or `style.transform` writes get animated and the drag visibly jitters
    // between the previous and next pointer positions as the 120ms transition
    // is interrupted on every move. `.card.dragging { transition: none }` in
    // the example's CSS is what protects this.
    const trans = await card.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return { property: cs.transitionProperty, duration: cs.transitionDuration };
    });
    expect(trans.duration).toMatch(/^0s(?:,\s*0s)*$/);

    await page.mouse.up();
  });

  test('drop into another column updates the count (and the card relocates)', async ({ page }) => {
    await page.goto(`${BASE}/kanban/`);

    const todoCol = page.locator('.col[data-col="todo"]');
    const doneCol = page.locator('.col[data-col="done"]');
    const todoCountBefore = await todoCol.locator('.count').innerText();
    const doneCountBefore = await doneCol.locator('.count').innerText();

    const card = page.locator('.col[data-col="todo"] .card').first();
    const cardBox = await card.boundingBox();
    const doneBox = await doneCol.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(doneBox).not.toBeNull();

    await page.mouse.move(cardBox!.x + 20, cardBox!.y + 20);
    await page.mouse.down();
    // Move into the done column's body in steps so onMove fires before drop.
    await page.mouse.move(doneBox!.x + doneBox!.width / 2, doneBox!.y + doneBox!.height / 2, {
      steps: 10,
    });
    await page.mouse.up();

    // Counts have flipped — one out of todo, one into done.
    await expect(todoCol.locator('.count')).not.toHaveText(todoCountBefore);
    await expect(doneCol.locator('.count')).not.toHaveText(doneCountBefore);
    expect(Number(await todoCol.locator('.count').innerText())).toBe(
      Number(todoCountBefore) - 1,
    );
    expect(Number(await doneCol.locator('.count').innerText())).toBe(
      Number(doneCountBefore) + 1,
    );
  });

  test('pointerdown does not start a text selection on the card', async ({ page }) => {
    await page.goto(`${BASE}/kanban/`);
    const card = page.locator('.card[data-card="a"]');
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + 20, box!.y + 20);
    await page.mouse.down();
    await page.mouse.move(box!.x + 80, box!.y + 40, { steps: 4 });
    const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selection).toBe('');
    await page.mouse.up();
  });
});

test.describe('markdown-editor', () => {
  test('typing into the contenteditable flows through to the preview', async ({ page }) => {
    await page.goto(`${BASE}/markdown-editor/`);
    const editor = page.locator('.editor-input');
    await expect(editor).toBeVisible();
    await editor.click();
    // Append at the end (most reliable across engines; mid-paragraph caret
    // movement is engine-specific in Playwright). The reactive pipeline is
    // exercised the same way either way.
    await page.keyboard.press('End');
    await page.keyboard.type('\n\n## Hello from Playwright', { delay: 5 });
    // The preview should pick up the new H2.
    await expect(page.locator('.preview h2', { hasText: 'Hello from Playwright' })).toBeVisible();
  });

  test('caret stays in the contenteditable across reactive re-renders', async ({ page }) => {
    await page.goto(`${BASE}/markdown-editor/`);
    const editor = page.locator('.editor-input');
    await editor.click();
    await page.keyboard.press('End');
    // Type a burst — every keystroke triggers a re-render via the source
    // signal. The editor must keep focus all the way through.
    await page.keyboard.type('abc def ghi', { delay: 5 });
    await expect(editor).toBeFocused();
  });
});

test.describe('chat', () => {
  test('sending a message streams a bot reply', async ({ page }) => {
    await page.goto(`${BASE}/chat/`);
    const textarea = page.locator('textarea[data-input]');
    await textarea.click();
    await textarea.fill('Tell me about streaming');
    await page.keyboard.press('Enter');

    // The user bubble lands immediately.
    await expect(page.locator('.msg.user .bubble', { hasText: 'Tell me about streaming' })).toBeVisible();

    // A bot bubble appears and grows over time. Wait until the latest bot
    // bubble has meaningful text (the streaming finishes well under 5 s).
    const lastBot = page.locator('.msg.bot .bubble').last();
    await expect(lastBot).toHaveText(/\S+/, { timeout: 8000 });
    const initialText = (await lastBot.innerText()).trim();
    expect(initialText.length).toBeGreaterThan(0);

    // After the stream settles, the caret marker should be gone.
    await expect(page.locator('.msg.bot .caret').last()).toHaveCount(0, { timeout: 8000 });
  });

  test('textarea draft survives streaming re-renders', async ({ page }) => {
    await page.goto(`${BASE}/chat/`);
    const textarea = page.locator('textarea[data-input]');
    await textarea.click();
    await textarea.fill('Tell me about morph');
    await page.keyboard.press('Enter');

    // While the bot streams, type into the textarea. `data-morph-skip` on the
    // textarea protects its value across re-renders.
    await textarea.fill('draft after send');
    // Wait for the stream to definitely have caused several re-renders.
    await page.waitForTimeout(500);
    await expect(textarea).toHaveValue('draft after send');
    await expect(textarea).toBeFocused();
  });
});

test.describe('todomvc', () => {
  test('add / toggle / clear-completed full round-trip', async ({ page }) => {
    await page.goto(`${BASE}/todomvc/`);
    // localStorage may persist between test runs; clear it so the spec is
    // independent.
    await page.evaluate(() => localStorage.removeItem('kerf-todomvc'));
    await page.reload();

    const newTodo = page.locator('input.new-todo');
    await newTodo.click();
    await newTodo.fill('Write a Playwright spec');
    await page.keyboard.press('Enter');
    await newTodo.fill('Ship KF-165');
    await page.keyboard.press('Enter');

    const items = page.locator('ul.todo-list > li');
    await expect(items).toHaveCount(2);

    // Toggle the first item done.
    await items.nth(0).locator('input[type="checkbox"]').check();
    await expect(items.nth(0)).toHaveClass(/done/);

    // Clear completed; only the un-done item should survive.
    await page.locator('button.clear-done').click();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('Ship KF-165');
  });
});

test.describe('dashboard', () => {
  test('tick counter advances on its own', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/`);
    const tick = page.locator('.frame');
    await expect(tick).toBeVisible();
    const first = await tick.innerText();
    // The dashboard ticks at ~30 Hz; well under a second the counter advances.
    await page.waitForTimeout(400);
    const second = await tick.innerText();
    expect(second).not.toBe(first);
    // Status pill is LIVE.
    await expect(page.locator('.status')).toContainText('LIVE');
  });
});

test.describe('pomodoro-ai', () => {
  test('start advances the countdown; reset returns to 25:00', async ({ page }) => {
    await page.goto(`${BASE}/pomodoro-ai/`);
    const time = page.locator('.time');
    await expect(time).toHaveText('25:00');

    await page.locator('button', { hasText: 'Start' }).click();
    // Wait for the first tick.
    await expect(time).not.toHaveText('25:00', { timeout: 2000 });

    // Reset returns to focus phase + 25:00.
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(time).toHaveText('25:00');
  });
});
