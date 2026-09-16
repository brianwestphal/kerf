import { computed, type ReadonlySignal, signal } from 'kerfjs';

/**
 * Reactive device-class detection for `@kerfjs/ui` (see `docs/23-app-layouts.md`
 * §2). `deviceClass()` returns a `ReadonlySignal<DeviceClass>` describing the
 * current viewport as a size bucket × orientation × viewport-segment count, so a
 * layout can pick its presentation reactively instead of hand-wiring `matchMedia`.
 *
 * One shared viewport source backs every reader; the pure `classifyViewport`
 * core is DOM-free and directly unit-tested.
 */

export type DeviceSize = 'xs-mobile' | 'mobile' | 'tablet' | 'desktop' | 'xl-desktop';
export type DeviceOrientation = 'portrait' | 'landscape';

/** Minimum widths (px) at which each larger bucket begins. `xs-mobile` is 0. */
export interface DeviceBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  'xl-desktop': number;
}

export interface DeviceClass {
  size: DeviceSize;
  orientation: DeviceOrientation;
  /** Horizontal viewport segments (foldables / dual-screen); 1 on ordinary devices. */
  segments: number;
  /** Vertical viewport segments; 1 on ordinary devices. */
  verticalSegments: number;
  /** Small phones — `xs-mobile` or `mobile`. */
  handset: boolean;
  /** "One pane at a time" — a handset or a portrait tablet. */
  compact: boolean;
  /** True when the current size is `size` or larger, e.g. `atLeast('tablet')`. */
  atLeast(size: DeviceSize): boolean;
}

/** A raw viewport snapshot, before breakpoints are applied. */
export interface Viewport {
  width: number;
  height: number;
  segments: number;
  verticalSegments: number;
}

export interface DeviceClassOptions {
  /** Override any of the default bucket thresholds. */
  breakpoints?: Partial<DeviceBreakpoints>;
  /** The viewport assumed when there is no DOM (SSR). Defaults to 1024×768, one segment. */
  ssr?: Partial<Viewport>;
}

export const DEFAULT_BREAKPOINTS: DeviceBreakpoints = {
  mobile: 360,
  tablet: 720,
  desktop: 1024,
  'xl-desktop': 1440,
};

const SIZE_ORDER: readonly DeviceSize[] = ['xs-mobile', 'mobile', 'tablet', 'desktop', 'xl-desktop'];

const SSR_VIEWPORT: Viewport = { width: 1024, height: 768, segments: 1, verticalSegments: 1 };

/**
 * Classify a raw viewport into a {@link DeviceClass}. Pure and DOM-free — the
 * single source of truth for the bucketing rules.
 */
export function classifyViewport(
  width: number,
  orientation: DeviceOrientation,
  segments = 1,
  verticalSegments = 1,
  breakpoints: DeviceBreakpoints = DEFAULT_BREAKPOINTS,
): DeviceClass {
  const size: DeviceSize =
    width >= breakpoints['xl-desktop']
      ? 'xl-desktop'
      : width >= breakpoints.desktop
        ? 'desktop'
        : width >= breakpoints.tablet
          ? 'tablet'
          : width >= breakpoints.mobile
            ? 'mobile'
            : 'xs-mobile';
  const rank = SIZE_ORDER.indexOf(size);
  return {
    size,
    orientation,
    segments,
    verticalSegments,
    handset: rank <= 1,
    compact: rank <= 1 || (size === 'tablet' && orientation === 'portrait'),
    atLeast: (target) => rank >= SIZE_ORDER.indexOf(target),
  };
}

/** Count viewport segments along one axis, feature-detecting the media query. */
function countSegments(axis: 'horizontal' | 'vertical', view: Window): number {
  const mq = view.matchMedia;
  if (typeof mq !== 'function') return 1;
  for (let n = 4; n >= 2; n--) {
    if (mq.call(view, `(${axis}-viewport-segments: ${n})`).matches) return n;
  }
  return 1;
}

/** Read the current viewport from a browser window. */
function readViewport(view: Window): Viewport {
  return {
    width: view.innerWidth,
    height: view.innerHeight,
    segments: countSegments('horizontal', view),
    verticalSegments: countSegments('vertical', view),
  };
}

/** The browser window, or `undefined` when running without a DOM (SSR). */
function browserWindow(): Window | undefined {
  return typeof window === 'undefined' ? undefined : window;
}

let sharedSource: ReturnType<typeof signal<Viewport>> | undefined;

/**
 * The shared reactive viewport source. Installed lazily on first read and kept
 * for the life of the page — there is only ever one viewport, so a single
 * listener set backs every `deviceClass()` reader.
 */
function viewportSource(view: Window): ReturnType<typeof signal<Viewport>> {
  if (sharedSource) return sharedSource;
  const source = signal(readViewport(view));
  sharedSource = source;
  const update = (): void => {
    source.value = readViewport(view);
  };
  view.addEventListener('resize', update);
  view.addEventListener('orientationchange', update);
  return source;
}

function orientationOf(view: Viewport): DeviceOrientation {
  return view.height > view.width ? 'portrait' : 'landscape';
}

/**
 * A reactive signal of the current {@link DeviceClass}. Reading it inside an
 * `effect`/`computed` re-runs when the viewport crosses a breakpoint, rotates,
 * or changes its segment count. Without a DOM it resolves to `options.ssr`
 * (default 1024×768, landscape, one segment).
 */
export function deviceClass(options: DeviceClassOptions = {}): ReadonlySignal<DeviceClass> {
  const breakpoints: DeviceBreakpoints = { ...DEFAULT_BREAKPOINTS, ...options.breakpoints };
  const view = browserWindow();
  if (!view) {
    const snapshot: Viewport = { ...SSR_VIEWPORT, ...options.ssr };
    return computed(() => classifyViewport(snapshot.width, orientationOf(snapshot), snapshot.segments, snapshot.verticalSegments, breakpoints));
  }
  const source = viewportSource(view);
  return computed(() => {
    const v = source.value;
    return classifyViewport(v.width, orientationOf(v), v.segments, v.verticalSegments, breakpoints);
  });
}
