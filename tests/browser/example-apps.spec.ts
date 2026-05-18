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

test.describe('counter-store', () => {
  test('sync counter increments, persists, resets; async fetch resolves and rejects', async ({ page }) => {
    await page.goto(`${BASE}/counter-store/`);
    await page.evaluate(() => localStorage.removeItem('kerf-counter-store'));
    await page.reload();

    // Sync actions — covers the increment/decrement/reset pattern.
    await expect(page.locator('[data-count]')).toHaveText('0');
    await page.locator('button[data-action="inc"]').click();
    await page.locator('button[data-action="inc"]').click();
    await page.locator('button[data-action="inc"]').click();
    await expect(page.locator('[data-count]')).toHaveText('3');
    await page.locator('button[data-action="dec"]').click();
    await expect(page.locator('[data-count]')).toHaveText('2');

    // Reload — persistence via the effect() should restore count = 2.
    await page.reload();
    await expect(page.locator('[data-count]')).toHaveText('2');

    // Reset → 0, last-bumped reverts to "never".
    await page.locator('button[data-action="reset"]').click();
    await expect(page.locator('[data-count]')).toHaveText('0');
    await expect(page.locator('[data-meta]')).toContainText('last bumped: never');

    // Async fetch — success branch.
    await page.locator('button[data-action="fetch-ok"]').click();
    await expect(page.locator('[data-async-status]')).toHaveText('loading…');
    await expect(page.locator('[data-async-status]')).toHaveText('ok');
    await expect(page.locator('[data-async-data]')).toContainText('Kerf store demo');

    // Async fetch — failure branch.
    await page.locator('button[data-action="fetch-fail"]').click();
    await expect(page.locator('[data-async-status]')).toHaveText('loading…');
    await expect(page.locator('[data-async-status]')).toContainText('error: Simulated network failure');
  });
});

test.describe('cart-htmx', () => {
  test('simulated swap → kerf mount; remove reduces total', async ({ page }) => {
    await page.goto(`${BASE}/cart-htmx/`);

    // Before swap: shell is empty placeholder.
    await expect(page.locator('#cart-shell .empty')).toBeVisible();

    // Click "Load cart" — simulates htmx fetching the island shell + kerf mount.
    await page.locator('#load-cart').click();

    const items = page.locator('.cart-items > li');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('Espresso');
    await expect(page.locator('.total')).toContainText('Total: $19');

    // Remove the first item; total updates.
    await items.nth(0).locator('.remove').click();
    await expect(items).toHaveCount(2);
    await expect(page.locator('.total')).toContainText('Total: $16');

    // Re-swap with a different variant — previous mount is disposed, new mount renders.
    await page.locator('#reload-cart').click();
    const itemsAfter = page.locator('.cart-items > li');
    await expect(itemsAfter).toHaveCount(2);
    await expect(itemsAfter.nth(0)).toContainText('Tea');
    await expect(page.locator('.total')).toContainText('Total: $5');

    // Log shows the mount lifecycle messages — verifies the dispose-then-mount path.
    const log = await page.locator('#log').innerText();
    expect(log).toContain('kerf mount complete');
    expect(log).toContain('disposed previous kerf mount');
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

  test('filter clicks survive across all/active/done (partial-set regression gate)', async ({ page }) => {
    // The "add / toggle / clear-completed" test above never clicks a filter
    // because every action only writes `items` and the render gracefully
    // handles undefined `filter` / `editingId`. The partial-set bug
    // (an action calling `set({filter})` against a replace-semantics store,
    // wiping `items`) only crashes when a subsequent action reads `items`.
    // This spec walks the filter triplet and toggles in between to make sure
    // every code path that uses `get().items` actually finds items there.
    //
    // Page errors are surfaced too — the partial-set bug raised
    // "TypeError: undefined is not an object (evaluating 't().items.filter')"
    // in production; this listener fails the test on any such crash.
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${BASE}/todomvc/`);
    await page.evaluate(() => localStorage.removeItem('kerf-todomvc'));
    await page.reload();

    const newTodo = page.locator('input.new-todo');
    await newTodo.click();
    await newTodo.fill('one');
    await page.keyboard.press('Enter');
    await newTodo.fill('two');
    await page.keyboard.press('Enter');
    await newTodo.fill('three');
    await page.keyboard.press('Enter');

    const items = page.locator('ul.todo-list > li');
    await expect(items).toHaveCount(3);

    // Mark "two" done.
    await items.nth(1).locator('input[type="checkbox"]').check();
    await expect(items.nth(1)).toHaveClass(/done/);

    // Switch to Active — only "one" + "three" should be visible.
    await page.locator('a[data-action="filter"][data-value="active"]').click();
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText('one');
    await expect(items.nth(1)).toContainText('three');

    // Switch to Done — only "two".
    await page.locator('a[data-action="filter"][data-value="done"]').click();
    await expect(items).toHaveCount(1);
    await expect(items.first()).toContainText('two');

    // Clear-completed from inside the Done view — exercises clearDone, which
    // reads get().items.filter(...). Pre-fix this would have thrown
    // "undefined is not an object" because the prior setFilter wiped items.
    await page.locator('button.clear-done').click();
    await expect(items).toHaveCount(0);

    // Back to All — only "one" and "three" should remain (two was cleared).
    await page.locator('a[data-action="filter"][data-value="all"]').click();
    await expect(items).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(items.nth(i)).not.toHaveClass(/done/);
    }

    // No JS errors thrown during the run. Surfaces the partial-set bug shape
    // even if some other assertion above happens to pass.
    expect(pageErrors).toEqual([]);
  });

  test('edit flow: click → type → Enter commits, Escape cancels', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(`${BASE}/todomvc/`);
    await page.evaluate(() => localStorage.removeItem('kerf-todomvc'));
    await page.reload();

    const newTodo = page.locator('input.new-todo');
    await newTodo.click();
    await newTodo.fill('original');
    await page.keyboard.press('Enter');

    const items = page.locator('ul.todo-list > li');
    await expect(items).toHaveCount(1);

    // Click the label → editing mode. The example's `data-action="edit"`
    // listener swaps the label for an input.edit; we then click into it to
    // focus (autofocus on a freshly-morphed input isn't reliable across
    // browsers, so we don't rely on it in the spec).
    await items.first().locator('label').click();
    const edit = items.first().locator('input.edit');
    await expect(edit).toBeVisible();
    await edit.click();

    // Type a new value, press Enter to commit.
    await edit.fill('edited via enter');
    await page.keyboard.press('Enter');
    await expect(items.first()).toContainText('edited via enter');

    // Enter edit again, type, blur to commit.
    await items.first().locator('label').click();
    const edit2 = items.first().locator('input.edit');
    await edit2.click();
    await edit2.fill('edited via blur');
    await newTodo.click(); // blur the edit input
    await expect(items.first()).toContainText('edited via blur');

    // Enter edit one more time, type, press Escape to cancel.
    await items.first().locator('label').click();
    const edit3 = items.first().locator('input.edit');
    await edit3.click();
    await edit3.fill('this should not stick');
    await page.keyboard.press('Escape');
    await expect(items.first()).toContainText('edited via blur');

    expect(pageErrors).toEqual([]);
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

