import { describe, expect, it } from 'vitest';

import { phoneSubmenuPosition } from '../../src/shared/popup/position-popup.js';

const rect = (left: number, top: number, width: number, height: number) =>
  new DOMRect(left, top, width, height);

describe('phoneSubmenuPosition', () => {
  it('places a fitting submenu below the whole parent menu', () => {
    expect(
      phoneSubmenuPosition(
        rect(30, 100, 180, 180),
        rect(0, 0, 160, 120),
        { width: 390, height: 844 },
        false,
      ),
    ).toEqual({
      left: 30,
      top: 284,
      maxHeight: 552,
      maxWidth: 374,
      placement: 'bottom-start',
    });
  });

  it('moves above when the bottom space is too short', () => {
    expect(
      phoneSubmenuPosition(
        rect(190, 550, 180, 100),
        rect(0, 0, 220, 240),
        { width: 390, height: 844 },
        false,
      ),
    ).toEqual({
      left: 162,
      top: 306,
      maxHeight: 538,
      maxWidth: 374,
      placement: 'top-start',
    });
  });

  it('constrains a tall, wide submenu to the larger available side', () => {
    expect(
      phoneSubmenuPosition(
        rect(250, 130, 180, 220),
        rect(0, 0, 500, 700),
        { width: 390, height: 568 },
        false,
      ),
    ).toEqual({
      left: 8,
      top: 354,
      maxHeight: 206,
      maxWidth: 374,
      placement: 'bottom-start',
    });
  });

  it('anchors at the logical end in RTL while staying in the viewport', () => {
    expect(
      phoneSubmenuPosition(
        rect(20, 100, 180, 120),
        rect(0, 0, 140, 80),
        { width: 390, height: 844 },
        true,
      ).left,
    ).toBe(60);
  });
});
