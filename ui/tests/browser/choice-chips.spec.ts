import { expect, type Locator, test } from '@playwright/test';

/** Row tops of the pills, in order: one entry per distinct visual row. */
async function pillRows(group: Locator) {
  return group.evaluate((element) => {
    const pills = [
      ...element.querySelectorAll<HTMLElement>('.kui-choice-chips__chip'),
    ].map((pill) => pill.getBoundingClientRect());
    const rows = [...new Set(pills.map((box) => Math.round(box.top)))];
    const groupBox = element.getBoundingClientRect();
    return {
      rows: rows.length,
      overflow: pills.some((box) => box.right > groupBox.right + 0.5),
      // Separated pills: neighbors on a row never touch or share a border.
      minGap: Math.min(
        ...pills.flatMap((box, index) => {
          const next = pills[index + 1];
          return next && Math.round(next.top) === Math.round(box.top)
            ? [next.left - box.right]
            : [];
        }),
      ),
    };
  });
}

test('ChoiceChips selects with native radio keyboard semantics and wraps as separate pills', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const demo = page.locator('[data-demo="choice-chips"]');
  const group = demo.getByRole('radiogroup', { name: 'Command Color' });
  await expect(group.getByRole('radio')).toHaveCount(9);
  await expect(group.getByRole('radio', { name: 'Blue' })).toBeChecked();

  // One Tab stop: the checked radio. Arrow keys move and select.
  await group.getByRole('radio', { name: 'Blue' }).focus();
  await page.keyboard.press('ArrowRight');
  const green = group.getByRole('radio', { name: 'Green' });
  await expect(green).toBeFocused();
  await expect(green).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText('Choice: green');
  await expect(group.locator('input:checked')).toHaveCount(1);
  const focus = await green.evaluate((input) => ({
    visible: input.matches(':focus-visible'),
    ring: globalThis.getComputedStyle(input.closest('label')!).outlineStyle,
  }));
  // WebKit (like Safari's default keyboard settings) never treats a native
  // radio as focus-visible, so the pill's ring follows :focus-visible there.
  expect(focus.ring).toBe(focus.visible ? 'solid' : 'none');
  if (browserName !== 'webkit') expect(focus.visible).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const transparent = group.getByRole('radio', { name: 'Transparent' });
  await expect(transparent).toBeChecked();
  await expect(
    group.locator('[data-choice-value="transparent"] [data-swatch]'),
  ).toHaveAttribute('data-swatch', 'transparent');

  // Pointer selection lands on the native radio under the pill.
  await group.locator('[data-choice-value="purple"]').click();
  await expect(group.getByRole('radio', { name: 'Purple' })).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText('Choice: purple');

  // A disabled choice is skipped and cannot be chosen.
  const view = demo.getByRole('radiogroup', { name: 'Board View' });
  await expect(view.getByRole('radio', { name: 'Calendar' })).toBeDisabled();

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-wide.png' });

  // The 560px dialog: the palette wraps inside it and Save reads the form value.
  await demo
    .locator(
      'button.kui-button[data-action="show-dialog"][data-dialog-id="choice-chips-dialog"]',
    )
    .click();
  const dialogGroup = page.getByRole('radiogroup', {
    name: 'Color',
    exact: true,
  });
  await expect(dialogGroup).toBeVisible();
  await dialogGroup.locator('[data-choice-value="teal"]').click();
  const dialogLayout = await pillRows(dialogGroup);
  expect(dialogLayout.rows).toBeGreaterThan(1);
  expect(dialogLayout.overflow).toBe(false);
  expect(dialogLayout.minGap).toBeGreaterThanOrEqual(7.5);
  if (browserName === 'chromium')
    await page.screenshot({ path: 'test-results/choice-chips-dialog.png' });
  await page.locator('[data-action="save-choice-chips-dialog"]').click();
  await expect(page.locator('.catalog-log')).toHaveText('Saved color: teal');

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await pillRows(group);
  expect(narrow.rows).toBeGreaterThan(1);
  expect(narrow.overflow).toBe(false);
  expect(narrow.minGap).toBeGreaterThanOrEqual(7.5);
  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-narrow.png' });
});

