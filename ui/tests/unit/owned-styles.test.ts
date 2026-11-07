// KF-Z6T0RS: the shared owned-inline-style restore DialogSurface and
// wirePinnablePopover use across a re-render.
import { describe, expect, it } from 'vitest';

import {
  restoreOwnedStyles,
  watchOwnedStyles,
} from '../../src/shared/dom/owned-styles.js';

const settle = () =>
  new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));

describe('owned inline styles', () => {
  it('re-applies only the owned properties an element lost', () => {
    const element = document.createElement('div');
    element.style.setProperty('--a', '1px');
    element.style.setProperty('color', 'red');
    restoreOwnedStyles(
      element,
      new Map([
        ['--a', '2px'],
        ['--b', '3px'],
      ]),
    );
    expect(element.style.getPropertyValue('--a')).toBe('2px');
    expect(element.style.getPropertyValue('--b')).toBe('3px');
    expect(element.style.getPropertyValue('color')).toBe('red');
  });

  it('restores after a morph rewrites style, reading the map live, in order', async () => {
    const element = document.createElement('div');
    document.body.append(element);
    const owned = new Map<string, string>();
    const calls: string[] = [];
    const observer = watchOwnedStyles(element, owned, {
      attributes: ['data-pinned'],
      beforeRestore: () =>
        calls.push(`before:${element.style.getPropertyValue('--x')}`),
      afterRestore: () =>
        calls.push(`after:${element.style.getPropertyValue('--x')}`),
    });
    owned.set('--x', '10px');
    element.setAttribute('style', '');
    await settle();
    expect(element.style.getPropertyValue('--x')).toBe('10px');
    // The restore's own write is observed once more and then settles.
    expect(calls.slice(0, 2)).toEqual(['before:', 'after:10px']);
    // A watched non-style attribute also triggers a restore.
    element.setAttribute('style', '');
    observer.takeRecords();
    element.setAttribute('data-pinned', '');
    await settle();
    expect(element.style.getPropertyValue('--x')).toBe('10px');
    observer.disconnect();
    element.setAttribute('style', '');
    await settle();
    expect(element.style.getPropertyValue('--x')).toBe('');
    element.remove();
  });
});
