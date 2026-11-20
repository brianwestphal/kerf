import { strict as assert } from 'node:assert';

export const operations = [
  'mount',
  'label',
  'select',
  'update',
  'swap',
  'refetch',
  'remove',
  'dispose',
];
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

async function mark(page, operation) {
  // All application operations use the same event dispatch boundary. React may
  // schedule work after it returns. The rAF is a rendering opportunity only.
  return page.evaluate(async (action) => {
    const target = document.querySelector('main');
    let error;
    target.addEventListener(
      'bench-step',
      () => {
        try {
          window.step(action);
        } catch (cause) {
          error = String(cause);
        }
      },
      { once: true },
    );
    const start = performance.now();
    target.dispatchEvent(new Event('bench-step'));
    const syncMs = performance.now() - start;
    if (error) throw new Error(error);
    const opportunityMs = await new Promise((resolve) =>
      requestAnimationFrame(() => resolve(performance.now() - start)),
    );
    return { syncMs, opportunityMs };
  }, operation);
}

export async function table(page, instrumented) {
  const samples = [];
  if (instrumented)
    await page.evaluate(() => {
      window.mutations = 0;
      window.mutationObserver = new MutationObserver((records) => {
        window.mutations += records.length;
      });
      window.mutationObserver.observe(document.querySelector('main'), {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    });
  for (const operation of operations) {
    if (instrumented)
      await page.evaluate(() => {
        window.mutations = 0;
        window.work = {};
      });
    const sample = await mark(page, operation);
    // Allow deferred framework commit to settle before checking semantics.
    await page.evaluate(frame);
    const actual = await page.evaluate(() => {
      const list = [...document.querySelectorAll('li')];
      return {
        label: document.querySelector('output')?.textContent,
        rows: list.map((row) => [
          Number(row.dataset.key),
          row.querySelector('span')?.textContent,
        ]),
        selected: list
          .filter((r) => r.classList.contains('chosen'))
          .map((r) => Number(r.dataset.key)),
        focused: document.activeElement === window.referenceInput,
        range: [
          document.activeElement?.selectionStart,
          document.activeElement?.selectionEnd,
        ],
        draft: document.activeElement?.value,
      };
    });
    const stage = operations.indexOf(operation);
    if (operation === 'dispose') {
      assert.equal(actual.rows.length, 0);
      assert.equal(await page.locator('main *').count(), 0);
    } else {
      const ids = Array.from({ length: 1000 }, (_, i) => i + 1);
      if (stage >= 4) [ids[1], ids[998]] = [ids[998], ids[1]];
      if (operation === 'remove') ids.splice(ids.indexOf(499), 1);
      assert.deepEqual(
        actual.rows,
        ids.map((id) => [
          id,
          stage >= 3 && id === 502 ? 'Edited' : 'Record ' + id,
        ]),
      );
      assert.deepEqual(actual.selected, [stage >= 2 ? 502 : 501]);
      assert.equal(actual.label, stage >= 1 ? 'Ready' : 'Idle');
      if (operation === 'mount') {
        await page.locator('input[aria-label="Edit 500"]').evaluate((el) => {
          el.focus();
          el.value = 'unsaved';
          el.setSelectionRange(1, 4);
          window.referenceInput = el;
        });
      } else {
        assert.equal(
          actual.focused,
          true,
          'focused node changed after ' + operation,
        );
        assert.deepEqual(actual.range, [1, 4]);
        assert.equal(actual.draft, 'unsaved');
      }
    }
    const counters = instrumented
      ? await page.evaluate(() => ({
          ...window.work,
          mutationRecords: window.mutations,
        }))
      : {};
    samples.push({ operation, ...(instrumented ? counters : sample) });
  }
  if (instrumented)
    await page.evaluate(() => {
      window.mutationObserver.disconnect();
      delete window.mutationObserver;
    });
  return samples;
}

export async function picker(page) {
  const samples = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    samples.push({ operation: 'mount', cycle, ...(await mark(page, 'mount')) });
    const field = page.getByRole('combobox', { name: 'Fruit' });
    await field.fill('Blu');
    await page
      .getByRole('option', { name: 'Blueberry', exact: true })
      .waitFor();
    await field.press('ArrowDown');
    // Measure keydown to the next rendering opportunity in-page, including
    // framework/browser work. No Playwright IPC duration enters this number.
    await field.evaluate((el) =>
      el.addEventListener(
        'keydown',
        () => {
          const start = performance.now();
          window.commitFrame = new Promise((resolve) =>
            requestAnimationFrame(() => resolve(performance.now() - start)),
          );
        },
        { once: true, capture: true },
      ),
    );
    await field.press('Enter');
    const opportunityMs = await page.evaluate(() => window.commitFrame);
    assert.deepEqual(
      await page.evaluate(() => window.commits),
      Array(cycle + 1).fill('Blueberry'),
    );
    assert.equal(
      await field.evaluate((el) => el === document.activeElement),
      true,
    );
    samples.push({ operation: 'keyboardCommit', cycle, opportunityMs });
    samples.push({
      operation: 'dispose',
      cycle,
      ...(await mark(page, 'dispose')),
    });
    assert.equal(await page.getByRole('combobox').count(), 0);
    assert.equal(await page.getByRole('listbox').count(), 0);
  }
  return samples;
}
