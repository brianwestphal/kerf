// Play mode's device emulation (KF-R7KXSN: device presets, orientation,
// scale, installed-app safe areas; docs/26-ui-editor.md §11.2, §11.3). A
// preset is data: a device's CSS viewport, its safe areas, and the shape of
// its frame. This module turns a preset and the play bar's choices into the
// frame's layout size and the safe-area tokens the play page sets.
import type { PlaySize } from './play-fit.js';

/** Insets in CSS pixels, by physical side. */
export interface DeviceInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** The play bar's device groups, in menu order. */
export type DeviceKind = 'phone' | 'tablet' | 'desktop' | 'flexible';

/** The mock frame a device draws around its viewport (KF-E8T0AY). */
export type DeviceFrame =
  | 'home-button'
  | 'dynamic-island'
  | 'punch-hole'
  | 'tablet'
  | 'laptop'
  | 'monitor'
  | 'none';

/** A device play mode can emulate. Sizes are CSS pixels, in portrait. */
export interface DevicePreset {
  /** Stable id, remembered per browser. */
  readonly id: string;
  /** The device menu's label. */
  readonly label: string;
  readonly kind: DeviceKind;
  readonly width: number;
  readonly height: number;
  /**
   * The insets an installed (standalone) web app gets, per orientation.
   * Omitted: none (a desktop).
   */
  readonly safeArea?: {
    readonly portrait: DeviceInsets;
    readonly landscape: DeviceInsets;
  };
  /**
   * What a browser tab's own chrome takes from the device, per orientation.
   * Omitted: the safe areas, since a page without `viewport-fit=cover` is
   * laid out inside them.
   */
  readonly browserChrome?: {
    readonly portrait: DeviceInsets;
    readonly landscape: DeviceInsets;
  };
  readonly frame: DeviceFrame;
}

/** A host's presets: added to (or, by id, replacing) the shipped ones, or a function of them. */
export type DevicePresetsOption =
  | readonly DevicePreset[]
  | ((shipped: readonly DevicePreset[]) => readonly DevicePreset[]);

const NONE: DeviceInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const insets = (top: number, right: number, bottom: number, left: number) => ({
  top,
  right,
  bottom,
  left,
});

/*
 * Sources. Each number below names one of these.
 * [devtools] Chrome DevTools' emulated devices, which carry each phone's
 *   CSS viewport and safe-area insets per orientation:
 *   github.com/ChromeDevTools/devtools-frontend, front_end/models/emulation/EmulatedDevices.ts
 * [loaf17] useyourloaf.com/blog/iphone-17-screen-sizes/ (sizes and UIKit
 *   safe-area insets of the iPhone 17 line, read 2026-11-02).
 * [apple-specs] Apple's tech-spec pages (apple.com/<product>/specs/, read
 *   2026-11-02). iPads and MacBook Pros render at 2x, so a CSS pixel is two
 *   device pixels: the viewport is the native resolution halved.
 * [ipad-talk] Apple, "Designing for iPad Pro and Apple Pencil" tech talk
 *   (developer.apple.com/videos/play/tech-talks/209/, 2018): on iPads
 *   without a Home button the status bar takes a 24pt top inset and the home
 *   indicator a 20pt bottom inset, in both orientations.
 * [webkit-fit] WebKit, "Designing Websites for iPhone X"
 *   (webkit.org/blog/7929/): without `viewport-fit=cover` a page is laid
 *   out inside the safe area, so a tab's viewport is the device minus it.
 * [estimate] KF-FNQFPJ: no published source gives the mobile browsers'
 *   toolbar heights, so each preset's `browserChrome` is an estimate of the
 *   toolbars fully expanded (the page's smallest viewport), from community
 *   reports of `innerHeight`. The maintainer accepted estimates over
 *   real-device measurements (2026-11-02).
 *   - Safari on iPhone, bottom tab bar: the status bar on top, and about 100
 *     (address bar and toolbar) above the home indicator in portrait. In
 *     landscape, a compact address bar of about 50 on top.
 *   - Safari on iPad: about 50 of tab and address bar under the status bar.
 *   - Chrome for Android: a 56 toolbar under the status bar, and about 24 of
 *     gesture bar at the bottom.
 */

