/**
 * Real-browser spec for `kerfjs/overlay`. Covers the behavior happy-dom can't
 * model truthfully: the focus TRAP (native Tab / Shift+Tab order + wrap-around),
 * focus restoration on close, and real outside-click dismissal — across
 * Chromium / Firefox / WebKit. The DOM-lifecycle + dismiss-trigger logic is
 * unit-tested in the behavior-focused `tests/unit/overlay-*.test.ts` suites.
 */
import { expect, type Page, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(
    () => (window as unknown as { kerfReady: boolean }).kerfReady === true,
  );
});

const activeId = (page: Page) =>
  page.evaluate(() => document.activeElement?.id ?? null);

test('focus trap: initial focus, Tab cycles + wraps within, Escape restores focus to the trigger', async ({
  page,
}) => {
  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.id = 'trigger';
    trigger.textContent = 'open';
    document.body.appendChild(trigger);
    trigger.focus();
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._ov = overlay(
      raw('<input id="a" /><input id="b" /><button id="c">c</button>'),
      { className: 'ov', initialFocus: '#a', trap: true, dismiss: ['escape'] },
    );
  });

  expect(await activeId(page)).toBe('a'); // initial focus
  await page.keyboard.press('Tab');
  expect(await activeId(page)).toBe('b');
  await page.keyboard.press('Tab');
  expect(await activeId(page)).toBe('c');
  await page.keyboard.press('Tab'); // wrap last -> first
  expect(await activeId(page)).toBe('a');
  await page.keyboard.press('Shift+Tab'); // wrap first -> last
  expect(await activeId(page)).toBe('c');

  await page.keyboard.press('Escape');
  await expect(page.locator('.ov')).toHaveCount(0);
  expect(await activeId(page)).toBe('trigger'); // focus restored on close
});

test('fallback overlays arbitrate Escape and outside dismissal from the top down', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<div>lower modal</div>'), { className: 'lower-modal' });
    overlay(raw('<div>upper modal</div>'), { className: 'upper-modal' });
  });

  await page.keyboard.press('Escape');
  await expect(page.locator('.upper-modal')).toHaveCount(0);
  await expect(page.locator('.lower-modal')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.lower-modal')).toHaveCount(0);

  await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    const outside = document.createElement('button');
    outside.id = 'outside-overlays';
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    overlay(raw('<div>lower menu</div>'), {
      className: 'lower-menu',
      dismiss: 'outside',
      trap: false,
    });
    overlay(raw('<div>upper menu</div>'), {
      className: 'upper-menu',
      dismiss: 'outside',
      trap: false,
    });
  });

  await page.locator('#outside-overlays').click();
  await expect(page.locator('.upper-menu')).toHaveCount(0);
  await expect(page.locator('.lower-menu')).toHaveCount(1);
  await page.locator('#outside-overlays').click();
  await expect(page.locator('.lower-menu')).toHaveCount(0);
});

test('prompt(): real focus lands in the field, typing + Enter resolves the entered string', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { prompt } = (window as any).kerfOverlay;
    (window as any)._result = prompt('Rename', { defaultValue: 'old' });
  });

  // Initial focus is the input (real browser focus, not a synthetic .focus()).
  expect(
    await page.evaluate(() => document.activeElement?.className ?? null),
  ).toBe('kerf-prompt__input');

  // Select-all + retype, then submit with a real Enter keypress.
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('new name');
  await page.keyboard.press('Enter');

  const result = await page.evaluate(() => (window as any)._result);
  expect(result).toBe('new name');
  await expect(page.locator('.kerf-prompt')).toHaveCount(0); // closed
});

test('prompt(): a throwing validate closes the native dialog, restores focus, and rejects the promise', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.evaluate(() => {
    const { prompt } = (window as any).kerfOverlay;
    const trigger = document.createElement('button');
    trigger.id = 'validate-trigger';
    trigger.textContent = 'page button';
    trigger.addEventListener('click', () => {
      (window as any)._validatePageClicks =
        ((window as any)._validatePageClicks ?? 0) + 1;
    });
    document.body.appendChild(trigger);
    trigger.focus();
    (window as any)._validateOutcome = prompt('Name', {
      native: true,
      validate: () => {
        throw new Error('validator bug');
      },
    }).then(
      (value: unknown) => ({ resolved: value }),
      (error: Error) => ({ rejected: error.message }),
    );
  });

  await page.locator('[data-prompt="ok"]').click(); // a real click on OK
  expect(await page.evaluate(() => (window as any)._validateOutcome)).toEqual({
    rejected: 'validator bug',
  });
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await activeId(page)).toBe('validate-trigger');
  expect(pageErrors).toEqual([]); // nothing escaped the click handler

  // The page is not left inert: a real click reaches the page button.
  await page.locator('#validate-trigger').click();
  expect(await page.evaluate(() => (window as any)._validatePageClicks)).toBe(
    1,
  );
});

