import { expect, test } from '@playwright/test';

test('edge-to-edge table bleeds to both Pane edges while cell text tracks content', async ({
  page,
}, testInfo) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=pane');
    for (const direction of ['ltr', 'rtl'] as const) {
      for (const deepInset of [false, true]) {
        const pane = page.locator(
          `[data-demo="pane"] [data-edge-table="${deepInset ? 'deep' : 'plain'}"]`,
        );
        await pane.evaluate((element, dir) => {
          element.setAttribute('dir', dir);
          (element as HTMLElement).style.setProperty(
            '--kui-edge-inset-inline-start',
            '12px',
          );
          (element as HTMLElement).style.setProperty(
            '--kui-edge-inset-inline-end',
            '18px',
          );
        }, direction);
        const geometry = await pane.evaluate((element) => {
          const content =
            element.querySelector<HTMLElement>('.kui-pane__content')!;
          const table = element.querySelector<HTMLElement>(
            '[data-edge-table-bleed] table',
          )!;
          const reference = element.querySelector<HTMLElement>(
            '[data-edge-table-reference]',
          )!;
          const cell = table.querySelector('tbody td')!;
          const range = document.createRange();
          range.selectNodeContents(cell);
          const paneRect = element.getBoundingClientRect();
          const tableRect = table.getBoundingClientRect();
          const referenceRect = reference.getBoundingClientRect();
          const cellTextRect = range.getBoundingClientRect();
          const contentStyle = window.getComputedStyle(content);
          const startIsLeft = contentStyle.direction === 'ltr';
          return {
            tableStart: startIsLeft
              ? tableRect.left - paneRect.left
              : paneRect.right - tableRect.right,
            tableEnd: startIsLeft
              ? paneRect.right - tableRect.right
              : tableRect.left - paneRect.left,
            textAxis: startIsLeft
              ? cellTextRect.left - referenceRect.left
              : referenceRect.right - cellTextRect.right,
            contentStartPadding: parseFloat(contentStyle.paddingInlineStart),
            contentEndPadding: parseFloat(contentStyle.paddingInlineEnd),
            overflow: content.scrollWidth - content.clientWidth,
          };
        });
        expect(geometry.tableStart).toBeCloseTo(0, 0);
        expect(geometry.tableEnd).toBeCloseTo(0, 0);
        expect(geometry.textAxis).toBeCloseTo(0, 0);
        expect(geometry.contentStartPadding).toBe(deepInset ? 20 : 12);
        expect(geometry.contentEndPadding).toBe(deepInset ? 26 : 18);
        expect(geometry.overflow).toBeLessThanOrEqual(1);
        if (testInfo.project.name === 'chromium')
          await pane.screenshot({
            path: testInfo.outputPath(
              `pane-edge-table-${width}-${direction}-${deepInset ? 'deep' : 'plain'}.png`,
            ),
          });
      }
    }
  }
});

test('deepInset adds one outer gutter while nested List items keep 8px spacing', async ({
  page,
  browserName,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?component=pane');
    const pane = page.locator(
      '[data-demo="pane"] [data-component="pane"][aria-label="Deep inset example"]',
    );
    await expect(pane).toHaveAttribute('data-deep-inset', 'true');
    const edges = await pane.evaluate((element) => {
      const left = element.getBoundingClientRect().left;
      const item = element.querySelector<HTMLElement>('.kui-content-item')!;
      const row = element.querySelector<HTMLElement>(
        '.kui-list > .kui-content-item',
      )!;
      return {
        item: item.getBoundingClientRect().left - left,
        row: row.getBoundingClientRect().left - left,
        rowMargin: window.getComputedStyle(row).marginLeft,
      };
    });
    expect(edges.item).toBeCloseTo(16, 0);
    expect(edges.row).toBeCloseTo(16, 0);
    expect(edges.rowMargin).toBe('8px');
    await pane.evaluate((element) => {
      (element as HTMLElement).style.setProperty(
        '--kui-edge-inset-inline-start',
        '12px',
      );
    });
    const safeContentPadding = await pane
      .locator('.kui-pane__content')
      .evaluate((element) => window.getComputedStyle(element).paddingLeft);
    expect(safeContentPadding).toBe('20px');
    await pane.evaluate((element) => {
      (element as HTMLElement).style.removeProperty(
        '--kui-edge-inset-inline-start',
      );
    });
    if (browserName === 'chromium')
      await pane.screenshot({
        path: `test-results/pane-deep-inset-${width}.png`,
      });

    await page.goto('/?component=tab-navigator');
    const scaffold = page.locator('#catalog-tab-scaffold');
    await scaffold.getByRole('tab', { name: 'Search' }).click();
    const scene = scaffold.locator('[data-tab-scaffold-scene="search"]');
    await expect(scene).toHaveAttribute('data-deep-inset', 'true');
    const sceneInset = await scene.evaluate((element) => {
      const item = element.querySelector<HTMLElement>('.kui-content-item')!;
      return (
        item.getBoundingClientRect().left - element.getBoundingClientRect().left
      );
    });
    expect(sceneInset).toBeCloseTo(16, 0);
    await scene.evaluate((element) => {
      (element as HTMLElement).style.setProperty(
        '--kui-edge-inset-inline-start',
        '12px',
      );
    });
    await expect(scene).toHaveCSS('padding-left', '20px');
    await scene.evaluate((element) => {
      (element as HTMLElement).style.removeProperty(
        '--kui-edge-inset-inline-start',
      );
    });
    if (browserName === 'chromium' && width === 390)
      await scaffold.screenshot({
        path: 'test-results/tab-scaffold-deep-inset-narrow.png',
      });
  }
});