/** The devices play mode ships with (docs/26-ui-editor.md §11.2). */
export const SHIPPED_DEVICE_PRESETS: readonly DevicePreset[] = [
  {
    id: 'iphone-se',
    label: 'iPhone SE',
    kind: 'phone',
    // 375×667 [devtools "iPhone SE"; loaf17 lists SE 2nd/3rd gen].
    width: 375,
    height: 667,
    // The 20pt status bar of Home-button iPhones, which a standalone app with
    // a translucent status bar runs beneath. The status bar hides in
    // landscape. [devtools omits this preset's insets]
    safeArea: { portrait: insets(20, 0, 0, 0), landscape: NONE },
    // [estimate] Portrait: the status bar, then about 94 of address bar and
    // toolbar (a 553 viewport). Landscape: a compact address bar.
    browserChrome: {
      portrait: insets(20, 0, 94, 0),
      landscape: insets(50, 0, 0, 0),
    },
    frame: 'home-button',
  },
  {
    id: 'iphone',
    label: 'iPhone 17',
    kind: 'phone',
    // 402×874, the iPhone 17 and 17 Pro [loaf17; devtools "iPhone 16 Pro",
    // the same screen].
    width: 402,
    height: 874,
    // Portrait 62 top (Dynamic Island) and 34 bottom (home indicator)
    // [loaf17; devtools]. Landscape 62 on each side and 21 bottom
    // [devtools; the web reports no top inset there].
    safeArea: {
      portrait: insets(62, 0, 34, 0),
      landscape: insets(0, 62, 21, 62),
    },
    // [estimate] Portrait: the Dynamic Island's status bar, then about 100
    // of address bar and toolbar above the 34 home indicator. Landscape: a
    // compact address bar between the side insets.
    browserChrome: {
      portrait: insets(62, 0, 134, 0),
      landscape: insets(50, 62, 21, 62),
    },
    frame: 'dynamic-island',
  },
  {
    id: 'iphone-pro-max',
    label: 'iPhone 17 Pro Max',
    kind: 'phone',
    // 440×956 [loaf17; devtools "iPhone 16 Pro Max", the same screen].
    width: 440,
    height: 956,
    // As the iPhone 17 [loaf17; devtools].
    safeArea: {
      portrait: insets(62, 0, 34, 0),
      landscape: insets(0, 62, 21, 62),
    },
    // [estimate] Portrait: the Dynamic Island's status bar, then about 100
    // of address bar and toolbar above the 34 home indicator. Landscape: a
    // compact address bar between the side insets.
    browserChrome: {
      portrait: insets(62, 0, 134, 0),
      landscape: insets(50, 62, 21, 62),
    },
    frame: 'dynamic-island',
  },
  {
    id: 'android-compact',
    label: 'Android (Pixel 8)',
    kind: 'phone',
    // 412×915 [devtools "Pixel 8"].
    width: 412,
    height: 915,
    // The punch-hole status bar: 50 at the top in portrait, 50 on the right
    // in landscape [devtools "Pixel 8"].
    safeArea: {
      portrait: insets(50, 0, 0, 0),
      landscape: insets(0, 50, 0, 0),
    },
    // [estimate] The status bar and Chrome's 56 toolbar on top, the gesture
    // bar at the bottom. Landscape: the toolbar on top, the status bar's
    // inset on the right.
    browserChrome: {
      portrait: insets(106, 0, 24, 0),
      landscape: insets(56, 50, 24, 0),
    },
    frame: 'punch-hole',
  },
  {
    id: 'ipad-mini',
    label: 'iPad mini',
    kind: 'tablet',
    // 2316×1512 at 326 ppi, halved [apple-specs ipad-mini].
    width: 756,
    height: 1158,
    // 24 status bar, 20 home indicator [ipad-talk].
    safeArea: {
      portrait: insets(24, 0, 20, 0),
      landscape: insets(24, 0, 20, 0),
    },
    // [estimate] The status bar and Safari's tab and address bar on top,
    // the home indicator at the bottom.
    browserChrome: {
      portrait: insets(74, 0, 20, 0),
      landscape: insets(74, 0, 20, 0),
    },
    frame: 'tablet',
  },
  {
    id: 'ipad-air-11',
    label: 'iPad Air 11"',
    kind: 'tablet',
    // 2360×1640 at 264 ppi, halved [apple-specs ipad-air].
    width: 820,
    height: 1180,
    // [ipad-talk]
    safeArea: {
      portrait: insets(24, 0, 20, 0),
      landscape: insets(24, 0, 20, 0),
    },
    // [estimate] The status bar and Safari's tab and address bar on top,
    // the home indicator at the bottom.
    browserChrome: {
      portrait: insets(74, 0, 20, 0),
      landscape: insets(74, 0, 20, 0),
    },
    frame: 'tablet',
  },
  {
    id: 'ipad-pro-13',
    label: 'iPad Pro 13"',
    kind: 'tablet',
    // 2752×2064 at 264 ppi, halved [apple-specs ipad-pro; devtools
    // "iPad Pro 13"].
    width: 1032,
    height: 1376,
    // [ipad-talk]
    safeArea: {
      portrait: insets(24, 0, 20, 0),
      landscape: insets(24, 0, 20, 0),
    },
    // [estimate] The status bar and Safari's tab and address bar on top,
    // the home indicator at the bottom.
    browserChrome: {
      portrait: insets(74, 0, 20, 0),
      landscape: insets(74, 0, 20, 0),
    },
    frame: 'tablet',
  },
  {
    id: 'macbook-air-13',
    label: 'MacBook Air 13"',
    kind: 'desktop',
    // The display's default "looks like" size on a 2560×1664 panel
    // [apple-specs macbook-air for the panel; Apple Community and MacRumors
    // reports for the default scale, which Apple's page does not list].
    width: 1470,
    height: 956,
    frame: 'laptop',
  },
  {
    id: 'macbook-pro-16',
    label: 'MacBook Pro 16"',
    kind: 'desktop',
    // 3456×2234 at 254 ppi, halved: the default scale [apple-specs
    // macbook-pro].
    width: 1728,
    height: 1117,
    frame: 'laptop',
  },
  {
    id: 'desktop-1080',
    label: 'Desktop 1080p',
    kind: 'desktop',
    // A 1920×1080 (Full HD) display at 1x.
    width: 1920,
    height: 1080,
    frame: 'monitor',
  },
  {
    id: 'flexible',
    label: 'Flexible',
    kind: 'flexible',
    // The starting size; the play bar's fields and the stage's handles
    // change it.
    width: 800,
    height: 600,
    frame: 'none',
  },
];