test('popover(): positions below a real anchor, left-aligned (real layout)', async ({
  page,
}) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'pop-anchor';
    anchor.textContent = 'open';
    Object.assign(anchor.style, {
      position: 'absolute',
      left: '120px',
      top: '240px',
    });
    document.body.appendChild(anchor);
    const { popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._pop = popover(
      anchor,
      raw('<div class="pop-body" style="width:140px;height:48px">menu</div>'),
      { gap: 6 },
    );
  });

  const anchorBox = (await page.locator('#pop-anchor').boundingBox())!;
  const popBox = (await page.locator('.pop-body').boundingBox())!;
  // Below the anchor by ~gap, and left edges aligned (both within a couple px).
  expect(popBox.y).toBeGreaterThanOrEqual(anchorBox.y + anchorBox.height);
  expect(
    Math.abs(popBox.y - (anchorBox.y + anchorBox.height + 6)),
  ).toBeLessThan(2);
  expect(Math.abs(popBox.x - anchorBox.x)).toBeLessThan(2);
});

test('tooltip(): shows on real hover and hides on leave', async ({ page }) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'tip-anchor';
    anchor.textContent = 'hover me';
    Object.assign(anchor.style, {
      position: 'absolute',
      left: '150px',
      top: '150px',
    });
    document.body.appendChild(anchor);
    const spacer = document.createElement('div');
    spacer.id = 'away';
    Object.assign(spacer.style, {
      position: 'absolute',
      left: '0',
      top: '400px',
      width: '40px',
      height: '40px',
    });
    document.body.appendChild(spacer);
    const { tooltip } = (window as any).kerfOverlay;
    (window as any)._tipStop = tooltip(anchor, 'Hello', {
      delay: 0,
      hideDelay: 0,
    });
  });

  await page.locator('#tip-anchor').hover();
  await expect(page.locator('.kerf-tooltip')).toHaveText('Hello');
  await page.locator('#away').hover(); // move the pointer off the anchor
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
});

test('tooltip(): pointer and focus presence keep each other alive across modality transitions', async ({
  page,
}) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'tip-modality-anchor';
    anchor.textContent = 'mixed modality';
    document.body.appendChild(anchor);
    const { tooltip } = (window as any).kerfOverlay;
    (window as any)._tipModalityStop = tooltip(anchor, 'Mixed', {
      delay: 0,
      hideDelay: 0,
    });
  });

  const dispatch = (type: string) =>
    page.locator('#tip-modality-anchor').dispatchEvent(type);

  await dispatch('pointerenter');
  await expect(page.locator('.kerf-tooltip')).toHaveText('Mixed');
  await dispatch('focus');
  await dispatch('pointerleave');
  await expect(page.locator('.kerf-tooltip')).toHaveText('Mixed');
  await dispatch('blur');
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);

  await dispatch('focus');
  await expect(page.locator('.kerf-tooltip')).toHaveText('Mixed');
  await dispatch('pointerenter');
  await dispatch('blur');
  await expect(page.locator('.kerf-tooltip')).toHaveText('Mixed');
  await dispatch('pointerleave');
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
});

test('toast(): string content is text while SafeHtml and render functions preserve markup', async ({
  page,
}) => {
  const attack = '<img id="toast-xss" src="x" onerror="globalThis.pwned=true">';
  await page.evaluate((untrusted) => {
    const { toast } = (window as any).kerfOverlay;
    const { jsx, raw } = (window as any).jsxRuntime;
    toast(untrusted, { duration: 0 });
    toast(raw('<strong id="trusted-toast">trusted</strong>'), { duration: 0 });
    toast(() => jsx('em', { id: 'rendered-toast', children: 'rendered' }), {
      duration: 0,
    });
  }, attack);

  const toasts = page.locator('.kerf-toast');
  await expect(toasts).toHaveCount(3);
  await expect(toasts.nth(0)).toHaveText(attack);
  await expect(page.locator('#toast-xss')).toHaveCount(0);
  expect(await page.evaluate(() => (globalThis as any).pwned)).toBeUndefined();
  await expect(page.locator('#trusted-toast')).toHaveText('trusted');
  await expect(page.locator('#rendered-toast')).toHaveText('rendered');
});

