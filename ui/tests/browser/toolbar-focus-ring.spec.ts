import { expect, test } from '@playwright/test';

test('focused controls paint a complete ring in every Toolbar zone', async ({
  page,
}) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?component=toolbar');
    const specimen = page.locator('[data-demo-toolbar-focus-zones]');
    const viewport = specimen.locator('[data-catalog-example-viewport]');

    for (const [zoneName, action] of [
      ['leading', 'Leading action'],
      ['center', 'Center action'],
      ['trailing', 'Trailing action'],
    ] as const) {
      const zone = viewport.locator(`.kui-toolbar__${zoneName}`);
      const button = zone.getByRole('button', { name: action });
      await button.focus();
      await expect(button).toBeFocused();

      const geometry = await zone.evaluate((element) => {
        const group = element.querySelector<HTMLElement>(
          '.kui-toolbar-control-group',
        )!;
        const groupBox = group.getBoundingClientRect();
        const zoneBox = element.getBoundingClientRect();
        const style = globalThis.getComputedStyle(group);
        const zoneStyle = globalThis.getComputedStyle(element);
        return {
          groupLeft: groupBox.left,
          groupCenterY: groupBox.top + groupBox.height / 2,
          zoneLeft: zoneBox.left,
          outlineColor: style.outlineColor,
          outlineWidth: Number.parseFloat(style.outlineWidth),
          outlineOffset: Number.parseFloat(style.outlineOffset),
          overflow: zoneStyle.overflow,
          clipMargin: Number.parseFloat(zoneStyle.overflowClipMargin),
        };
      });
      expect(geometry.outlineWidth).toBeGreaterThanOrEqual(3);
      if (zoneName === 'leading') {
        expect(geometry.groupLeft).toBeCloseTo(geometry.zoneLeft, 0);
        expect(geometry.overflow).toBe('clip');
        expect(geometry.clipMargin).toBeGreaterThanOrEqual(
          geometry.outlineWidth + geometry.outlineOffset,
        );
      }

      const bounds = await viewport.boundingBox();
      expect(bounds).not.toBeNull();
      const png = await viewport.screenshot({
        scale: 'css',
        path: `test-results/toolbar-focus-${zoneName}-${width}.png`,
      });
      if (width === 390)
        await page.screenshot({
          path: `test-results/toolbar-focus-${zoneName}-390-context.png`,
        });
      const samples = await page.evaluate(
        async ({ bytes, x, y }) => {
          const bitmap = await globalThis.createImageBitmap(
            new globalThis.Blob([new Uint8Array(bytes)], { type: 'image/png' }),
          );
          const canvas = globalThis.document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d')!;
          context.drawImage(bitmap, 0, 0);
          const data = context.getImageData(x, y, 4, 5).data;
          const colors: number[][] = [];
          for (let index = 0; index < data.length; index += 4)
            colors.push([...data.slice(index, index + 3)]);
          return colors;
        },
        {
          bytes: [...png],
          x: Math.floor(geometry.groupLeft - bounds!.x - 4),
          y: Math.floor(geometry.groupCenterY - bounds!.y - 2),
        },
      );
      const expected = geometry.outlineColor.match(/\d+/g)?.slice(0, 3);
      expect(expected).toHaveLength(3);
      const closestColorDistance = Math.min(
        ...samples.map((sample) =>
          sample.reduce(
            (distance, value, channel) =>
              distance + Math.abs(value - Number(expected![channel])),
            0,
          ),
        ),
      );
      expect(closestColorDistance, `${zoneName} ring paint`).toBeLessThan(40);
    }
  }
});
