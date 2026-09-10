import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResizableRegion } from '../../src/resizable-region.js';
import { wireResizableRegions } from '../../src/wire-resizable-regions.js';

const roots: HTMLElement[] = [];

function region(axis: 'horizontal' | 'vertical' = 'horizontal', edge: 'start' | 'end' = 'end') {
  const root = document.createElement('div');
  root.innerHTML = String(ResizableRegion({ id: 'panel', label: 'Panel', size: 200, min: 100, max: 300, axis, edge, children: 'Content' as never }));
  document.body.append(root);
  roots.push(root);
  return { root, handle: root.querySelector<HTMLElement>('[data-kui-resize-handle]')! };
}

afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

describe('wireResizableRegions', () => {
  it('supports arrows, shift acceleration, Home, End, and ignores unrelated keys', () => {
    const { root, handle } = region();
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { step: 10, largeStep: 40, onCommit });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 210, source: 'keyboard' });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 170, source: 'keyboard' });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 100, source: 'keyboard' });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 300, source: 'keyboard' });
    const count = onCommit.mock.calls.length;
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onCommit).toHaveBeenCalledTimes(count);
    stop();
  });

  it('maps vertical and start-edge arrows to the visual resize direction', () => {
    const { root, handle } = region('vertical', 'start');
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 184, source: 'keyboard' });
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 200, source: 'keyboard' });
    stop();
  });

  it('previews pointer movement and commits once on release', () => {
    const { root, handle } = region();
    const onPreview = vi.fn();
    const onCommit = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    const stop = wireResizableRegions(root, { onPreview, onCommit });
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 3, clientX: 20, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: 55, bubbles: true }));
    expect(onPreview).toHaveBeenLastCalledWith({ id: 'panel', size: 235, source: 'pointer' });
    expect(handle.getAttribute('aria-valuenow')).toBe('235');
    handle.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 235, source: 'pointer' });
    stop();
  });

  it('handles vertical pointer movement, overlapping drags, and disposal mid-drag', () => {
    const { root, handle } = region('vertical', 'start');
    const onCommit = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 4, clientY: 20, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointermove', { pointerId: 4, clientY: 45, bubbles: true }));
    expect(handle.getAttribute('aria-valuenow')).toBe('175');
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 5, clientY: 45, bubbles: true }));
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 175, source: 'pointer' });
    stop();
    expect(onCommit).toHaveBeenLastCalledWith({ id: 'panel', size: 175, source: 'pointer' });
  });

  it('ignores non-primary pointer input and malformed handles', () => {
    const { root, handle } = region();
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(new PointerEvent('pointerdown', { button: 1, bubbles: true }));
    root.insertAdjacentHTML('beforeend', '<div data-kui-resize-handle tabindex="0"></div>');
    root.lastElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    root.insertAdjacentHTML('beforeend', '<section data-component="resizable-region" data-region-id="bad" data-axis="diagonal" data-edge="middle"><button data-kui-resize-handle aria-valuemin="x" aria-valuemax="y" aria-valuenow="z"></button></section>');
    const malformed = root.lastElementChild!.querySelector('button')!;
    malformed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    malformed.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    expect(onCommit).not.toHaveBeenCalled();
    stop();
  });
});