test('outside click dismisses a non-modal popover; content + an outsideIgnore trigger do not', async ({
  page,
}) => {
  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.id = 'pop-trigger';
    trigger.textContent = 't';
    document.body.appendChild(trigger);
    const elsewhere = document.createElement('button');
    elsewhere.id = 'elsewhere';
    elsewhere.textContent = 'x';
    document.body.appendChild(elsewhere);
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._ov = overlay(raw('<button id="pop-inner">x</button>'), {
      className: 'pop',
      dismiss: ['outside'],
      trap: false,
      outsideIgnore: trigger,
    });
  });

  await page.locator('#pop-inner').click(); // inside — stays
  await expect(page.locator('.pop')).toHaveCount(1);
  await page.locator('#pop-trigger').click(); // ignored — stays
  await expect(page.locator('.pop')).toHaveCount(1);
  await page.locator('#elsewhere').click(); // outside — dismiss
  await expect(page.locator('.pop')).toHaveCount(0);
});

test('native: modal confirm is a real <dialog> in the top layer, resolves on click', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { confirm } = (window as any).kerfOverlay;
    (window as any)._result = confirm('Delete?', {
      native: true,
      className: 'nc',
    });
  });

  const dialog = page.locator('dialog.nc');
  await expect(dialog).toHaveCount(1);
  // Real modality: the <dialog> is open (top layer + ::backdrop + inert document).
  expect(
    await page.evaluate(
      () => (document.querySelector('dialog.nc') as HTMLDialogElement).open,
    ),
  ).toBe(true);

  await dialog.locator('[data-confirm="ok"]').click();
  expect(await page.evaluate(() => (window as any)._result)).toBe(true);
  await expect(dialog).toHaveCount(0); // closed + removed
});

test('native: a modal <dialog> stacks above a high z-index element (top layer wins)', async ({
  page,
}) => {
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.id = 'zbar';
    bar.style.cssText = 'position:fixed;inset:0;z-index:99999;background:red';
    document.body.appendChild(bar);
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._ov = overlay(raw('<button id="in-dialog">hi</button>'), {
      native: true,
      trap: true,
      className: 'zdlg',
    });
  });

  // The dialog content is hit-testable despite the z-index:99999 bar — only the
  // top layer can paint above it, which is exactly the stacking gap native fixes.
  const btn = page.locator('#in-dialog');
  await expect(btn).toBeVisible();
  await btn.click(); // would be intercepted by #zbar if the overlay were a plain z-index-less div
  await page.evaluate(() => (window as any)._ov.close());
  await expect(page.locator('.zdlg')).toHaveCount(0);
});

test('native: popover is :popover-open in the top layer, positioned at the anchor', async ({
  page,
}) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'np-anchor';
    anchor.textContent = 'open';
    anchor.style.cssText = 'position:absolute;top:100px;left:40px';
    document.body.appendChild(anchor);
    const { popover } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    (window as any)._pop = popover(
      anchor,
      raw('<div id="np-body">menu</div>'),
      {
        native: true,
        className: 'np',
      },
    );
  });

  const pop = page.locator('.np');
  await expect(pop).toHaveCount(1);
  expect(
    await page.evaluate(() =>
      (document.querySelector('.np') as HTMLElement).matches(':popover-open'),
    ),
  ).toBe(true);
  // positionAnchored controls placement despite the UA [popover] inset (neutralized to auto).
  const box = await pop.boundingBox(); // { x, y, width, height }
  expect(box!.x).toBeGreaterThan(30);
  expect(box!.x).toBeLessThan(200); // near the anchor, not stretched full-width
  await page.evaluate(() => (window as any)._pop.close());
  await expect(pop).toHaveCount(0);
});

test('construction is transactional: a bad initialFocus selector or a throwing render leaves no residue', async ({
  page,
}) => {
  const outcome = await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    const trigger = document.createElement('button');
    trigger.id = 'tx-trigger';
    document.body.appendChild(trigger);
    trigger.focus();
    overlay(raw('<button>lower</button>'), { className: 'tx-lower' });
    const errors: string[] = [];
    try {
      overlay(raw('<button>x</button>'), {
        className: 'tx-bad-focus',
        initialFocus: '[[',
      });
    } catch (error) {
      errors.push((error as Error).message);
    }
    try {
      overlay(
        () => {
          throw new Error('render failed');
        },
        { className: 'tx-bad-render' },
      );
    } catch (error) {
      errors.push((error as Error).message);
    }
    return errors;
  });

  expect(outcome).toHaveLength(2);
  expect(outcome[0]).toContain('overlay(): invalid initialFocus selector "[["');
  expect(outcome[1]).toBe('render failed');
  await expect(page.locator('.tx-bad-focus, .tx-bad-render')).toHaveCount(0);
  // The lower overlay is still topmost, so real Escape dismisses it and focus
  // returns to the trigger.
  await page.keyboard.press('Escape');
  await expect(page.locator('.tx-lower')).toHaveCount(0);
  expect(await activeId(page)).toBe('tx-trigger');
});