test('A multiple ChoiceChips group toggles native checkboxes by pointer and Space and submits every checked value', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const demo = page.locator('[data-demo="choice-chips"]');
  const group = demo.getByRole('group', { name: 'Labels', exact: true });
  await expect(group.getByRole('checkbox')).toHaveCount(5);
  // The controlled value checks several boxes at once.
  await expect(group.getByRole('checkbox', { name: 'Bug' })).toBeChecked();
  await expect(group.getByRole('checkbox', { name: 'Docs' })).toBeChecked();
  await expect(
    group.getByRole('checkbox', { name: 'Feature' }),
  ).not.toBeChecked();

  // Pointer: the pill toggles its checkbox without touching the others.
  await group.locator('[data-choice-value="feature"]').click();
  await expect(group.getByRole('checkbox', { name: 'Feature' })).toBeChecked();
  await expect(group.locator('input:checked')).toHaveCount(3);
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: bug, feature, docs',
  );
  await group.locator('[data-choice-value="bug"]').click();
  await expect(group.getByRole('checkbox', { name: 'Bug' })).not.toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: feature, docs',
  );

  // Keyboard: every pill is its own Tab stop and Space toggles it. Every
  // native checkbox stays in the sequential focus order (none opts out with a
  // negative tabindex). macOS WebKit's default Tab reaches only text fields
  // and lists, never a checkbox (Linux WebKit, Chromium, and Firefox do), so
  // there the box is focused directly before Space; elsewhere Tab moves from
  // one pill to the next.
  const tabIndexes = await group
    .getByRole('checkbox')
    .evaluateAll((boxes) =>
      boxes.map((box) => (box as HTMLInputElement).tabIndex),
    );
  expect(tabIndexes).toEqual([0, 0, 0, 0, 0]);
  const feature = group.getByRole('checkbox', { name: 'Feature' });
  const docs = group.getByRole('checkbox', { name: 'Docs' });
  const macPlatform = await page.evaluate(() =>
    globalThis.navigator.platform.startsWith('Mac'),
  );
  if (browserName === 'webkit' && macPlatform) {
    await docs.focus();
  } else {
    await feature.focus();
    await page.keyboard.press('Tab');
  }
  await expect(docs).toBeFocused();
  await page.keyboard.press('Space');
  await expect(docs).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(docs).toBeChecked();
  await expect(page.locator('.catalog-log')).toHaveText(
    'Checked: feature, docs',
  );
  const focus = await docs.evaluate((input) => {
    const pill = globalThis.getComputedStyle(input.closest('label')!);
    return {
      visible: input.matches(':focus-visible'),
      ring: pill.outlineStyle,
      background: pill.backgroundColor,
    };
  });
  // WebKit never treats a native checkbox as focus-visible by default.
  expect(focus.ring).toBe(focus.visible ? 'solid' : 'none');
  if (browserName !== 'webkit') expect(focus.visible).toBe(true);
  // The checked pill paints its state; the unchecked pill does not.
  const unchecked = await group
    .locator('[data-choice-value="chore"]')
    .evaluate((pill) => globalThis.getComputedStyle(pill).backgroundColor);
  expect(focus.background).not.toBe(unchecked);

  // Every checked value submits under the group's name.
  const submitted = await group.evaluate((element) => {
    const form = document.createElement('form');
    form.append(element.cloneNode(true));
    return new FormData(form).getAll('labels');
  });
  expect(submitted).toEqual(['feature', 'docs']);

  // On dark chrome the chips resolve the dark palette from the scope.
  const intents = demo.getByRole('group', { name: 'Annotation Intents' });
  await expect(intents.getByRole('checkbox')).toHaveCount(7);
  await intents.locator('[data-choice-value="question"]').click();
  await expect(
    intents.getByRole('checkbox', { name: 'Question' }),
  ).toBeChecked();
  await expect(intents.locator('input:checked')).toHaveCount(2);
  const pill = await intents
    .locator('[data-choice-value="move"]')
    .evaluate((element) => ({
      scheme: globalThis.getComputedStyle(element).colorScheme,
      color: globalThis.getComputedStyle(element).color,
    }));
  expect(pill.scheme).toBe('dark');
  // The dark palette's text color, not the light page's.
  expect(pill.color).toBe('rgb(245, 245, 247)');

  if (browserName === 'chromium')
    await demo.screenshot({ path: 'test-results/choice-chips-multiple.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await pillRows(intents);
  expect(narrow.rows).toBeGreaterThan(1);
  expect(narrow.overflow).toBe(false);
});

