const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
const invoke = async (page, key, ...args) => {
  await page.evaluate(([key, args]) => window.app[key](...args), [key, args]);
  await settle(page);
};
async function draft(locator) {
  await locator.fill('draft');
  await locator.evaluate((el) => {
    el.focus();
    el.setSelectionRange(2, 2);
    window.originalEditor = el;
  });
}
async function snapshot(locator) {
  return locator.evaluate((el) => ({
    same: el === window.originalEditor,
    focused: el === document.activeElement,
    draft: el.value === 'draft',
    caret: el.selectionStart === 2 && el.selectionEnd === 2,
  }));
}
async function label(page, checks, observed) {
  const badge = page.locator('output[data-badge]');
  const both = () => badge.evaluate((el) => [el.textContent, el.title]);
  checks.initial = (await both()).every((value) => value === '4 crates');
  const note = page.locator('input[data-note]');
  await draft(note);
  await invoke(page, 'mode', 'outgoing');
  checks.switched = (await both()).every((value) => value === '7 crates');
  await badge.evaluate((el) => {
    window.badgeMutations = 0;
    window.badgeObserver = new MutationObserver((records) => {
      window.badgeMutations += records.length;
    });
    window.badgeObserver.observe(el, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  });
  await invoke(page, 'count', 'incoming', 5);
  observed.inactiveBadgeMutations = await page.evaluate(() => {
    window.badgeObserver.disconnect();
    return window.badgeMutations;
  });
  [observed.badgeAfterInactiveWrite, observed.titleAfterInactiveWrite] =
    await both();
  checks.inactiveIgnored = [
    observed.badgeAfterInactiveWrite,
    observed.titleAfterInactiveWrite,
  ].every((value) => value === '7 crates');
  await invoke(page, 'count', 'outgoing', 9);
  checks.activeTracked = (await both()).every((value) => value === '9 crates');
  Object.assign(checks, await snapshot(note));
}
async function rows(page, checks, observed) {
  const editor = page.locator('[data-row="2"] input');
  await draft(editor);
  const start = await page.evaluate(() => window.rowCalls);
  checks.markedRowsOnMount = start >= 4;
  await invoke(page, 'select', 3);
  observed.selectionRowCalls =
    (await page.evaluate(() => window.rowCalls)) - start;
  await invoke(page, 'refetch', [
    { id: 1, label: 'One' },
    { id: 2, label: 'Two prime' },
    { id: 3, label: 'Three' },
    { id: 4, label: 'Four' },
  ]);
  await invoke(page, 'swap');
  const outputs = await page
    .locator('[data-row]')
    .evaluateAll((els) =>
      els.map((el) => [
        el.dataset.row,
        el.getAttribute('aria-selected'),
        el.querySelector('span')?.textContent,
      ]),
    );
  checks.order = outputs.map((row) => row[0]).join(' ') === '2 1 3 4';
  checks.selection =
    outputs.length === 4 &&
    outputs.every(([id, selected]) => selected === String(id === '3'));
  checks.newLabel = outputs.find(([id]) => id === '2')?.[2] === 'Two prime';
  const state = await snapshot(editor);
  Object.assign(checks, state);
  observed.sameFocusedInput = state.same && state.focused;
}
async function choose(page) {
  const field = page.getByRole('combobox', { name: 'Fruit' });
  await field.fill('Blu');
  await page.getByRole('option', { name: 'Blueberry', exact: true }).waitFor();
  await field.press('ArrowDown');
  await field.press('Enter');
  await settle(page);
  return page.evaluate(() => window.commits);
}
async function picker(page, checks) {
  await invoke(page, 'open');
  const commits = await choose(page);
  checks.singleBlueberry = commits.length === 1 && commits[0] === 'Blueberry';
}
async function remount(page, checks, observed) {
  await page.evaluate(
    () =>
      (window.initialListboxes = new Set(
        document.querySelectorAll('[role=listbox]'),
      )),
  );
  for (let i = 0; i < 2; i++) {
    await invoke(page, 'open');
    await page
      .getByRole('combobox', { name: 'Fruit' })
      .evaluate((el) => (window.detachedField = el));
    await invoke(page, 'close');
    checks['removed' + i] =
      (await page.getByRole('combobox').count()) === 0 &&
      (await page
        .getByRole('listbox')
        .evaluateAll((els) =>
          els.every((el) => window.initialListboxes.has(el)),
        ));
    await page.evaluate(() =>
      window.detachedField.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      ),
    );
  }
  checks.staleSilent = (await page.evaluate(() => window.commits.length)) === 0;
  await invoke(page, 'open');
  const commits = await choose(page);
  observed.remountCommits = commits.length;
  checks.singleBlueberry = commits.length === 1 && commits[0] === 'Blueberry';
  const field = page.getByRole('combobox', { name: 'Fruit' });
  await field.evaluate((el) => (window.lastField = el));
  await invoke(page, 'dispose');
  await page.evaluate(() => {
    window.lastField.value = 'Blu';
    for (const type of ['input', 'keydown'])
      window.lastField.dispatchEvent(
        type === 'input'
          ? new Event(type, { bubbles: true })
          : new KeyboardEvent(type, { key: 'Enter', bubbles: true }),
      );
  });
  await settle(page);
  checks.disposedSilent =
    (await page.evaluate(() => window.commits.length)) === commits.length;
}
export async function replay(browser, assets) {
  const observed = {};
  const tasks = {};
  for (const [name, scenario] of Object.entries({
    label,
    rows,
    picker,
    remount,
  })) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(1500);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message.slice(0, 220)));
    const checks = {};
    try {
      const entry =
        '<!doctype html><html><head><link rel="stylesheet" href="/asset.css"></head><body><main id="root"></main><script src="/asset.js"></script></body></html>';
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== 'http://study.test') return route.abort();
        if (url.pathname === '/')
          return route.fulfill({
            contentType: 'text/html',
            headers: {
              'Content-Security-Policy':
                "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; worker-src 'none';",
            },
            body: entry,
          });
        if (url.pathname === '/asset.css' || url.pathname === '/asset.js')
          return route.fulfill({
            contentType: url.pathname.endsWith('css')
              ? 'text/css'
              : 'text/javascript',
            body: assets[url.pathname] ?? '',
          });
        return route.abort();
      });
      await page.goto('http://study.test/');
      await page.evaluate(() => {
        window.rowCalls = 0;
        window.commits = [];
        window.app = window.mountStudy(
          document.querySelector('main'),
          (val) => window.commits.push(val),
          (kind) => {
            if (kind === 'row') window.rowCalls++;
          },
        );
      });
      await settle(page);
      await scenario(page, checks, observed);
      tasks[name] = {
        pass: Object.values(checks).every(Boolean) && !errors.length,
        checks,
        errors,
      };
    } catch (error) {
      tasks[name] = {
        pass: false,
        checks,
        errors: [...errors, error.message.split('\n')[0].slice(0, 220)],
      };
    } finally {
      await context.close();
    }
  }
  return { tasks, observed };
}
