import type { CatalogBackgroundStyle } from '@kerfjs/ui/catalog';

import type { DemoTheme } from './demo-theme.js';

const STORAGE_KEY = 'kerf-ui-ux-demo-display';

export interface DemoDisplayPreferences {
  theme?: DemoTheme;
  backgroundStyle?: CatalogBackgroundStyle;
  reducedMotion?: boolean;
  increasedContrast?: boolean;
}

const backgrounds: readonly string[] = [
  'checkerboard',
  'vertical-stripes',
  'layout-guide',
  'surface',
  'sunken',
];

/** Ignore invalid or unavailable saved values independently. */
export function readDemoDisplayPreferences(
  storage: Pick<Storage, 'getItem'> | null,
): DemoDisplayPreferences {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    const values = saved as Record<string, unknown>;
    return {
      theme:
        values.theme === 'dark' || values.theme === 'light'
          ? values.theme
          : undefined,
      backgroundStyle:
        typeof values.backgroundStyle === 'string' &&
        backgrounds.includes(values.backgroundStyle)
          ? (values.backgroundStyle as CatalogBackgroundStyle)
          : undefined,
      reducedMotion:
        typeof values.reducedMotion === 'boolean'
          ? values.reducedMotion
          : undefined,
      increasedContrast:
        typeof values.increasedContrast === 'boolean'
          ? values.increasedContrast
          : undefined,
    };
  } catch {
    return {};
  }
}

/** A blocked storage write leaves the live controls usable for this page. */
export function writeDemoDisplayPreferences(
  storage: Pick<Storage, 'setItem'> | null,
  preferences: DemoDisplayPreferences,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing or a storage policy can deny persistence.
  }
}
