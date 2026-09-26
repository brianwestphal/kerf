import { delegate } from 'kerfjs';

import {
  clampRegionSize,
  type ResizableRegionAxis,
  type ResizableRegionEdge,
  resizeRegionFromPointer,
} from './resizable-region.js';

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
  /** The rendered `max` prop. */
  declaredMax: number;
  /** The largest size the region can actually show: `declaredMax`, or less when a parent clamps the track. */
  max: number;
  /** The shown size, which a parent clamp can hold below the rendered size. */
  size: number;
}

const REGION_SELECTOR = '[data-component="resizable-region"]';
const HANDLE_SELECTOR = '[data-kui-resize-handle]';
/** Handle attributes a re-render can write back over the reported values. */
const REPORTED_ATTRIBUTES = ['aria-valuenow', 'aria-valuemax'];

/**
 * The size the region renders or was last resized to. The track's custom
 * property is the source, not aria-valuenow, which reports the shown size and
 * can sit below the rendered size while a parent clamps the track.
 */
function renderedSize(region: HTMLElement, handle: HTMLElement) {
  const size = Number.parseFloat(
    region.style.getPropertyValue('--kui-resizable-region-size'),
  );
  return Number.isFinite(size)
    ? size
    : Number(handle.getAttribute('aria-valuenow'));
}

function setAttributeIfChanged(
  element: HTMLElement,
  name: string,
  value: string,
) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/**
 * The largest size a parent lets the region show. The track is
 * `size + edge extent` (its flex basis), but a parent may clamp it (a
 * `max-width: 100%` stage, a narrow container). Probing the track at the
 * declared maximum for one synchronous layout read measures how much of that
 * size is visible; the probe is restored before anything paints. Without
 * layout (no box yet, or an `auto` basis under a responsive fill) the declared
 * maximum stands.
 */
function visibleMax(
  region: HTMLElement,
  axis: ResizableRegionAxis,
  min: number,
  max: number,
) {
  const property = '--kui-resizable-region-size';
  const previous = region.style.getPropertyValue(property);
  region.style.setProperty(property, `${max}px`);
  const basis = Number.parseFloat(
    globalThis.getComputedStyle(region).flexBasis,
  );
  const box = region.getBoundingClientRect();
  region.style.setProperty(property, previous);
  const track = axis === 'horizontal' ? box.width : box.height;
  if (!Number.isFinite(basis) || track <= 0 || track >= basis - 0.5) return max;
  return Math.max(min, Math.min(max, Math.floor(track - (basis - max))));
}

/**
 * Apply a live size to an expanded region before the app commits it. The
 * collapse-motion content keeps a fixed width from the expanded size so its
 * slide reads as a slide, not a squeeze; it has to follow the live size too, or
 * the content stays at the previous width until the app re-renders.
 */
function applySize(state: RegionState, size: number) {
  const value = `${size}px`;
  state.region.style.setProperty('--kui-resizable-region-size', value);
  state.region.style.setProperty('--kui-resizable-region-expanded-size', value);
  state.handle.setAttribute('aria-valuenow', String(size));
}

