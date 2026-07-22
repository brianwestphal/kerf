/**
 * Unit tests for the dev-only deep read-only guard helpers
 * (`src/utils/devReadonly.ts`). `*.internal.test.ts` so the dist-full suite
 * excludes it — these helpers are internal, not on the public barrel. The
 * store-level behavior is covered end-to-end in `store.test.ts`; this file
 * pins the helper's edge branches directly.
 */

import { describe, expect, it } from 'vitest';

import { devReadonlyProxy, toRaw } from '../../src/utils/devReadonly.js';

describe('devReadonlyProxy()', () => {
  it('wraps null-prototype nested objects (treated as plain)', () => {
    const nullProto = Object.assign(Object.create(null) as object, { x: 1 }) as { x: number };
    const p = devReadonlyProxy({ n: nullProto });
    // Accessing the nested null-proto object returns a proxy that also traps writes.
    expect(() => { (p.n as { x: number }).x = 2; }).toThrow(/read-only/);
    expect(nullProto.x).toBe(1);
  });

  it('is idempotent — wrapping an already-wrapped proxy returns it unchanged', () => {
    const raw = { a: 1 };
    const p = devReadonlyProxy(raw);
    expect(devReadonlyProxy(p)).toBe(p);
  });

  it('returns the same proxy for the same raw object (identity-stable)', () => {
    const raw = { a: 1 };
    expect(devReadonlyProxy(raw)).toBe(devReadonlyProxy(raw));
  });
});

describe('toRaw()', () => {
  it('passes primitives through untouched', () => {
    expect(toRaw(5)).toBe(5);
    expect(toRaw(null)).toBe(null);
    expect(toRaw('x')).toBe('x');
  });

  it('leaves exotic objects (non-plain) as-is', () => {
    const d = new Date(0);
    expect(toRaw(d)).toBe(d);
    // A plain container whose value is exotic keeps the exotic value by identity.
    const box = { when: d };
    expect(toRaw(box)).toBe(box);
    expect(toRaw(box).when).toBe(d);
  });

  it('unwraps a proxy to its fully-plain raw target', () => {
    const raw = { nested: { x: 1 } };
    const p = devReadonlyProxy(raw);
    expect(toRaw(p)).toBe(raw);
  });

  it('deep-unwraps proxies out of a freshly-built object, preserving structural sharing', () => {
    const raw = { nested: { x: 1 }, list: [{ id: 1 }] };
    const p = devReadonlyProxy(raw);
    const rebuilt = { ...p, count: 2 }; // p.nested / p.list are proxies here
    const clean = toRaw(rebuilt);
    expect(clean.nested).toBe(raw.nested);
    expect(clean.list).toBe(raw.list);
    // A nested array of proxies is unwrapped element-wise back to the raws.
    const withArr = { list: [devReadonlyProxy(raw.list[0])] };
    expect(toRaw(withArr).list[0]).toBe(raw.list[0]);
  });
});
