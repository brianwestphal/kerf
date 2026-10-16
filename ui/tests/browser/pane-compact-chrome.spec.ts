import { expect, test } from '@playwright/test';

// A Pane's compactChrome applies only inside a container presenting
// compactly: a NavStack view, a TabNavigator scene, a full-screen dialog, or a
// Workbench at its compact width. Each context is built from the production
// classes on the catalog page, which loads the production CSS.
const contexts = {
  'nav-stack view': (pane: string) =>
    `<div class="kui-nav-stack__view" style="height:300px">${pane}</div>`,
  'tab scene': (pane: string) =>
    `<div class="kui-tab-scaffold__scene" style="height:300px">${pane}</div>`,
  'full-screen dialog': (pane: string) =>
    `<div class="kui-dialog-surface" data-presentation="fullscreen" style="height:300px">${pane}</div>`,
  'compact workbench': (pane: string) =>
    `<div class="kui-workbench" style="width:400px;height:300px">${pane}</div>`,
  'roomy workbench': (pane: string) =>
    `<div class="kui-workbench" style="width:800px;height:300px">${pane}</div>`,
  'no container': (pane: string) => `<div style="height:300px">${pane}</div>`,
} as const;

const pane = (open: boolean) =>
  `<div class="kui-pane" data-component="pane" data-compact-header="overlay" data-compact-footer="scroll"${open ? ' data-compact-header-open=""' : ''} style="height:300px"><div class="kui-pane__header" style="height:40px">Filters</div><div class="kui-pane__content kui-content"><div style="height:600px">Rows</div></div><div class="kui-pane__footer" style="height:40px">Status</div></div>`;

test('compactChrome applies in compact containers and nowhere else', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/?component=pane');
  for (const [name, wrap] of Object.entries(contexts)) {
    const compact = !['roomy workbench', 'no container'].includes(name);
    for (const open of [false, true]) {
      const result = await page.evaluate(
        async (markup) => {
          const host = document.createElement('div');
          host.style.cssText = 'position:fixed;inset:0 auto auto 0;z-index:9';
          host.innerHTML = markup;
          document.body.append(host);
          // Firefox resolves a container query a frame late, so let the
          // chrome's show/hide transition settle before measuring.
          await new Promise((resolve) => globalThis.setTimeout(resolve, 350));
          const paneEl = host.querySelector<HTMLElement>('.kui-pane')!;
          const header =
            paneEl.querySelector<HTMLElement>('.kui-pane__header')!;
          const footer =
            paneEl.querySelector<HTMLElement>('.kui-pane__footer')!;
          const content =
            paneEl.querySelector<HTMLElement>('.kui-pane__content')!;
          paneEl.scrollTop = 0;
          const shortFooterTop =
            footer.getBoundingClientRect().top -
            paneEl.getBoundingClientRect().top;
          const out = {
            paneScrolls:
              globalThis.getComputedStyle(paneEl).overflowY === 'auto',
            headerPosition: globalThis.getComputedStyle(header).position,
            headerVisible:
              globalThis.getComputedStyle(header).visibility === 'visible',
            contentTop:
              content.getBoundingClientRect().top -
              paneEl.getBoundingClientRect().top,
            footerBelowFold: shortFooterTop >= 300,
          };
          host.remove();
          return out;
        },
        wrap(pane(open)),
      );
      if (compact) {
        expect(result, name).toMatchObject({
          paneScrolls: true,
          headerPosition: 'absolute',
          headerVisible: open,
          // The overlay header takes no room: content starts at the top.
          contentTop: 0,
          // The scroll footer comes after the 600px of content.
          footerBelowFold: true,
        });
      } else {
        expect(result, name).toMatchObject({
          paneScrolls: false,
          headerPosition: 'static',
          headerVisible: true,
          contentTop: 40,
          footerBelowFold: false,
        });
      }
    }
  }
});

test('the NavStack Compact Chrome example opens its overlay filters and settles its footer', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=nav-stack');
    const stack = page.locator('#catalog-nav-stack-compact-chrome');
    await stack.scrollIntoViewIfNeeded();
    const pane = stack.locator('.kui-pane').first();
    const header = pane.locator('.kui-pane__header');
    await expect(header).toBeHidden();
    await stack.getByRole('button', { name: 'Show Filters' }).click();
    await expect(header).toBeVisible();
    await expect(header).toHaveText(/unread messages/);
    await stack.getByRole('button', { name: 'Hide Filters' }).click();
    await expect(header).toBeHidden();
    // The footer follows the last message.
    const footer = pane.locator('.kui-pane__footer');
    await pane.evaluate((element) => element.scrollTo(0, element.scrollHeight));
    await expect(footer).toBeInViewport();
    const [last, foot] = await Promise.all([
      pane.locator('.kui-list-item').last().boundingBox(),
      footer.boundingBox(),
    ]);
    expect(foot!.y).toBeGreaterThanOrEqual(last!.y + last!.height - 1);
  }
});
