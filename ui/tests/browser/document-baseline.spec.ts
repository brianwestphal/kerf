import { expect, test } from '@playwright/test';

test('the catalog opts into the full-height document baseline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/?component=workbench');

  const app = page.locator('#app');
  await expect(app).toHaveClass(/kui-app-root/);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('#app')!;
    const anchor = document.createElement('a');
    anchor.textContent = 'Baseline link';
    root.append(anchor);
    const probe = document.createElement('span');
    probe.style.color = 'var(--kui-color-text)';
    probe.style.backgroundColor = 'var(--kui-color-surface-lowered)';
    probe.style.fontFamily = 'var(--kui-font-sans)';
    root.append(probe);
    const linkProbe = document.createElement('span');
    linkProbe.style.color = 'var(--kui-color-text-link)';
    root.append(linkProbe);
    const style = (element: Element, pseudo?: string) =>
      globalThis.getComputedStyle(element, pseudo);
    const result = {
      htmlHeight: style(document.documentElement).height,
      bodyHeight: style(document.body).height,
      rootHeight: style(root).height,
      bodyMargin: style(document.body).margin,
      bodyFont: style(document.body).fontFamily,
      bodyLineHeight: style(document.body).lineHeight,
      bodyColor: style(document.body).color,
      bodyBackground: style(document.body).backgroundColor,
      tokenFont: style(probe).fontFamily,
      tokenColor: style(probe).color,
      tokenBackground: style(probe).backgroundColor,
      linkColor: style(anchor).color,
      tokenLink: style(linkProbe).color,
      boxSizing: style(document.body, '::before').boxSizing,
    };
    anchor.remove();
    probe.remove();
    linkProbe.remove();
    return result;
  });
  expect(geometry).toMatchObject({
    htmlHeight: '900px',
    bodyHeight: '900px',
    rootHeight: '900px',
    bodyMargin: '0px',
    boxSizing: 'border-box',
  });
  // WebKit serializes the computed 1.45 line height as 23.200001px.
  expect(Number.parseFloat(geometry.bodyLineHeight)).toBeCloseTo(23.2, 3);
  expect(geometry.bodyFont).toBe(geometry.tokenFont);
  expect(geometry.bodyColor).toBe(geometry.tokenColor);
  expect(geometry.bodyBackground).toBe(geometry.tokenBackground);
  expect(geometry.linkColor).toBe(geometry.tokenLink);
  await page.screenshot({
    path: 'test-results/document-baseline-wide.png',
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'test-results/document-baseline-narrow.png',
    fullPage: true,
  });
});

test('the document-baseline route shows kui-app-root filling a definite height', async ({
  page,
}) => {
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 820 });
    await page.goto('/?component=document-baseline');
    const root = page.locator('[data-document-baseline-root]');
    await expect(root).toHaveClass('kui-app-root');
    const geometry = await root.evaluate((element) => {
      const frame = element.parentElement!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const shell = element.firstElementChild!.getBoundingClientRect();
      return {
        frame: frame.height,
        root: box.height,
        shell: shell.height,
        overflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(geometry.root).toBeGreaterThan(100);
    expect(Math.abs(geometry.root - geometry.shell)).toBeLessThan(1);
    expect(geometry.frame - geometry.root).toBeLessThan(4);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
  }
});

test('native table cells and controls inherit document typography', async ({
  page,
}, testInfo) => {
  await page.goto('/?component=document-baseline');
  await page.evaluate(() => {
    const fixture = document.createElement('section');
    fixture.dataset.baselineFontFixture = '';
    fixture.style.cssText =
      'display:grid;gap:16px;margin:24px;width:calc(100% - 48px);max-width:480px';
    fixture.innerHTML = `
      <table style="border-spacing:8px">
        <caption>Native table typography</caption>
        <thead><tr><th scope="col">Item</th><th scope="col">State</th></tr></thead>
        <tbody><tr><td>Messages</td><td>Ready</td></tr></tbody>
      </table>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:start">
        <button type="button">Apply</button>
        <input aria-label="Filter" value="Filter messages" />
        <select aria-label="State"><option>Ready</option></select>
        <textarea aria-label="Notes" rows="1">Notes</textarea>
      </div>`;
    document.body.append(fixture);
  });

  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: 850 });
    const fonts = await page.evaluate(() => {
      const fixture = document.querySelector('[data-baseline-font-fixture]')!;
      const metrics = (element: Element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          family: style.fontFamily,
          size: style.fontSize,
          lineHeight: style.lineHeight,
          weight: style.fontWeight,
        };
      };
      return {
        body: metrics(document.body),
        elements: [
          ...fixture.querySelectorAll(
            'th, td, button, input, select, textarea',
          ),
        ].map(metrics),
      };
    });
    for (const element of fonts.elements) {
      expect(element.family).toBe(fonts.body.family);
      expect(element.size).toBe(fonts.body.size);
      expect(element.lineHeight).toBe(fonts.body.lineHeight);
    }
    expect(Number(fonts.elements[0]!.weight)).toBeGreaterThan(
      Number(fonts.elements[2]!.weight),
    );
    await page.locator('[data-baseline-font-fixture]').screenshot({
      path: testInfo.outputPath(`document-baseline-fonts-${width}.png`),
    });
  }
});