test('A multiple: true ChoiceChips listbox selects with clicks, modifier keys, and the keyboard', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const listbox = page.getByRole('listbox', { name: 'Workspaces' });
  await expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  const option = (name: string) => listbox.getByRole('option', { name });
  const selected = () =>
    listbox
      .locator('[aria-selected="true"]')
      .evaluateAll((chips) =>
        chips.map((chip) => (chip as HTMLElement).dataset.choiceValue),
      );
  const log = page.locator('.catalog-log');
  const toggleKey = (await page.evaluate(() =>
    /mac|iphone|ipad/i.test(globalThis.navigator.platform),
  ))
    ? 'Meta'
    : 'Control';

  expect(await selected()).toEqual(['atlas']);
  await option('Cirrus').click();
  expect(await selected()).toEqual(['cirrus']);
  await expect(log).toHaveText('Selected: cirrus');
  await option('Fjord').click({ modifiers: ['Shift'] });
  // The archived Delta chip is disabled and stays out of the range.
  expect(await selected()).toEqual(['cirrus', 'ember', 'fjord']);
  await option('Atlas').click({ modifiers: [toggleKey] });
  expect(await selected()).toEqual(['atlas', 'cirrus', 'ember', 'fjord']);
  await option('Ember').click({ modifiers: [toggleKey] });
  expect(await selected()).toEqual(['atlas', 'cirrus', 'fjord']);

  // Keyboard: one Tab stop, arrows select, Shift extends, Space toggles.
  await option('Borealis').click();
  await expect(option('Borealis')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(option('Cirrus')).toBeFocused();
  expect(await selected()).toEqual(['cirrus']);
  await page.keyboard.press('Shift+ArrowRight');
  await expect(option('Ember')).toBeFocused();
  expect(await selected()).toEqual(['cirrus', 'ember']);
  await page.keyboard.press(`${toggleKey}+ArrowLeft`);
  await expect(option('Cirrus')).toBeFocused();
  await page.keyboard.press(`${toggleKey}+ArrowLeft`);
  await expect(option('Borealis')).toBeFocused();
  await page.keyboard.press('Space');
  expect(await selected()).toEqual(['borealis', 'cirrus', 'ember']);
  await page.keyboard.press(`${toggleKey}+a`);
  expect(await selected()).toEqual([
    'atlas',
    'borealis',
    'cirrus',
    'ember',
    'fjord',
  ]);
  await expect(log).toHaveText(
    'Selected: atlas, borealis, cirrus, ember, fjord',
  );
  const tabStops = await listbox
    .getByRole('option')
    .evaluateAll((chips) =>
      chips.map((chip) => (chip as HTMLElement).tabIndex),
    );
  expect(tabStops.filter((index) => index === 0)).toHaveLength(1);
  await expect(option('Borealis')).toHaveCSS('outline-style', 'solid');
  if (browserName === 'chromium')
    await listbox.screenshot({
      path: 'test-results/choice-chips-listbox.png',
    });
});

test('an icon ChoiceChips grid picks with the arrows, names each icon, and scrolls', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=choice-chips');
    const group = page.getByRole('radiogroup', { name: 'Command Icon' });
    const star = group.getByRole('radio', { name: 'Star' });
    await expect(star).toBeChecked();
    const box = (await star.locator('xpath=..').boundingBox())!;
    expect(box.width).toBeCloseTo(36, 0);
    expect(box.height).toBeCloseTo(36, 0);
    await star.focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Heart' })).toBeChecked();
    // The grid is capped and scrolls to its last icon.
    const scroll = await group.evaluate((el) => ({
      height: el.clientHeight,
      content: el.scrollHeight,
    }));
    expect(scroll.content).toBeGreaterThan(scroll.height);
    const last = group.getByRole('radio', { name: 'Lightning' });
    await last.focus();
    await page.keyboard.press('Space');
    await expect(last).toBeChecked();
    await expect(last.locator('xpath=..')).toBeInViewport();
  }
});