test('native: a showModal() failure rolls the <dialog> back and a later native overlay still works', async ({
  page,
}) => {
  const outcome = await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    // A detached container makes the real showModal() throw InvalidStateError
    // after the wrapper is appended and its content mounted.
    const detached = document.createElement('div');
    try {
      overlay(raw('<button>x</button>'), {
        native: true,
        container: detached,
        className: 'tx-native-bad',
      });
      return { name: 'no error', residue: detached.children.length };
    } catch (error) {
      return {
        name: (error as Error).name,
        residue: detached.children.length,
      };
    }
  });
  expect(outcome).toEqual({ name: 'InvalidStateError', residue: 0 });

  await page.evaluate(() => {
    const { overlay } = (window as any).kerfOverlay;
    const { raw } = (window as any).jsxRuntime;
    overlay(raw('<button>ok</button>'), {
      native: true,
      className: 'tx-native-good',
    });
  });
  const good = page.locator('dialog.tx-native-good');
  expect(await good.evaluate((el) => (el as HTMLDialogElement).open)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(good).toHaveCount(0);
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('tooltip(): a failed show is reported to window error listeners and the next hover shows it', async ({
  page,
}) => {
  await page.evaluate(() => {
    const anchor = document.createElement('button');
    anchor.id = 'tip-fail-anchor';
    anchor.textContent = 'hover me';
    Object.assign(anchor.style, {
      position: 'absolute',
      left: '200px',
      top: '200px',
    });
    document.body.appendChild(anchor);
    const w = window as any;
    w._tipErrors = [];
    window.addEventListener('error', (event) => {
      w._tipErrors.push((event as ErrorEvent).error?.message ?? 'unknown');
    });
    // Positioning fails until the flag is cleared.
    w._tipGeometryFails = true;
    const real = anchor.getBoundingClientRect.bind(anchor);
    anchor.getBoundingClientRect = () => {
      if (w._tipGeometryFails) throw new Error('geometry failed');
      return real();
    };
    const { tooltip } = w.kerfOverlay;
    w._tipFailStop = tooltip(anchor, 'Recovered', { delay: 0, hideDelay: 0 });
  });

  await page.locator('#tip-fail-anchor').hover();
  await expect
    .poll(() => page.evaluate(() => (window as any)._tipErrors))
    .toEqual(['geometry failed']);
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);

  // Leave, fix positioning, and hover again: the tooltip is still armed.
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    (window as any)._tipGeometryFails = false;
  });
  await page.locator('#tip-fail-anchor').hover();
  await expect(page.locator('.kerf-tooltip')).toHaveText('Recovered');
  await page.mouse.move(0, 0);
  await expect(page.locator('.kerf-tooltip')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any)._tipErrors)).toEqual([
    'geometry failed',
  ]);
  await page.evaluate(() => (window as any)._tipFailStop());
});

test('dialog helpers: a render missing its required input closes the native <dialog> and leaves the page interactive', async ({
  page,
}) => {
  const outcome = await page.evaluate(() => {
    const { form } = (window as any).kerfOverlay;
    const { jsx } = (window as any).jsxRuntime;
    const trigger = document.createElement('button');
    trigger.id = 'helper-trigger';
    trigger.textContent = 'page button';
    trigger.addEventListener('click', () => {
      (window as any)._pageClicks = ((window as any)._pageClicks ?? 0) + 1;
    });
    document.body.appendChild(trigger);
    trigger.focus();
    try {
      // The modal <dialog> is already in the top layer (inerting the page)
      // when form() discovers the missing field input.
      form([{ name: 'host' }, { name: 'token' }], {
        native: true,
        className: 'helper-bad',
        render: ({ fields, ok }: any) =>
          jsx('div', {
            children: [
              jsx('input', { ...fields[0].input }),
              jsx('button', { ...ok, children: 'Go' }),
            ],
          }),
      });
      return 'no error';
    } catch (error) {
      return (error as Error).message;
    }
  });
  expect(outcome).toBe('form(): render missing <input data-field="token">.');
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await activeId(page)).toBe('helper-trigger');

  // The page is not left inert: a real click reaches the page button.
  await page.locator('#helper-trigger').click();
  expect(await page.evaluate(() => (window as any)._pageClicks)).toBe(1);

  // A later native prompt opens, takes real input, and resolves.
  await page.evaluate(() => {
    const { prompt } = (window as any).kerfOverlay;
    (window as any)._helperResult = prompt('Name', {
      native: true,
      className: 'helper-good',
    });
  });
  await page.keyboard.type('ada');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any)._helperResult)).toBe('ada');
  await expect(page.locator('dialog')).toHaveCount(0);
});
