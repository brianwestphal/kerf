import { expect, test } from '@playwright/test';

test('trailing sibling groups yield and return across expansion and compact width', async ({
  page,
}) => {
  await page.goto('/?component=toolbar');
  await page.evaluate(() => {
    const source = document.querySelector<HTMLElement>(
      '[data-demo-toolbar-overflow="trailing-priority"] .kui-toolbar',
    )!;
    const host = document.createElement('div');
    host.dataset.toolbarYieldFixture = 'true';
    host.style.width = '640px';
    host.append(source.cloneNode(true));
    document.body.append(host);
  });
  const host = page.locator('[data-toolbar-yield-fixture]');
  const inspect = async (width: number, expanded: boolean) => {
    await host.evaluate(
      (node, state) => {
        (node as HTMLElement).style.width = `${state.width}px`;
        node.querySelector<HTMLElement>(
          '.kui-toolbar__trailing .kui-toolbar-control-group[data-content="search"]',
        )!.dataset.expanded = String(state.expanded);
      },
      { width, expanded },
    );
    return host.evaluate((node) => {
      const trailing = node.querySelector<HTMLElement>(
        '.kui-toolbar__trailing',
      )!;
      const search = trailing.querySelector<HTMLElement>(
        '.kui-toolbar-control-group[data-content="search"]',
      )!;
      const siblings = Array.from(
        trailing.querySelectorAll<HTMLElement>(
          '.kui-toolbar-control-group[data-visibility="yield-to-expanded-sibling"]',
        ),
      );
      return {
        searchWidth: search.getBoundingClientRect().width,
        trailingWidth: trailing.getBoundingClientRect().width,
        siblingDisplays: siblings.map(
          (group) => window.getComputedStyle(group).display,
        ),
        leadingDisplay: window.getComputedStyle(
          node.querySelector<HTMLElement>('.kui-toolbar__leading')!,
        ).display,
      };
    });
  };

  expect((await inspect(640, true)).siblingDisplays).toEqual(['flex', 'flex']);
  await host.screenshot({
    path: 'test-results/toolbar-yield-expanded-640.png',
  });
  // Container queries measure the toolbar content box, after its 8px insets.
  expect((await inspect(497, true)).siblingDisplays).toEqual(['flex', 'flex']);
  const compact = await inspect(496, true);
  expect(compact.siblingDisplays).toEqual(['none', 'none']);
  expect(compact.searchWidth).toBeCloseTo(compact.trailingWidth, 0);
  expect(compact.leadingDisplay).not.toBe('none');
  await host.screenshot({
    path: 'test-results/toolbar-yield-expanded-496.png',
  });

  const collapsed = await inspect(496, false);
  expect(collapsed.siblingDisplays).toEqual(['flex', 'flex']);

  expect((await inspect(390, true)).siblingDisplays).toEqual(['none', 'none']);
  expect((await inspect(640, true)).siblingDisplays).toEqual(['flex', 'flex']);
  await host.evaluate((node) => node.remove());
});
