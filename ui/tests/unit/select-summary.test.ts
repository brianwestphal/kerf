import { describe, expect, it } from 'vitest';

import { summarizeSelection } from '../../src/components/forms/select/model/select-summary.js';

describe('summarizeSelection', () => {
  it('is empty for no choice and the label for one', () => {
    expect(summarizeSelection([])).toBe('');
    expect(summarizeSelection(['Bug'])).toBe('Bug');
  });

  it('lists several labels as a short unit list for the locale', () => {
    expect(summarizeSelection(['Bug', 'Docs'], 'en')).toBe('Bug, Docs');
    expect(summarizeSelection(['Bug', 'Docs', 'Ops'], 'en')).toBe(
      'Bug, Docs, Ops',
    );
  });

  it('falls back to a comma list for an invalid locale', () => {
    expect(summarizeSelection(['Bug', 'Docs'], 'not a locale!')).toBe(
      'Bug, Docs',
    );
  });
});
