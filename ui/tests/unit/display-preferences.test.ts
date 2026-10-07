import { describe, expect, it } from 'vitest';

import {
  readDemoDisplayPreferences,
  writeDemoDisplayPreferences,
} from '../../ux-demo/display-preferences.js';

describe('UX demo display preferences', () => {
  it('round trips independent display settings', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (name: string) => values.get(name) ?? null,
      setItem: (name: string, value: string) => {
        values.set(name, value);
      },
    };
    writeDemoDisplayPreferences(storage, {
      theme: 'light',
      backgroundStyle: 'layout-guide',
      reducedMotion: true,
      increasedContrast: false,
    });
    expect(readDemoDisplayPreferences(storage)).toEqual({
      theme: 'light',
      backgroundStyle: 'layout-guide',
      reducedMotion: true,
      increasedContrast: false,
    });
  });

  it('keeps valid fields when neighboring fields are invalid', () => {
    const storage = {
      getItem: () =>
        JSON.stringify({
          theme: 'automatic',
          backgroundStyle: 'surface',
          reducedMotion: 'true',
          increasedContrast: true,
        }),
    };
    expect(readDemoDisplayPreferences(storage)).toEqual({
      theme: undefined,
      backgroundStyle: 'surface',
      reducedMotion: undefined,
      increasedContrast: true,
    });
  });

  it('uses defaults when storage is missing, malformed, or blocked', () => {
    expect(readDemoDisplayPreferences(null)).toEqual({});
    expect(readDemoDisplayPreferences({ getItem: () => '{' })).toEqual({});
    expect(readDemoDisplayPreferences({ getItem: () => '[]' })).toEqual({});
    expect(
      readDemoDisplayPreferences({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toEqual({});
    expect(() =>
      writeDemoDisplayPreferences(
        {
          setItem: () => {
            throw new Error('blocked');
          },
        },
        { theme: 'dark' },
      ),
    ).not.toThrow();
  });
});
