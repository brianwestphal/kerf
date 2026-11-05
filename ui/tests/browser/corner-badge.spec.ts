import { expect, type Locator, test } from '@playwright/test';

// A corner Badge straddles its control's top-trailing corner, out of the pointer's way, and out of the accessible name
// unless the control names it.
async function cornerGeometry(control: Locator) {
  return control.evaluate((element) => {
    const badge = element.querySelector<HTMLElement>(
      '.kui-badge[data-placement="corner"]',
    )!;
    const box = element.getBoundingClientRect();
    const mark = badge.getBoundingClientRect();
    return {
      top: mark.top - box.top,
      right: box.right - mark.right,
      // It straddles the corner: at most 4px outside the control's box.
      inside:
        mark.left >= box.left &&
        mark.right <= box.right + 4.5 &&
        mark.top >= box.top - 4.5 &&
        mark.bottom <= box.bottom,
      pointer: globalThis.getComputedStyle(badge).pointerEvents,
    };
  });
}

test('corner badges pin to the top-trailing corner of an icon-only Button', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=button');
    const messages = page.locator('[data-demo-badge="count"]');
    await expect(messages).toHaveAccessibleName('Messages, 4 unread');
    await expect(messages.locator('.kui-badge')).toHaveText('4');
    const count = await cornerGeometry(messages);
    expect(count.inside).toBe(true);
    // 4px past the padding box, so 3px past a bordered control's edge.
    expect(count.right).toBeGreaterThanOrEqual(-4.5);
    expect(count.right).toBeLessThanOrEqual(-2.5);
    const dot = page.locator('[data-demo-badge="dot"]');
    await expect(dot).toHaveAccessibleName('Downloads, new download');
    expect((await cornerGeometry(dot)).inside).toBe(true);
  }
});

// KF-HDQTVV: ToolbarButton `badge` pins a decorative count, hidden at 0 and
// capped at 99+, overlapping only the icon's top row and ringed in the group's
// surface, at default and compact sizes, wide and narrow.
async function toolbarBadges(group: Locator) {
  return group.evaluate((element) =>
    [...element.querySelectorAll<HTMLButtonElement>(':scope > button')].map(
      (button) => {
        const badge = button.querySelector<HTMLElement>(
          ':scope > .kui-badge[data-placement="corner"]',
        );
        const icon = button.querySelector('svg')!.getBoundingClientRect();
        const box = button.getBoundingClientRect();
        if (!badge) return { key: button.dataset.demoBadgeCount, badge: null };
        const mark = badge.getBoundingClientRect();
        const style = globalThis.getComputedStyle(badge);
        return {
          key: button.dataset.demoBadgeCount,
          badge: {
            text: badge.textContent,
            ariaHidden: badge.getAttribute('aria-hidden'),
            pointer: style.pointerEvents,
            ring: style.boxShadow,
            height: mark.height,
            // How far the pill reaches into the icon from its top edge.
            iconOverlap: mark.bottom - icon.top,
            rightOutside: mark.right - box.right,
            topOutside: box.top - mark.top,
          },
        };
      },
    ),
  );
}

async function expectToolbarBadges(group: Locator) {
  const [inbox, workers, alerts, dot] = await toolbarBadges(group);
  expect(inbox).toEqual({ key: '0', badge: null });
  for (const item of [workers, alerts]) {
    expect(item.badge).not.toBeNull();
    const badge = item.badge!;
    expect(badge.ariaHidden).toBe('true');
    expect(badge.pointer).toBe('none');
    expect(badge.height).toBeCloseTo(16, 0);
    // Overlaps the icon's top-trailing corner without covering its body.
    expect(badge.iconOverlap).toBeGreaterThan(0);
    expect(badge.iconOverlap).toBeLessThanOrEqual(2.5);
    expect(badge.rightOutside).toBeLessThanOrEqual(4.5);
    expect(badge.topOutside).toBeGreaterThan(0);
    // A 2px ring separates it from the icon and the group's border.
    expect(badge.ring).toMatch(/0px 0px 0px 2px/);
  }
  expect(workers.badge!.text).toBe('2');
  expect(alerts.badge!.text).toBe('99+');
  expect(dot.badge!.text).toBe('');
  expect(dot.badge!.ariaHidden).toBe('true');
}

test('toolbar buttons carry a corner count badge at default and compact sizes, wide and narrow', async ({
  page,
}) => {
  await page.goto('/?component=toolbar-control-group');
  const groups = page.locator('[data-demo-corner-count]');
  await expect(groups).toHaveCount(2);
  await expect(
    page.locator(
      '[data-demo-corner-count="default"] [data-demo-badge-count="2"]',
    ),
  ).toHaveAccessibleName('Workers, 2 live');
  for (const width of [1280, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const size of ['default', 'compact']) {
      const group = page.locator(`[data-demo-corner-count="${size}"]`);
      await group.scrollIntoViewIfNeeded();
      await expectToolbarBadges(group);
      // Nothing clips it: the group and its toolbar keep overflow visible.
      const clipped = await group.evaluate((element) => {
        const badge = element.querySelector('.kui-badge')!;
        const mark = badge.getBoundingClientRect();
        for (
          let node = badge.parentElement;
          node && node !== document.body;
          node = node.parentElement
        ) {
          const style = globalThis.getComputedStyle(node);
          if (style.overflow === 'visible' && style.clipPath === 'none')
            continue;
          const box = node.getBoundingClientRect();
          if (mark.top < box.top || mark.right > box.right) return true;
        }
        return false;
      });
      expect(clipped).toBe(false);
    }
  }
});
