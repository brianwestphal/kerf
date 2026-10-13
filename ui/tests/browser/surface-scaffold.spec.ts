import { expect, test } from '@playwright/test';

test('registered dialog names survive slotted labels, header changes and repeated opens', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  const dialog = page.locator('#catalog-bounded-dialog');
  await page.getByRole('button', { name: 'Open Bounded Dialog' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Close workspace', exact: true }),
  ).toBeVisible();
  for (const name of [
    'First explicit workspace',
    'Second explicit workspace',
  ]) {
    await dialog.evaluate(
      (element, value) => element.setAttribute('aria-label', value),
      name,
    );
    await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
  }
  await dialog.evaluate((element) => element.removeAttribute('aria-label'));
  await expect(
    page.getByRole('dialog', { name: 'Close workspace', exact: true }),
  ).toBeVisible();
  await dialog.evaluate((element) => {
    const title = document.createElement('span');
    title.slot = 'label';
    title.textContent = 'Review running tasks';
    element.append(title);
  });
  await expect(
    page.getByRole('dialog', { name: 'Review running tasks', exact: true }),
  ).toBeVisible();
  await dialog
    .locator('[slot="label"]')
    .evaluate((element) => (element.textContent = 'Review stopped tasks'));
  await expect(
    page.getByRole('dialog', { name: 'Review stopped tasks', exact: true }),
  ).toBeVisible();
  await dialog.evaluate((element) => {
    element.setAttribute('without-header', '');
    element.setAttribute('label', 'Headerless workspace');
  });
  await expect(
    page.getByRole('dialog', { name: 'Headerless workspace', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Open Bounded Dialog' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Headerless workspace', exact: true }),
  ).toBeVisible();
  await dialog.evaluate((element) => {
    element.removeAttribute('without-header');
    element.querySelector('[slot="label"]')!.remove();
    element.setAttribute('label', 'Restored workspace');
  });
  await expect(
    page.getByRole('dialog', { name: 'Restored workspace', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('modal viewport bounds retain actions and native focus across resize and reopen', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const trigger = page.getByRole('button', { name: 'Open Bounded Dialog' });
  await trigger.click();
  const dialog = page.locator('#catalog-bounded-dialog');
  await expect(
    page.getByRole('dialog', { name: 'Close workspace', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        element
          .shadowRoot!.querySelector('[part~="dialog"]')!
          .classList.contains('show'),
      ),
    )
    .toBe(false);
  for (const viewport of [
    { width: 1100, height: 850 },
    { width: 390, height: 844 },
    { width: 320, height: 480 },
    { width: 390, height: 520 },
    { width: 1100, height: 850 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(dialog).toHaveAttribute('open', '');
    await expect
      .poll(() =>
        dialog.evaluate(
          (element) =>
            element
              .shadowRoot!.querySelector('[part~="dialog"]')!
              .getBoundingClientRect().width,
        ),
      )
      .toBeCloseTo(Math.min(832, viewport.width - 16), 0);
    const geometry = await dialog.evaluate((element) => {
      const panel = element.shadowRoot!.querySelector('[part~="dialog"]')!;
      const body = element.shadowRoot!.querySelector('[part~="body"]')!;
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        maxHeight: parseFloat(window.getComputedStyle(panel).maxHeight),
        bodyOverflow: body.scrollHeight - body.clientHeight,
        pageOverflow: document.body.scrollWidth - window.innerWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(7.5);
    expect(geometry.right).toBeLessThanOrEqual(viewport.width - 7.5);
    expect(geometry.top).toBeGreaterThanOrEqual(7.5);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height - 7.5);
    expect(geometry.width).toBeCloseTo(Math.min(832, viewport.width - 16), 0);
    expect(geometry.maxHeight).toBeCloseTo(viewport.height - 16, 0);
    expect(geometry.bodyOverflow).toBeLessThanOrEqual(1);
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
    for (const name of ['Keep Working', 'Stop and Close']) {
      const action = dialog.getByRole('button', { name, exact: true });
      await expect(action).toBeVisible();
      const rect = await action.boundingBox();
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height - 8);
    }
    await page.screenshot({
      path: testInfo.outputPath(
        `bounded-modal-${viewport.width}x${viewport.height}.png`,
      ),
    });
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate(
        (element) =>
          document.activeElement === element ||
          document.activeElement === document.body ||
          element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('button', { name: 'Keep Working' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('typed modal cap keeps its footer reachable when the body scrolls', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 520 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Capped Dialog' }).click();
  const dialog = page.locator('#catalog-capped-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.getByRole('dialog')).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) =>
        element
          .shadowRoot!.querySelector('[part~="dialog"]')!
          .classList.contains('show'),
      ),
    )
    .toBe(false);
  const geometry = await dialog.evaluate((element) => {
    const panel = element.shadowRoot!.querySelector('[part~="dialog"]')!;
    const body = element.shadowRoot!.querySelector('[part~="body"]')!;
    return {
      height: panel.getBoundingClientRect().height,
      maxHeight: window.getComputedStyle(panel).maxHeight,
      overflow: body.scrollHeight - body.clientHeight,
    };
  });
  expect(geometry.height).toBeLessThanOrEqual(360.5);
  expect(geometry.maxHeight).toBe('360px');
  expect(geometry.overflow).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 240 });
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) =>
          window.getComputedStyle(
            element.shadowRoot!.querySelector('[part~="dialog"]')!,
          ).maxHeight,
      ),
    )
    .toBe('224px');
  await expect(
    dialog.getByRole('button', { name: 'Cancel Review' }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 520 });
  await page.screenshot({
    path: testInfo.outputPath('capped-modal-phone.png'),
  });
  await dialog.getByRole('button', { name: 'Cancel Review' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');
});

test('preferred modal widths override presets without changing side-sheet or fullscreen geometry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const bounded = page.locator('#catalog-bounded-dialog');
  await page.getByRole('button', { name: 'Open Bounded Dialog' }).click();
  await expect(bounded).toHaveAttribute('open', '');
  const panelWidth = (selector: string) =>
    page
      .locator(selector)
      .evaluate(
        (element) =>
          element
            .shadowRoot!.querySelector('[part~="dialog"]')!
            .getBoundingClientRect().width,
      );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(832, 0);
  const surface = bounded.locator('xpath=..');
  await surface.evaluate((element) =>
    element.removeAttribute('data-viewport-gutter'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(832, 0);
  await surface.evaluate((element) =>
    element.setAttribute('data-presentation', 'side-sheet'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(480, 0);
  await surface.evaluate((element) =>
    element.setAttribute('data-presentation', 'fullscreen'),
  );
  await expect
    .poll(() => panelWidth('#catalog-bounded-dialog'))
    .toBeCloseTo(1100, 0);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open Capped Dialog' }).click();
  await expect(page.locator('#catalog-capped-dialog')).toHaveAttribute(
    'open',
    '',
  );
  await expect
    .poll(() => panelWidth('#catalog-capped-dialog'))
    .toBeCloseTo(480, 0);
});

test('applies typed dialog and popup surface geometry', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await expect(demo).toBeVisible();

  await demo.getByRole('button', { name: 'Open Dialog' }).click();
  const dialog = page.locator('#catalog-wa-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const dialogGeometry = await dialog.evaluate((element) => {
    const root = element.shadowRoot!;
    const panel = root.querySelector('[part~="dialog"]')!;
    const body = root.querySelector('[part~="body"]')!;
    const footer = root.querySelector('[part~="footer"]')!;
    return {
      width: Math.round(panel.getBoundingClientRect().width),
      bodyPadding: window.getComputedStyle(body).padding,
      footerPadding: window.getComputedStyle(footer).padding,
    };
  });
  expect(dialogGeometry.width).toBeLessThanOrEqual(560);
  expect(dialogGeometry.bodyPadding).toBe('0px');
  expect(dialogGeometry.footerPadding).toBe('16px');
  const dialogList = dialog.locator('[data-component="list"]');
  const dialogText = dialog.locator('[data-component="list-inset-text"]');
  await expect(dialogList).toBeVisible();
  await expect(dialogText).toHaveText(
    'Dialog content uses list-owned item geometry.',
  );
  const listGeometry = await dialogText.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      marginInline: [style.marginInlineStart, style.marginInlineEnd],
      paddingInline: [style.paddingInlineStart, style.paddingInlineEnd],
      borderInline: [style.borderInlineStartWidth, style.borderInlineEndWidth],
    };
  });
  expect(listGeometry).toEqual({
    marginInline: ['8px', '8px'],
    paddingInline: ['8px', '8px'],
    borderInline: ['1px', '1px'],
  });
  // A plain-string label is inset to the body's text edge.
  const labelAlignment = await dialog.evaluate((element) => {
    const textLeft = (node: Node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect().left;
    };
    const title = element.shadowRoot!.querySelector('[part~="title"]')!;
    const body = element.querySelector('[data-component="list-inset-text"]')!;
    return { title: textLeft(title), body: textLeft(body) };
  });
  expect(Math.abs(labelAlignment.title - labelAlignment.body)).toBeLessThan(1);
  const wideClip = await dialog.evaluate((element) => {
    const rect = element
      .shadowRoot!.querySelector('[part~="dialog"]')!
      .getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-wide.png'),
    clip: wideClip,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const narrowGeometry = await dialog.evaluate((element) => {
    const panel = element.shadowRoot!.querySelector('[part~="dialog"]')!;
    const text = element.querySelector('[data-component="list-inset-text"]')!;
    const panelRect = panel.getBoundingClientRect();
    const textRect = text.getBoundingClientRect();
    return {
      panelLeft: Math.round(panelRect.left),
      panelRight: Math.round(panelRect.right),
      textLeft: Math.round(textRect.left),
      textRight: Math.round(textRect.right),
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(narrowGeometry.textLeft).toBeGreaterThan(narrowGeometry.panelLeft);
  expect(narrowGeometry.panelLeft).toBe(20);
  expect(narrowGeometry.panelRight).toBe(370);
  expect(narrowGeometry.textRight).toBeLessThan(narrowGeometry.panelRight);
  expect(narrowGeometry.bodyScrollWidth).toBeLessThanOrEqual(
    narrowGeometry.viewportWidth,
  );
  const narrowClip = await dialog.evaluate((element) => {
    const rect = element
      .shadowRoot!.querySelector('[part~="dialog"]')!
      .getBoundingClientRect();
    const inset = 16;
    return {
      x: Math.max(0, rect.left - inset),
      y: Math.max(0, rect.top - inset),
      width: Math.min(window.innerWidth, rect.width + inset * 2),
      height: Math.min(window.innerHeight, rect.height + inset * 2),
    };
  });
  await page.screenshot({
    path: testInfo.outputPath('dialog-surface-narrow.png'),
    clip: narrowClip,
  });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toHaveAttribute('open', '');

  const dropdown = demo.locator('wa-dropdown');
  await dropdown.getByRole('button', { name: 'Choose View' }).click();
  await expect(dropdown.locator('wa-dropdown-item').first()).toBeVisible();
  expect(
    await dropdown.evaluate(
      (element) =>
        window.getComputedStyle(
          element.shadowRoot!.querySelector('[part~="menu"]')!,
        ).padding,
    ),
  ).toBe('0px');
});

test('a raw dropdown inside PopupSurface keeps keyboard navigation made during show', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  await page.evaluate(async () => {
    await customElements.whenDefined('wa-dropdown');
    const surface = document.createElement('span');
    surface.className = 'kui-popup-surface';
    surface.innerHTML =
      '<wa-dropdown id="test-surface-dropdown"><button slot="trigger">Choose action</button><wa-dropdown-item>First</wa-dropdown-item><wa-dropdown-item>Second</wa-dropdown-item></wa-dropdown>';
    document.body.append(surface);
    const dropdown = surface.querySelector(
      'wa-dropdown',
    ) as unknown as HTMLElement & {
      updateComplete: Promise<unknown>;
      menu?: HTMLElement;
    };
    await dropdown.updateComplete;
    dropdown.menu?.style.setProperty('--show-duration', '1500ms');
  });
  const dropdown = page.locator('#test-surface-dropdown');
  const trigger = dropdown.getByRole('button', { name: 'Choose action' });
  const second = dropdown.getByRole('menuitem', { name: 'Second' });
  await trigger.click();
  await expect
    .poll(() =>
      dropdown.evaluate((element) =>
        (
          element as HTMLElement & { menu?: HTMLElement }
        ).menu?.classList.contains('show'),
      ),
    )
    .toBe(true);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(second).toBeFocused();
  await expect
    .poll(() =>
      dropdown.evaluate((element) =>
        (
          element as HTMLElement & { menu?: HTMLElement }
        ).menu?.classList.contains('show'),
      ),
    )
    .toBe(false);
  await expect(second).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dropdown).not.toHaveAttribute('open', '');
});

test('a definite-height DialogSurface hands its whole body to one filling child', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/?component=surface-scaffold');
  await page.getByRole('button', { name: 'Open Project Details' }).click();
  const dialog = page.locator('#catalog-filled-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const part = element.shadowRoot!.querySelector('[part~="dialog"]')!;
        const body = element.shadowRoot!.querySelector('[part~="body"]')!;
        const split = element.querySelector('[data-component="split-view"]')!;
        return {
          dialog: Math.round(part.getBoundingClientRect().height),
          body: Math.round(body.getBoundingClientRect().height),
          split: Math.round(split.getBoundingClientRect().height),
        };
      }),
    )
    .toMatchObject({ dialog: 480 });
  const sizes = await dialog.evaluate((element) => {
    const body = element.shadowRoot!.querySelector('[part~="body"]')!;
    const split = element.querySelector('[data-component="split-view"]')!;
    return [
      Math.round(body.getBoundingClientRect().height),
      Math.round(split.getBoundingClientRect().height),
    ];
  });
  expect(sizes[1]).toBe(sizes[0]);
});

test('PopoverDialogSurface is a centered, bounded, non-modal light-dismiss dialog', async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=surface-scaffold');
    const open = page.getByRole('button', { name: 'Open Repository Status' });
    const surface = page.getByRole('dialog', {
      name: 'Repository Status',
      exact: true,
    });
    await open.click();
    await expect(surface).toBeVisible();
    const box = await surface.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const split = element
        .querySelector('[data-component="split-view"]')!
        .getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(window.innerWidth - rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(window.innerHeight - rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        split: Math.round(split.height),
      };
    });
    // 720px preferred, capped to the viewport minus two 8px gutters, centered.
    expect(box.width).toBe(Math.min(720, width - 16));
    expect(Math.abs(box.left - box.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.top - box.bottom)).toBeLessThanOrEqual(1);
    expect(box.height).toBe(420);
    // The SplitView fills the surface inside its 1px borders.
    expect(box.split).toBe(box.height - 2);
    // Non-modal: the controls behind it are not made inert.
    expect(
      await page
        .getByRole('button', { name: 'Open Project Details' })
        .evaluate((element) => element.closest('[inert]') === null),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(surface).toBeHidden();
    // A press outside also dismisses it.
    await open.click();
    await expect(surface).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(surface).toBeHidden();
  }
});

test('an embedded PopoverDialogSurface renders the same surface in flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=surface-scaffold');
  const embedded = page.getByRole('dialog', {
    name: 'Repository Status preview',
  });
  await embedded.scrollIntoViewIfNeeded();
  await expect(embedded).toBeVisible();
  await expect(embedded).not.toHaveAttribute('popover');
  const geometry = await embedded.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const parent = element.parentElement!.getBoundingClientRect();
    const split = element
      .querySelector('[data-component="split-view"]')!
      .getBoundingClientRect();
    return {
      position: window.getComputedStyle(element).position,
      height: Math.round(rect.height),
      fitsParent: rect.right <= parent.right + 1,
      split: Math.round(split.height),
    };
  });
  expect(geometry).toEqual({
    position: 'relative',
    height: 280,
    fitsParent: true,
    split: 278,
  });
});