test('ChoiceChips keeps selected text, icons, focus, and disabled choices legible in forced colors', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'Chromium forced-colors backplate regression',
  );
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/?component=choice-chips');
      const demo = page.locator('[data-demo="choice-chips"]');
      const radio = demo.getByRole('radiogroup', { name: 'Command Color' });
      const selected = radio.locator('[data-choice-value="blue"]');
      const unselected = radio.locator('[data-choice-value="green"]');
      const system = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.color = 'HighlightText';
        probe.style.backgroundColor = 'Highlight';
        document.body.append(probe);
        const style = globalThis.getComputedStyle(probe);
        const colors = {
          color: style.color,
          background: style.backgroundColor,
        };
        probe.remove();
        return colors;
      });
      await expect(selected.locator('input')).toBeChecked();
      await expect(selected).toHaveCSS('forced-color-adjust', 'none');
      await expect(unselected).toHaveCSS('forced-color-adjust', 'auto');
      await expect(selected).toHaveCSS('color', system.color);
      await expect(selected).toHaveCSS('background-color', system.background);
      await selected.locator('input').focus();
      await page.keyboard.press('ArrowRight');
      await expect(unselected.locator('input')).toBeChecked();
      await expect(unselected).toHaveCSS('forced-color-adjust', 'none');
      await expect(selected).toHaveCSS('forced-color-adjust', 'auto');
      await page.keyboard.press('ArrowLeft');
      await expect(selected.locator('input')).toBeChecked();
      await expect(selected).toHaveCSS('outline-color', system.background);

      const icons = demo.getByRole('radiogroup', { name: 'Board View' });
      await expect(icons.locator('[data-choice-value="board"]')).toHaveCSS(
        'forced-color-adjust',
        'none',
      );
      await expect(
        icons.getByRole('radio', { name: 'Calendar' }),
      ).toBeDisabled();
      const toggles = demo.getByRole('group', { name: 'Labels', exact: true });
      const feature = toggles.locator('[data-choice-value="feature"]');
      await feature.click();
      await expect(feature.locator('input')).toBeChecked();
      await expect(feature).toHaveCSS('forced-color-adjust', 'none');
      const listbox = demo.getByRole('listbox', { name: 'Workspaces' });
      const cirrus = listbox.locator('[data-choice-value="cirrus"]');
      await cirrus.click();
      await expect(cirrus).toHaveAttribute('aria-selected', 'true');
      await expect(cirrus).toHaveCSS('forced-color-adjust', 'none');

      for (const [mode, group] of [
        ['radio', radio],
        ['icons', icons],
        ['toggle', toggles],
        ['listbox', listbox],
      ] as const) {
        await group.screenshot({
          path: `test-results/choice-chips-forced-${mode}-${scheme}-${width}.png`,
        });
      }
    }
  }
});

// KF-0Q7Q3D: a section strip stays one row and scrolls inside its group.
test('an overflow="scroll" ChoiceChips strip stays one row, scrolls inside the group, and fades its cut-off edges', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=choice-chips');
  const demo = page.locator('[data-demo="choice-chips"]');
  const group = demo.getByRole('radiogroup', { name: 'Feed Section' });
  await group.scrollIntoViewIfNeeded();
  expect((await pillRows(group)).rows).toBe(1);
  const metrics = () =>
    group.evaluate((element: HTMLElement) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollLeft: Math.round(element.scrollLeft),
      overflow: element.getAttribute('data-scroll-overflow'),
      mask: element.ownerDocument.defaultView!.getComputedStyle(element)
        .maskImage,
      scrollbar: element.offsetHeight - element.clientHeight,
    }));
  // The group and a margin around it, for its focus ring and edge fades.
  const around = (box: Awaited<ReturnType<Locator['boundingBox']>>) => ({
    x: box!.x - 24,
    y: box!.y - 24,
    width: box!.width + 48,
    height: box!.height + 48,
  });
  const start = await metrics();
  expect(start.scrollWidth).toBeGreaterThan(start.clientWidth);
  expect(start.scrollLeft).toBe(0);
  expect(start.scrollbar).toBe(0);
  // The far edge has chips past it and fades; the near edge does not.
  // Only the horizontal sides matter: the group fades l and r, and cannot
  // scroll vertically.
  const sides = async () =>
    ((await group.getAttribute('data-scroll-overflow')) ?? '').replace(
      /[tb]/g,
      '',
    );
  await expect.poll(sides).toBe('r');
  expect(start.mask).toContain('linear-gradient');
  await page.screenshot({
    path: info.outputPath('KF-0Q7Q3D-section-strip-start.png'),
    clip: around(await group.boundingBox()),
  });
  // Arrow keys move the checked radio; the browser keeps it in view, and
  // the group (not the page) scrolls to it.
  await group.getByRole('radio', { name: 'All' }).focus();
  await page.keyboard.press('ArrowLeft');
  const last = group.getByRole('radio', { name: 'Transport' });
  await expect(last).toBeChecked();
  await expect
    .poll(async () => (await metrics()).scrollLeft)
    .toBeGreaterThan(0);
  const chip = await group
    .locator('.kui-choice-chips__chip[data-choice-value="transport"]')
    .boundingBox();
  const box = (await group.boundingBox())!;
  expect(chip!.x + chip!.width).toBeLessThanOrEqual(box.x + box.width + 1);
  await expect.poll(sides).toBe('l');
  // The focused chip's ring stays inside the group's clip.
  await page.screenshot({
    path: info.outputPath('KF-0Q7Q3D-section-strip-end.png'),
    clip: around(await group.boundingBox()),
  });
});