test('Pane owns vertical slots, scrolling, and independent separators', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('/?component=pane');

  const pane = page
    .locator('[data-demo="pane"] [data-component="pane"]')
    .first();
  await expect(pane).toBeVisible();
  await expect(pane).toHaveAttribute('data-separator-block-start', 'true');
  await expect(pane).toHaveAttribute('data-separator-block-end', 'true');
  await expect(pane).toHaveAttribute('data-separator-inline-start', 'true');
  await expect(pane).toHaveAttribute('data-separator-inline-end', 'true');
  const secondary = pane.locator(
    '.kui-pane__header [data-component="list-inset-text"]',
  );
  await expect(secondary).toHaveText('Optional secondary header row');

  const geometry = await pane.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const header = element.querySelector<HTMLElement>('.kui-pane__header')!;
    const content = element.querySelector<HTMLElement>('.kui-pane__content')!;
    const footer = element.querySelector<HTMLElement>('.kui-pane__footer')!;
    const secondary = element
      .querySelector<HTMLElement>('[data-component="list-inset-text"]')!
      .getBoundingClientRect();
    const firstContent = content
      .querySelector<HTMLElement>('.kui-content-item')!
      .getBoundingClientRect();
    return {
      display: style.display,
      borders: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      headerDirection: window.getComputedStyle(header).flexDirection,
      contentDirection: window.getComputedStyle(content).flexDirection,
      contentOverflow: window.getComputedStyle(content).overflowY,
      alignedTextEdges: Math.abs(secondary.left - firstContent.left) <= 1,
      order: [header.offsetTop, content.offsetTop, footer.offsetTop],
    };
  });
  expect(geometry).toMatchObject({
    display: 'grid',
    borders: ['1px', '1px', '1px', '1px'],
    headerDirection: 'column',
    contentDirection: 'column',
    contentOverflow: 'auto',
    alignedTextEdges: true,
  });
  expect(geometry.order[0]).toBeLessThan(geometry.order[1]);
  expect(geometry.order[1]).toBeLessThan(geometry.order[2]);

  await expect(
    page.locator(
      '#kui-catalog-left-rail > .kui-workbench__panel-content > [data-component="pane"]',
    ),
  ).toHaveAttribute('data-component', 'pane');
  await expect(
    page.locator(
      '#kui-catalog > .kui-workbench__center > [data-workbench-main] > [data-component="pane"]',
    ),
  ).toHaveAttribute('data-component', 'pane');

  if (browserName === 'chromium')
    await pane.screenshot({
      path: 'test-results/pane-inset-text-wide.png',
    });
});

test('Pane and the migrated catalog remain coherent at a narrow viewport', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=pane');

  const sidebar = page.locator('#kui-catalog-left-rail');
  const pane = page
    .locator('[data-demo="pane"] [data-component="pane"]')
    .first();
  await expect(
    pane.locator('.kui-pane__header [data-component="list-inset-text"]'),
  ).toHaveText('Optional secondary header row');
  // Narrow, the catalog sidebar is a closed Workbench overlay, so the page
  // never overflows sideways and the stage keeps the full width.
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  await expect(sidebar).toHaveCSS('position', 'absolute');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);

  if (browserName === 'chromium')
    await pane.screenshot({
      path: 'test-results/pane-inset-text-narrow.png',
    });
});

test('Pane header toolbar and ListHeader trailing actions share one axis', async ({
  page,
}) => {
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=list');
    const pane = page.locator('[data-demo="list"] [data-component="pane"]');
    await expect(pane).toBeVisible();
    const axis = await pane.evaluate((root) => {
      const glyph = (selector: string) =>
        root
          .querySelector(selector)!
          .querySelector('svg')!
          .getBoundingClientRect();
      const toolbar = glyph('.kui-pane__header [data-action="log-add"]');
      const listHeader = glyph('.kui-list-header__action');
      const paneRight = root.getBoundingClientRect().right;
      return {
        toolbarCenter: paneRight - (toolbar.left + toolbar.width / 2),
        listHeaderCenter: paneRight - (listHeader.left + listHeader.width / 2),
        toolbarEnd: paneRight - toolbar.right,
        listHeaderEnd: paneRight - listHeader.right,
      };
    });
    // Both trailing "+" glyphs center 30px in from the pane edge: the 8px
    // inline margin plus half of a 44px toolbar-control slot.
    expect(axis.toolbarCenter).toBeCloseTo(30, 0);
    expect(
      Math.abs(axis.listHeaderCenter - axis.toolbarCenter),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(axis.listHeaderEnd - axis.toolbarEnd)).toBeLessThanOrEqual(
      1,
    );
  }
});