test('native controls get semantic cursors that components can override', async ({
  page,
}) => {
  await page.goto('/?component=document-baseline');
  await page.waitForFunction(() => customElements.get('wa-button'));
  const cursors = await page.evaluate(async () => {
    const fixture = document.createElement('section');
    fixture.innerHTML = `
      <button type="button" data-c="button">Apply</button>
      <button type="button" disabled data-c="button-disabled">Off</button>
      <a href="#x" data-c="link">Link</a>
      <a data-c="anchor-no-href">Plain</a>
      <span role="button" tabindex="0" data-c="role-button">Role</span>
      <span role="button" aria-disabled="true" data-c="role-disabled">Off</span>
      <input type="checkbox" data-c="checkbox" />
      <input type="radio" data-c="radio" />
      <input type="submit" data-c="submit" />
      <input type="checkbox" disabled data-c="checkbox-disabled" />
      <label data-c="checkbox-label"><input type="checkbox" /> Label</label>
      <input data-c="text" />
      <input type="search" data-c="search" />
      <input disabled data-c="text-disabled" />
      <textarea data-c="textarea"></textarea>
      <select data-c="select"><option>A</option></select>
      <button type="button" style="cursor:grab" data-c="override">Grab</button>
      <wa-button disabled data-c="wa-disabled">Off</wa-button>
      <wa-button data-c="wa-enabled">On</wa-button>`;
    document.body.append(fixture);
    await Promise.all(
      [...fixture.querySelectorAll('wa-button')].map(
        (button) =>
          (button as HTMLElement & { updateComplete: Promise<unknown> })
            .updateComplete,
      ),
    );
    const result: Record<string, string> = {};
    for (const element of fixture.querySelectorAll<HTMLElement>('[data-c]')) {
      const target =
        element.localName === 'wa-button'
          ? element.shadowRoot!.querySelector('[part~="base"]')!
          : element;
      result[element.dataset.c!] = globalThis.getComputedStyle(target).cursor;
    }
    fixture.remove();
    return result;
  });
  expect(cursors).toEqual({
    button: 'pointer',
    'button-disabled': 'not-allowed',
    link: 'pointer',
    'anchor-no-href': 'auto',
    'role-button': 'pointer',
    'role-disabled': 'not-allowed',
    checkbox: 'pointer',
    radio: 'pointer',
    submit: 'pointer',
    'checkbox-disabled': 'not-allowed',
    'checkbox-label': 'pointer',
    text: 'text',
    search: 'text',
    'text-disabled': 'not-allowed',
    textarea: 'text',
    select: 'pointer',
    override: 'grab',
    'wa-disabled': 'not-allowed',
    'wa-enabled': 'pointer',
  });
});

test('data-viewport="locked" pins the app root to the dynamic viewport and clips the document', async ({
  page,
}) => {
  await page.goto('/?component=workbench');
  for (const [width, height] of [
    [1100, 900],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const result = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('#app')!;
      const read = () => {
        const html = globalThis.getComputedStyle(document.documentElement);
        const body = globalThis.getComputedStyle(document.body);
        const app = globalThis.getComputedStyle(root);
        return {
          parentIsBody: root.parentElement === document.body,
          overflow: [html.overflow, body.overflow, app.overflow],
          height: [html.height, body.height, app.height],
        };
      };
      const before = read();
      root.dataset.viewport = 'locked';
      // Content taller than the viewport must not make the document scroll.
      const tall = document.createElement('div');
      tall.style.height = '3000px';
      tall.dataset.lockProbe = '';
      document.body.append(tall);
      globalThis.scrollTo(0, 1000);
      return { before, after: { ...read(), scrollY: globalThis.scrollY } };
    });
    await page.screenshot({
      path: `test-results/document-viewport-locked-${width}.png`,
    });
    await page.evaluate(() => {
      document.querySelector('[data-lock-probe]')!.remove();
      delete document.querySelector<HTMLElement>('#app')!.dataset.viewport;
    });
    expect(result.before.overflow).not.toContain('clip');
    expect(result.after).toEqual({
      parentIsBody: true,
      overflow: ['clip', 'clip', 'clip'],
      height: [`${height}px`, `${height}px`, `${height}px`],
      scrollY: 0,
    });
  }
});