/** Wire pointer and separator-keyboard behavior for every ResizableRegion below root. */
export function wireResizableRegions(
  root: HTMLElement,
  {
    step = 16,
    largeStep = 64,
    onPreview,
    onCommit,
  }: WireResizableRegionsOptions,
) {
  let stopPointer: (() => void) | undefined;
  // The handle announces its visible maximum in aria-valuemax, which hides the
  // rendered `max` prop. Remember it per handle; a re-render that writes a
  // different aria-valuemax than the one announced here supersedes it.
  const announced = new WeakMap<
    HTMLElement,
    { declaredMax: number; max: number; size: number }
  >();

  function regionState(handle: Element): RegionState | undefined {
    const region = handle.closest<HTMLElement>(REGION_SELECTOR);
    if (!(region instanceof HTMLElement) || !(handle instanceof HTMLElement))
      return undefined;
    const id = region.dataset.regionId;
    const axis = region.dataset.axis;
    const edge = region.dataset.edge;
    const min = Number(handle.getAttribute('aria-valuemin'));
    const valueMax = Number(handle.getAttribute('aria-valuemax'));
    const remembered = announced.get(handle);
    const declaredMax =
      remembered?.max === valueMax ? remembered.declaredMax : valueMax;
    const size = renderedSize(region, handle);
    if (
      !id ||
      region.dataset.collapsed === 'true' ||
      region.dataset.presentation !== 'inline' ||
      (axis !== 'horizontal' && axis !== 'vertical') ||
      (edge !== 'start' && edge !== 'end') ||
      !Number.isFinite(min) ||
      !Number.isFinite(declaredMax) ||
      !Number.isFinite(size)
    )
      return undefined;
    const max = visibleMax(region, axis, min, declaredMax);
    return {
      region,
      handle,
      id,
      axis,
      edge,
      min,
      declaredMax,
      max,
      size: clampRegionSize(size, min, max),
    };
  }

  /**
   * Report what is shown: the visible maximum and the shown size. Nothing is
   * committed — the app's size stays its own until the user resizes.
   */
  function announce(state: RegionState) {
    announced.set(state.handle, {
      declaredMax: state.declaredMax,
      max: state.max,
      size: state.size,
    });
    // Unchanged values are not rewritten, so the observer below never sees
    // its own report as a re-render.
    setAttributeIfChanged(state.handle, 'aria-valuemax', String(state.max));
    setAttributeIfChanged(state.handle, 'aria-valuenow', String(state.size));
  }

  /** Re-measure a region at rest and report what it shows. */
  function sync(region: HTMLElement) {
    if (!region.isConnected || region.dataset.resizing === 'true') return;
    const handle = region.querySelector<HTMLElement>(
      `:scope > ${HANDLE_SELECTOR}`,
    );
    const state = handle ? regionState(handle) : undefined;
    if (state) announce(state);
  }

  /** Whether the handle still shows the values this wiring last reported. */
  function reportedByUs(handle: HTMLElement) {
    const remembered = announced.get(handle);
    return (
      remembered !== undefined &&
      handle.getAttribute('aria-valuemax') === String(remembered.max) &&
      handle.getAttribute('aria-valuenow') === String(remembered.size)
    );
  }

  // Keep the reported values current without a focus or an interaction.
  // A ResizeObserver on every region and its parent re-measures when the
  // space changes (a narrowed viewport, a parent that grows back); a
  // MutationObserver catches a re-render that writes the rendered props back
  // over the reported values, and regions a re-render adds or removes. Both
  // measure once per affected region per batch, after layout or in a
  // microtask, never per frame.
  const observed = new Set<Element>();
  const resizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          const regions = new Set<HTMLElement>();
          for (const { target } of entries) {
            if (target.matches(REGION_SELECTOR))
              regions.add(target as HTMLElement);
            for (const child of target.querySelectorAll<HTMLElement>(
              `:scope > ${REGION_SELECTOR}`,
            ))
              regions.add(child);
          }
          for (const region of regions) sync(region);
        })
      : undefined;

  /** Observe every region below root and its parent; release the rest. */
  function observeRegions() {
    if (!resizeObserver) return;
    const wanted = new Set<Element>();
    for (const region of root.querySelectorAll(REGION_SELECTOR)) {
      wanted.add(region);
      // A region found below root always has a parent element.
      wanted.add(region.parentElement as Element);
    }
    for (const element of observed)
      if (!wanted.has(element)) {
        resizeObserver.unobserve(element);
        observed.delete(element);
      }
    for (const element of wanted)
      if (!observed.has(element)) {
        resizeObserver.observe(element);
        observed.add(element);
      }
  }

  const mutationObserver = new MutationObserver((records) => {
    const regions = new Set<HTMLElement>();
    let structural = false;
    for (const record of records) {
      if (record.type === 'childList') {
        structural = true;
        continue;
      }
      const handle = record.target as HTMLElement;
      if (!handle.matches(HANDLE_SELECTOR) || reportedByUs(handle)) continue;
      const region = handle.closest<HTMLElement>(REGION_SELECTOR);
      if (region) regions.add(region);
    }
    // Newly observed regions are measured by the ResizeObserver's first
    // notification.
    if (structural) observeRegions();
    for (const region of regions) sync(region);
  });
  mutationObserver.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: REPORTED_ATTRIBUTES,
  });
  observeRegions();

  /**
   * Commit a size, then re-announce: an app that re-renders the committed
   * size synchronously writes the rendered `max` prop back to aria-valuemax.
   */
  function commit(state: RegionState, change: ResizeCommit) {
    onCommit(change);
    const settled = state.handle.isConnected
      ? regionState(state.handle)
      : undefined;
    if (settled) announce(settled);
  }

  const stopFocus = delegate(
    root,
    'focusin',
    HANDLE_SELECTOR,
    (_event, handle) => {
      const state = regionState(handle);
      if (state) announce(state);
    },
  );

  const stopKeydown = delegate(
    root,
    'keydown',
    HANDLE_SELECTOR,
    (event, handle) => {
      const keyboardEvent = event as KeyboardEvent;
      const state = regionState(handle);
      if (!state) return;
      announce(state);
      let next: number | undefined;
      if (keyboardEvent.key === 'Home') next = state.min;
      if (keyboardEvent.key === 'End') next = state.max;
      const increment = keyboardEvent.shiftKey ? largeStep : step;
      if (state.axis === 'horizontal' && keyboardEvent.key === 'ArrowLeft')
        next = resizeRegionFromPointer(state.size, -increment, state.edge);
      if (state.axis === 'horizontal' && keyboardEvent.key === 'ArrowRight')
        next = resizeRegionFromPointer(state.size, increment, state.edge);
      if (state.axis === 'vertical' && keyboardEvent.key === 'ArrowUp')
        next = resizeRegionFromPointer(state.size, -increment, state.edge);
      if (state.axis === 'vertical' && keyboardEvent.key === 'ArrowDown')
        next = resizeRegionFromPointer(state.size, increment, state.edge);
      if (next === undefined) return;
      keyboardEvent.preventDefault();
      const size = clampRegionSize(next, state.min, state.max);
      applySize(state, size);
      commit(state, { id: state.id, size, source: 'keyboard' });
    },
  );

  const stopPointerDown = delegate(
    root,
    'pointerdown',
    HANDLE_SELECTOR,
    (event, handle) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.button !== 0) return;
      const state = regionState(handle);
      if (!state) return;
      pointerEvent.preventDefault();
      announce(state);
      state.handle.setPointerCapture?.(pointerEvent.pointerId);
      const startCoordinate =
        state.axis === 'horizontal'
          ? pointerEvent.clientX
          : pointerEvent.clientY;
      let next = state.size;
      const move = (moveEvent: PointerEvent) => {
        const coordinate =
          state.axis === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        next = clampRegionSize(
          resizeRegionFromPointer(
            state.size,
            coordinate - startCoordinate,
            state.edge,
          ),
          state.min,
          state.max,
        );
        applySize(state, next);
        onPreview?.({ id: state.id, size: next, source: 'pointer' });
      };
      const finish = () => {
        root.removeEventListener('pointermove', move);
        root.removeEventListener('pointerup', finish);
        root.removeEventListener('pointercancel', finish);
        stopPointer = undefined;
        delete state.region.dataset.resizing;
        commit(state, { id: state.id, size: next, source: 'pointer' });
      };
      stopPointer?.();
      stopPointer = finish;
      state.region.dataset.resizing = 'true';
      root.addEventListener('pointermove', move);
      root.addEventListener('pointerup', finish, { once: true });
      root.addEventListener('pointercancel', finish, { once: true });
    },
  );

  return () => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    observed.clear();
    stopPointer?.();
    stopFocus();
    stopKeydown();
    stopPointerDown();
  };
}