test('sunken Pane paints short and long scroll viewports with fixed and auto chrome', async ({
  page,
}, testInfo) => {
  for (const width of [1200, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=pane');
    const chat = page.locator('#sunken-chat [data-component="pane"]');
    await expect(chat).toHaveAttribute('data-appearance', 'sunken');
    await expect(chat).toHaveAttribute('data-chrome-dividers', 'always');
    await expect(chat.locator('.kui-pane__footer')).not.toHaveCSS(
      'box-shadow',
      'none',
    );
    const chatGeometry = await chat.evaluate((pane) => {
      const content = pane.querySelector<HTMLElement>('.kui-pane__content')!;
      const footer = pane.querySelector<HTMLElement>('.kui-pane__footer')!;
      return {
        paneBackground: window.getComputedStyle(pane).backgroundColor,
        contentBackground: window.getComputedStyle(content).backgroundColor,
        footerBackground: window.getComputedStyle(footer).backgroundColor,
        contentFits: content.scrollHeight <= content.clientHeight + 1,
        contentBottom: content.getBoundingClientRect().bottom,
        footerTop: footer.getBoundingClientRect().top,
      };
    });
    expect(chatGeometry.paneBackground).toBe('rgba(0, 0, 0, 0)');
    expect(chatGeometry.contentBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(chatGeometry.footerBackground).toBe('rgba(0, 0, 0, 0)');
    expect(chatGeometry.contentFits).toBe(true);
    expect(
      Math.abs(chatGeometry.contentBottom - chatGeometry.footerTop),
    ).toBeLessThanOrEqual(1);
    await chat.screenshot({
      path: testInfo.outputPath(`sunken-chat-${width}.png`),
    });
    await chat.evaluate((pane) => {
      (pane as HTMLElement).style.setProperty(
        '--kui-sunken-panel-background',
        'rgba(10, 20, 30, 0.2)',
      );
    });
    await expect(chat.locator('.kui-pane__content')).toHaveCSS(
      'background-color',
      'rgba(10, 20, 30, 0.2)',
    );
    await expect(chat).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    const long = page.locator('[data-scroll-divider-demo="pane"]');
    await expect(long).toHaveAttribute('data-appearance', 'sunken');
    const longContent = long.locator('.kui-pane__content');
    await longContent.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(
      await longContent.evaluate((element) => element.scrollTop),
    ).toBeGreaterThan(0);
    await expect(longContent).not.toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );

    const auto = page.locator(
      '[data-component="pane"][aria-label="Sunken auto workspace"]',
    );
    await expect(auto).toHaveAttribute('data-appearance', 'sunken');
    const autoGeometry = await auto.evaluate((pane) => {
      const content = pane.querySelector<HTMLElement>('.kui-pane__content')!;
      return {
        rootBackground: window.getComputedStyle(pane).backgroundColor,
        contentBackground: window.getComputedStyle(content).backgroundColor,
      };
    });
    expect(autoGeometry.rootBackground).not.toBe('rgba(0, 0, 0, 0)');
    expect(autoGeometry.contentBackground).toBe('rgba(0, 0, 0, 0)');
    await auto.evaluate((pane) => {
      (pane as HTMLElement).style.height = '300px';
      pane.scrollTop = pane.scrollHeight;
    });
    expect(await auto.evaluate((pane) => pane.scrollTop)).toBeGreaterThan(0);
    await expect(auto.locator('.kui-pane__content')).toHaveCSS(
      'overflow-y',
      'visible',
    );

    const raw = page.locator('#sunken-raw-workbench');
    const rawMain = raw.locator('[data-workbench-main]');
    const rawRail = raw.locator('[data-workbench-rail="left"]');
    await expect(rawMain).toHaveAttribute('data-appearance', 'sunken');
    await expect(rawRail).toHaveAttribute('data-appearance', 'sunken');
    await expect(rawMain).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(rawRail).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(raw.locator('[data-component="pane"]')).toHaveCount(0);
  }
});

test('sunken NavStack Pane and TabScaffold scene paint their scroll areas', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?component=nav-stack');
  const view = page.locator('#catalog-nav-stack [data-nav-key="library"]');
  const pane = view.locator(':scope > [data-component="pane"]');
  await expect(pane).toHaveAttribute('data-appearance', 'sunken');
  await expect(pane.locator('.kui-pane__content')).not.toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)',
  );
  await page.goto('/?component=tab-navigator');
  const scene = page.locator(
    '#catalog-tab-scaffold [data-tab-scaffold-scene="projects"]',
  );
  await expect(scene).toHaveAttribute('data-appearance', 'sunken');
  await expect(scene).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
