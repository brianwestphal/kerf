import { delegate } from 'kerfjs';

import { clampRegionSize, type ResizableRegionAxis, type ResizableRegionEdge, resizeRegionFromPointer } from './resizable-region.js';

export interface ResizeCommit {
  id: string;
  size: number;
  source: 'keyboard' | 'pointer';
}

export interface WireResizableRegionsOptions {
  step?: number;
  largeStep?: number;
  onPreview?: (change: ResizeCommit) => void;
  onCommit: (change: ResizeCommit) => void;
}

interface RegionState {
  region: HTMLElement;
  handle: HTMLElement;
  id: string;
  axis: ResizableRegionAxis;
  edge: ResizableRegionEdge;
  min: number;
  max: number;
  size: number;
}

function regionState(handle: Element): RegionState | undefined {
  const region = handle.closest<HTMLElement>('[data-component="resizable-region"]');
  if (!(region instanceof HTMLElement) || !(handle instanceof HTMLElement)) return undefined;
  const id = region.dataset.regionId;
  const axis = region.dataset.axis;
  const edge = region.dataset.edge;
  const min = Number(handle.getAttribute('aria-valuemin'));
  const max = Number(handle.getAttribute('aria-valuemax'));
  const size = Number(handle.getAttribute('aria-valuenow'));
  if (!id || (axis !== 'horizontal' && axis !== 'vertical') || (edge !== 'start' && edge !== 'end') || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(size)) return undefined;
  return { region, handle, id, axis, edge, min, max, size };
}

function preview(state: RegionState, size: number, onPreview?: (change: ResizeCommit) => void) {
  const next = clampRegionSize(size, state.min, state.max);
  state.region.style.setProperty('--kui-resizable-region-size', `${next}px`);
  state.handle.setAttribute('aria-valuenow', String(next));
  onPreview?.({ id: state.id, size: next, source: 'pointer' });
  return next;
}

/** Wire pointer and separator-keyboard behavior for every ResizableRegion below root. */
export function wireResizableRegions(root: HTMLElement, { step = 16, largeStep = 64, onPreview, onCommit }: WireResizableRegionsOptions) {
  let stopPointer: (() => void) | undefined;

  const stopKeydown = delegate(root, 'keydown', '[data-kui-resize-handle]', (event, handle) => {
    const keyboardEvent = event as KeyboardEvent;
    const state = regionState(handle);
    if (!state) return;
    let next: number | undefined;
    if (keyboardEvent.key === 'Home') next = state.min;
    if (keyboardEvent.key === 'End') next = state.max;
    const increment = keyboardEvent.shiftKey ? largeStep : step;
    if (state.axis === 'horizontal' && keyboardEvent.key === 'ArrowLeft') next = resizeRegionFromPointer(state.size, -increment, state.edge);
    if (state.axis === 'horizontal' && keyboardEvent.key === 'ArrowRight') next = resizeRegionFromPointer(state.size, increment, state.edge);
    if (state.axis === 'vertical' && keyboardEvent.key === 'ArrowUp') next = resizeRegionFromPointer(state.size, -increment, state.edge);
    if (state.axis === 'vertical' && keyboardEvent.key === 'ArrowDown') next = resizeRegionFromPointer(state.size, increment, state.edge);
    if (next === undefined) return;
    keyboardEvent.preventDefault();
    const size = clampRegionSize(next, state.min, state.max);
    state.region.style.setProperty('--kui-resizable-region-size', `${size}px`);
    state.handle.setAttribute('aria-valuenow', String(size));
    onCommit({ id: state.id, size, source: 'keyboard' });
  });

  const stopPointerDown = delegate(root, 'pointerdown', '[data-kui-resize-handle]', (event, handle) => {
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.button !== 0) return;
    const state = regionState(handle);
    if (!state) return;
    pointerEvent.preventDefault();
    state.handle.setPointerCapture?.(pointerEvent.pointerId);
    const startCoordinate = state.axis === 'horizontal' ? pointerEvent.clientX : pointerEvent.clientY;
    let next = state.size;
    const move = (moveEvent: PointerEvent) => {
      const coordinate = state.axis === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      next = preview(state, resizeRegionFromPointer(state.size, coordinate - startCoordinate, state.edge), onPreview);
    };
    const finish = () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', finish);
      root.removeEventListener('pointercancel', finish);
      stopPointer = undefined;
      onCommit({ id: state.id, size: next, source: 'pointer' });
    };
    stopPointer?.();
    stopPointer = finish;
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', finish, { once: true });
    root.addEventListener('pointercancel', finish, { once: true });
  });

  return () => {
    stopPointer?.();
    stopKeydown();
    stopPointerDown();
  };
}
