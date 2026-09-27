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
  /** The rendered `min` prop: every size the wiring commits stays at or above it. */
  min: number;
  /** The rendered `max` prop. */
  declaredMax: number;
  /** The largest size the region can actually show: `declaredMax`, or less when a parent clamps the track. */
  max: number;
  /** The shown size, which a parent clamp can hold below the rendered size. */
  size: number;
  /**
   * The size the track shows when its container squeezes it below `min` (a
   * narrowing Workbench shrinks its resizable rails), otherwise undefined.
   */
  squeezed?: number;
}

/**
 * A composition-specific bound on a region's size, applied after the parent
 * clamp: given the region and its limits, the largest size it may take. A
 * `Workbench` rail uses it to leave the work area its minimum width.
 */
export type ResizeLimit = (
  region: HTMLElement,
  limits: { min: number; max: number },
) => number;

const HANDLE_SELECTOR = '[data-kui-resize-handle]';
const INSET_ATTRIBUTE = 'data-handle-inset';
/** Attributes a re-render can write back over the reported state. */
const REPORTED_ATTRIBUTES = [
  'aria-valuenow',
  'aria-valuemin',
  'aria-valuemax',
  INSET_ATTRIBUTE,
];
/**
 * How far the handle's hit target reaches past the separator (the CSS places
 * the 20px handle at `-10px` on the region's edge).
 */
const HANDLE_OVERHANG = 10;

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

/**
 * Whether the handle must sit inside the region. When a parent clamps the
 * track, the separator reaches the parent's edge, where a clipping ancestor
 * (an app shell, a scroll frame) would cut off the half of the hit target
 * and its focus ring that overhang the region. With less room past the
 * separator than that overhang, the region carries `data-handle-inset`, and
 * the CSS moves the handle and its ring inside.
 */
function handleInset(state: RegionState, size: number) {
  return state.max < state.declaredMax && state.max - size < HANDLE_OVERHANG;
}

