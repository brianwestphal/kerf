import { describe, expect, it } from 'vitest';

import { isSafeHtml, raw, trustedRaw } from '../../src/jsx-runtime.js';

describe('trustedRaw()', () => {
  it('returns SafeHtml with the verbatim html — identical output to raw()', () => {
    const t = trustedRaw('<script src="/x.js"></script>');
    expect(isSafeHtml(t)).toBe(true);
    expect(t.toString()).toBe('<script src="/x.js"></script>');
    expect(trustedRaw('<b>{token}</b>').toString()).toBe(raw('<b>{token}</b>').toString());
  });
});
