import { describe, expect, it } from 'vitest';

import { applyDemoTheme, oppositeDemoTheme, preferredDemoTheme } from '../../ux-demo/demo-theme.js';

describe('UX catalog theme controls', () => {
  it('derives the initial effective theme from the operating-system preference', () => {
    expect(preferredDemoTheme(false)).toBe('light');
    expect(preferredDemoTheme(true)).toBe('dark');
  });

  it('chooses the other appearance for the theme action', () => {
    expect(oppositeDemoTheme('light')).toBe('dark');
    expect(oppositeDemoTheme('dark')).toBe('light');
  });

  it('applies mutually exclusive explicit light and dark overrides', () => {
    const root = document.documentElement;

    applyDemoTheme(root, 'dark');
    expect(root.classList.contains('demo-dark')).toBe(true);
    expect(root.classList.contains('demo-light')).toBe(false);

    applyDemoTheme(root, 'light');
    expect(root.classList.contains('demo-light')).toBe(true);
    expect(root.classList.contains('demo-dark')).toBe(false);
  });
});
