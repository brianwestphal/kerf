/**
 * Helper-level cases for the element-owned attribute rule
 * (`src/utils/isUserAgentOwnedAttr.ts`). Kept out of the dist-full run because
 * the helper is private; the public morph/mount/each behavior lives in
 * `custom-element-owned-aria.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import { isUserAgentOwnedAttr } from '../../src/utils/isUserAgentOwnedAttr.js';

describe('isUserAgentOwnedAttr()', () => {
  it('owns open, role, and aria-* on hyphenated tags only', () => {
    expect(isUserAgentOwnedAttr('WA-OPTION', 'role')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'aria-selected')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'tabindex')).toBe(false);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'class')).toBe(false);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'arialabel')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'role')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'aria-label')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'open')).toBe(false);
    expect(isUserAgentOwnedAttr('DETAILS', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('DIALOG', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('DETAILS', 'role')).toBe(false);
  });
});