// A wa-dialog host that is itself an explicit, named dialog owns that name:
// DialogSurface no longer names the native panel too, so one dialog carries
// the name (a role query is not ambiguous) and the slotted content stays in it.
test('a host with an explicit dialog role is the only dialog with its name', async ({
  page,
}) => {
  await page.goto('/?component=surface-scaffold');
  const dialog = page.locator('#catalog-bounded-dialog');
  await dialog.evaluate((element) => {
    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-label', 'Not working');
  });
  await page.getByRole('button', { name: 'Open Bounded Dialog' }).click();
  const named = page.getByRole('dialog', { name: 'Not working', exact: true });
  await expect(named).toHaveCount(1);
  expect(
    await dialog.evaluate((element) => {
      const panel = element.shadowRoot!.querySelector('dialog')!;
      return [
        panel.open,
        panel.getAttribute('aria-label'),
        panel.getAttribute('aria-labelledby'),
      ];
    }),
  ).toEqual([true, null, null]);
  await page.keyboard.press('Escape');
});

// The built-in close control matches a borderless single ToolbarControlGroup
// button, the close a toolbar-composed dialog uses: a 40px circle with no
// border and the neutral hover fill.
test('the default dialog close control is a toolbar-sized circle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto('/?component=surface-scaffold');
  const demo = page.locator('[data-demo="surface-scaffold"]');
  await demo.getByRole('button', { name: 'Open Dialog' }).click();
  const dialog = page.locator('#catalog-wa-dialog');
  await expect(dialog).toHaveAttribute('open', '');
  const close = dialog.locator('[part~="close-button"]');
  const geometry = () =>
    dialog.evaluate((element) => {
      const button = element.shadowRoot!.querySelector(
        '[part~="close-button"]',
      )!;
      const base = button.shadowRoot!.querySelector('[part~="base"]')!;
      const box = base.getBoundingClientRect();
      const style = window.getComputedStyle(base);
      return {
        width: box.width,
        height: box.height,
        radius: style.borderTopLeftRadius,
        border: style.borderTopColor,
        background: style.backgroundColor,
      };
    });
  // The dialog scales in; measure once its show animation settles.
  await expect.poll(async () => Math.round((await geometry()).width)).toBe(40);
  const rest = await geometry();
  expect(rest.width).toBeCloseTo(40, 0);
  expect(rest.height).toBeCloseTo(40, 0);
  expect(rest.radius).toBe('50%');
  expect(rest.border).toBe('rgba(0, 0, 0, 0)');
  const hoverFill = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--kui-color-neutral-fill-normal)';
    document.body.append(probe);
    const color = window.getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  await close.hover();
  await expect.poll(async () => (await geometry()).background).toBe(hoverFill);
  await page.keyboard.press('Escape');
});