/** The device play mode starts on. */
export const DEFAULT_DEVICE_ID = 'iphone';

/** The device menu's group titles. */
export const DEVICE_KIND_LABELS: Readonly<Record<DeviceKind, string>> = {
  phone: 'Phone',
  tablet: 'Tablet',
  desktop: 'Laptop/Desktop',
  flexible: 'Flexible',
};

const KIND_ORDER: readonly DeviceKind[] = [
  'phone',
  'tablet',
  'desktop',
  'flexible',
];

/**
 * The presets a host's option leaves: an array adds to the shipped list,
 * replacing a shipped preset of the same id in place; a function returns
 * the whole list (the shipped list when it returns none). Grouped by kind,
 * in menu order.
 */
export function resolveDevicePresets(
  option?: DevicePresetsOption,
): readonly DevicePreset[] {
  let presets: readonly DevicePreset[];
  if (typeof option === 'function') presets = option(SHIPPED_DEVICE_PRESETS);
  else if (option) {
    const byId = new Map(option.map((preset) => [preset.id, preset]));
    presets = [
      ...SHIPPED_DEVICE_PRESETS.map((preset) => byId.get(preset.id) ?? preset),
      ...option.filter(
        (preset) => !SHIPPED_DEVICE_PRESETS.some(({ id }) => id === preset.id),
      ),
    ];
  } else presets = SHIPPED_DEVICE_PRESETS;
  const grouped = KIND_ORDER.flatMap((kind) =>
    presets.filter((preset) => preset.kind === kind),
  );
  // A host's list must leave something to play on.
  return grouped.length ? grouped : SHIPPED_DEVICE_PRESETS;
}