function setInset(region: HTMLElement, inset: boolean) {
  if (region.hasAttribute(INSET_ATTRIBUTE) !== inset)
    region.toggleAttribute(INSET_ATTRIBUTE, inset);
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
 * The size the track shows at its rendered size, when that is less than the
 * rendered size: a container that lets the region shrink (a narrowing
 * Workbench squeezes its resizable rails in proportion) can show it below its
 * own minimum. Undefined without layout or when the whole size shows.
 */
function shownSize(
  region: HTMLElement,
  axis: ResizableRegionAxis,
  size: number,
) {
  const basis = Number.parseFloat(
    globalThis.getComputedStyle(region).flexBasis,
  );
  const box = region.getBoundingClientRect();
  const track = axis === 'horizontal' ? box.width : box.height;
  if (!Number.isFinite(basis) || track <= 0 || track >= basis - 0.5)
    return undefined;
  return Math.max(0, Math.floor(track - (basis - size)));
}

/**
 * The separator's reported range and value. A squeezed region reports the
 * size it actually shows as its value and pins its minimum and maximum there:
 * WAI-ARIA requires the value to sit inside the range, and the separator
 * cannot move a track its container holds below the minimum. The configured
 * limits still bound every size the wiring commits.
 */
function reported(state: RegionState) {
  const { squeezed } = state;
  return squeezed === undefined
    ? { min: state.min, max: state.max, now: state.size }
    : { min: squeezed, max: squeezed, now: squeezed };
}

/**
 * Whether the separator cannot move its region: the container squeezes the
 * track below its minimum, or the visible range has collapsed to a single
 * size. A pinned separator commits nothing, so a key press or drag never
 * overwrites the app's remembered size (and its storage) with the limit.
 */
function pinned(state: RegionState) {
  return state.squeezed !== undefined || state.max <= state.min;
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
  // A squeezed region's container holds it where it is, so its reported
  // value stays the squeezed size.
  if (state.squeezed === undefined)
    state.handle.setAttribute('aria-valuenow', String(size));
  setInset(state.region, handleInset(state, size));
}

/**
 * Wire pointer and separator-keyboard behavior for every resizable region
 * below root that matches `regionSelector`. A region carries `data-region-id`,
 * `data-axis`, `data-edge`, `data-collapsed`, and `data-presentation`, sizes
 * its track from `--kui-resizable-region-size`, and owns its separator handle
 * as a direct child. `ResizableRegion` renders that contract, and so does a
 * resizable `Workbench` panel; each public wire passes the selector for the
 * regions it owns, so two wires never drive the same handle. An optional
 * `limit` tightens each region's maximum for its composition.
 */
export function wireResizeHandles(
  root: HTMLElement,
  {
    step = 16,
    largeStep = 64,
    onPreview,
    onCommit,
  }: WireResizableRegionsOptions,
  regionSelector: string,
  limit?: ResizeLimit,
) {
  const REGION_SELECTOR = regionSelector;
  let stopPointer: (() => void) | undefined;
  // The handle announces its visible maximum in aria-valuemax, which hides the
  // rendered `max` prop. Remember it per handle; a re-render that writes a
  // different aria-valuemax than the one announced here supersedes it.
  const announced = new WeakMap<
    HTMLElement,
    {
      declaredMin: number;
      declaredMax: number;
      min: number;
      max: number;
      size: number;
      inset: boolean;
    }
  >();

  function regionState(handle: Element): RegionState | undefined {
    const region = handle.closest<HTMLElement>(REGION_SELECTOR);
    // A handle belongs only to the region it is a direct child of: a region of
    // another kind that merely contains it (a Workbench panel around a nested
    // ResizableRegion, or the reverse) is not the handle's region.
    if (
      !(region instanceof HTMLElement) ||
      !(handle instanceof HTMLElement) ||
      handle.parentElement !== region
    )
      return undefined;
    const id = region.dataset.regionId;
    const axis = region.dataset.axis;
    const edge = region.dataset.edge;
    const valueMin = Number(handle.getAttribute('aria-valuemin'));
    const valueMax = Number(handle.getAttribute('aria-valuemax'));
    const remembered = announced.get(handle);
    // A squeezed region reports a lowered minimum; the rendered one stands
    // until a re-render writes a different value.
    const min =
      remembered?.min === valueMin ? remembered.declaredMin : valueMin;
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
    // The shown size is read before the probe, from the layout already in
    // place, so the probe stays the one forced layout.
    const shown = shownSize(region, axis, size);
    const visible = visibleMax(region, axis, min, declaredMax);
    // A composition bound never takes a region below its own minimum.
    const max = limit
      ? Math.max(min, Math.min(visible, limit(region, { min, max: visible })))
      : visible;
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
      squeezed: shown !== undefined && shown < min ? shown : undefined,
    };
  }

  /**
   * Report what is shown: the visible maximum and the shown size, or the
   * squeezed size a container holds the region at. Nothing is committed — the
   * app's size stays its own until the user resizes.
   */
  function announce(state: RegionState) {
    const inset = handleInset(state, state.size);
    const { min, max, now } = reported(state);
    announced.set(state.handle, {
      declaredMin: state.min,
      declaredMax: state.declaredMax,
      min,
      max,
      size: now,
      inset,
    });
    // Unchanged values are not rewritten, so the observer below never sees
    // its own report as a re-render.
    setAttributeIfChanged(state.handle, 'aria-valuemin', String(min));
    setAttributeIfChanged(state.handle, 'aria-valuemax', String(max));
    setAttributeIfChanged(state.handle, 'aria-valuenow', String(now));
    setInset(state.region, inset);
  }

  const handleOf = (region: HTMLElement) =>
    region.querySelector<HTMLElement>(`:scope > ${HANDLE_SELECTOR}`);

  /** Re-measure a region at rest and report what it shows. */
  function sync(region: HTMLElement) {
    if (!region.isConnected || region.dataset.resizing === 'true') return;
    const handle = handleOf(region);
    const state = handle ? regionState(handle) : undefined;
    if (state) announce(state);
  }

  /** Whether the region still shows the state this wiring last reported. */
  function reportedByUs(region: HTMLElement) {
    const handle = handleOf(region);
    const remembered = handle ? announced.get(handle) : undefined;
    return (
      remembered !== undefined &&
      handle?.getAttribute('aria-valuemin') === String(remembered.min) &&
      handle.getAttribute('aria-valuemax') === String(remembered.max) &&
      handle.getAttribute('aria-valuenow') === String(remembered.size) &&
      region.hasAttribute(INSET_ATTRIBUTE) === remembered.inset
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
            for (const child of target.children)
              if (child.matches(REGION_SELECTOR))
                regions.add(child as HTMLElement);
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
      const target = record.target as HTMLElement;
      const region = target.matches(REGION_SELECTOR)
        ? target
        : target.matches(HANDLE_SELECTOR)
          ? target.parentElement?.matches(REGION_SELECTOR)
            ? target.parentElement
            : null
          : null;
      if (region && !reportedByUs(region)) regions.add(region);
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
      if (pinned(state)) return;
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
      if (pinned(state)) return;
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