export type DeviceOrientation = 'portrait' | 'landscape';
/** Play mode's scale: Fit, or a fixed factor. */
export type PlayScale = 'fit' | '0.5' | '0.75' | '1' | '1.25' | '1.5';

export const PLAY_SCALES: readonly { value: PlayScale; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
];

/** The play bar's choices, as remembered per browser. */
export interface PlaySettings {
  readonly device: string;
  readonly orientation: DeviceOrientation;
  /** On: an installed web app. Off: a browser tab. */
  readonly installed: boolean;
  readonly scale: PlayScale;
  /** KF-E8T0AY: whether the mock device frame shows. */
  readonly chrome: boolean;
  /** The Flexible device's viewport. */
  readonly flexible: PlaySize;
}

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  device: DEFAULT_DEVICE_ID,
  orientation: 'portrait',
  installed: false,
  scale: 'fit',
  chrome: true,
  flexible: { width: 800, height: 600 },
};

/** Flexible's smallest and largest sides. */
export const FLEXIBLE_MIN = 200;
export const FLEXIBLE_MAX = 3840;

/** A Flexible side, whole and within bounds. */
export const clampFlexible = (value: number): number =>
  Math.min(FLEXIBLE_MAX, Math.max(FLEXIBLE_MIN, Math.round(value)));

/** Whether a kind rotates. */
export const rotates = (kind: DeviceKind): boolean =>
  kind === 'phone' || kind === 'tablet';

/** Whether a kind runs installed web apps (and so has the toggle). */
export const installs = rotates;

/** Stored settings, read leniently: anything unknown falls back. */
export function parsePlaySettings(
  stored: unknown,
  presets: readonly DevicePreset[],
): PlaySettings {
  const value = (stored ?? {}) as Partial<Record<keyof PlaySettings, unknown>>;
  const flexible = (value.flexible ?? {}) as Partial<
    Record<keyof PlaySize, unknown>
  >;
  const side = (n: unknown, fallback: number) =>
    typeof n === 'number' && Number.isFinite(n) ? clampFlexible(n) : fallback;
  const fallback = presets.some(({ id }) => id === DEFAULT_DEVICE_ID)
    ? DEFAULT_DEVICE_ID
    : (presets[0]?.id ?? DEFAULT_DEVICE_ID);
  return {
    device:
      typeof value.device === 'string' &&
      presets.some(({ id }) => id === value.device)
        ? value.device
        : fallback,
    orientation: value.orientation === 'landscape' ? 'landscape' : 'portrait',
    installed: value.installed === true,
    chrome: value.chrome !== false,
    scale: PLAY_SCALES.some(({ value: scale }) => scale === value.scale)
      ? (value.scale as PlayScale)
      : 'fit',
    flexible: {
      width: side(flexible.width, DEFAULT_PLAY_SETTINGS.flexible.width),
      height: side(flexible.height, DEFAULT_PLAY_SETTINGS.flexible.height),
    },
  };
}

/** What the stage lays out for a preset and the play bar's choices. */
export interface DeviceEmulation {
  /** The whole device screen, rotated. */
  readonly device: PlaySize;
  /** The frame's layout size: the viewport the played view sees. */
  readonly viewport: PlaySize;
  /** Where the viewport sits on the device screen (a tab's chrome above and before it). */
  readonly offset: { readonly top: number; readonly left: number };
  /** The browser chrome around a tab's viewport; none when installed. */
  readonly chrome: DeviceInsets;
  /** The safe areas the played view gets; none in a browser tab. */
  readonly safeArea: DeviceInsets;
  /** The device's own safe areas, installed or not: where its status bar is. */
  readonly screenSafeArea: DeviceInsets;
  readonly orientation: DeviceOrientation;
  readonly installed: boolean;
}

/** The device's size, viewport, and insets for `settings`. */
export function emulate(
  preset: DevicePreset,
  settings: PlaySettings,
): DeviceEmulation {
  if (preset.kind === 'flexible')
    return {
      device: settings.flexible,
      viewport: settings.flexible,
      offset: { top: 0, left: 0 },
      chrome: NONE,
      safeArea: NONE,
      screenSafeArea: NONE,
      orientation:
        settings.flexible.width > settings.flexible.height
          ? 'landscape'
          : 'portrait',
      installed: false,
    };
  const orientation: DeviceOrientation = rotates(preset.kind)
    ? settings.orientation
    : 'portrait';
  const installed = installs(preset.kind) && settings.installed;
  const device =
    orientation === 'landscape'
      ? { width: preset.height, height: preset.width }
      : { width: preset.width, height: preset.height };
  const safe = preset.safeArea?.[orientation] ?? NONE;
  const chrome = installed
    ? NONE
    : (preset.browserChrome?.[orientation] ?? safe);
  return {
    device,
    viewport: {
      width: device.width - chrome.left - chrome.right,
      height: device.height - chrome.top - chrome.bottom,
    },
    offset: { top: chrome.top, left: chrome.left },
    chrome,
    safeArea: installed ? safe : NONE,
    screenSafeArea: safe,
    orientation,
    installed,
  };
}

/** Kerf UI's safe-area tokens (foundation.css), by logical side. */
export type SafeAreaTokens = Readonly<
  Record<
    | '--kui-safe-area-block-start'
    | '--kui-safe-area-block-end'
    | '--kui-safe-area-inline-start'
    | '--kui-safe-area-inline-end',
    string
  >
>;

/**
 * The safe-area tokens for physical `insets`, in a document of `direction`:
 * the play page sets them on its `:root`, since a frame cannot set
 * `env(safe-area-inset-*)`.
 */
export function safeAreaTokens(
  insets: DeviceInsets,
  direction: 'ltr' | 'rtl' = 'ltr',
): SafeAreaTokens {
  const rtl = direction === 'rtl';
  return {
    '--kui-safe-area-block-start': `${insets.top}px`,
    '--kui-safe-area-block-end': `${insets.bottom}px`,
    '--kui-safe-area-inline-start': `${rtl ? insets.right : insets.left}px`,
    '--kui-safe-area-inline-end': `${rtl ? insets.left : insets.right}px`,
  };
}

/**
 * KF-E8T0AY: the heights a mock frame draws its status bar and bottom
 * band (home indicator, a tab's toolbar) in: the safe areas an installed
 * app runs under, or the browser chrome around a tab's viewport.
 * KF-YC59PH: a tab's top chrome splits into the status bar (the device's
 * own safe area) and, below it, the browser's top toolbar (`toolbar`), where
 * the frame draws its address bar; zero where the toolbar is at the bottom.
 */
export function frameBands(emulated: DeviceEmulation): {
  readonly status: number;
  readonly toolbar: number;
  readonly bottom: number;
} {
  if (emulated.installed)
    return {
      status: emulated.safeArea.top,
      toolbar: 0,
      bottom: emulated.safeArea.bottom,
    };
  const { chrome } = emulated;
  const status = Math.min(emulated.screenSafeArea.top, chrome.top);
  return { status, toolbar: chrome.top - status, bottom: chrome.bottom };
}

/** The play bar's short description of an emulation, such as "402 × 778". */
export const viewportLabel = ({ viewport }: DeviceEmulation): string =>
  `${viewport.width} × ${viewport.height}`;
