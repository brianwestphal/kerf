/**
 * Type-level tests for KF-75 — JSX intrinsic-element typings.
 *
 * Each `@ts-expect-error` directive asserts that the line below it should
 * fail to type-check. If the typing regresses to permissive
 * `Record<string, unknown>`, those directives go unused and `tsc --noEmit`
 * fails loudly with `Unused '@ts-expect-error' directive`. So these
 * compile-time checks are gated by the typecheck step in `npm run check`.
 *
 * The runtime assertions are minimal — they exist so the test runner sees
 * the file as live (not all `@ts-expect-error` directives can sit alone).
 */

import { describe, expect, it } from 'vitest';

import type { KerfCustomElement } from '../../src/jsx-runtime.js';

// KF-100: declaration merging must work via the `kerfjs/jsx-runtime` module
// (in tests, that's `../../src/jsx-runtime.js`). `IntrinsicElements` is
// declared as an interface there, so this merge slots a custom tag into
// the table without overwriting the existing tags.
declare module '../../src/jsx-runtime.js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kf-test-element': KerfCustomElement & { foo?: string; bar?: number };
    }
  }
}

describe('JSX.IntrinsicElements typing (compile-time)', () => {
  it('accepts known attributes on known tags', () => {
    const ok1 = <input type="text" disabled />;
    const ok2 = <a href="/x" target="_blank">link</a>;
    const ok3 = <img src="/x.png" alt="x" width={32} />;
    expect(ok1.toString()).toContain('<input');
    expect(ok2.toString()).toContain('href="/x"');
    expect(ok3.toString()).toContain('src="/x.png"');
  });

  it('rejects misspelled attributes on typed tags', () => {
    // @ts-expect-error — `typo` is not a known attribute on <input>.
    const bad = <input typo />;
    expect(bad.toString()).toContain('typo');
  });

  it('rejects misspelled tag names', () => {
    // @ts-expect-error — `<asdf>` is not a known intrinsic element. Use
    // declaration merging if you have a real custom element by that name.
    const bad = <asdf />;
    expect(bad.toString()).toContain('asdf');
  });

  it('rejects wrong-shaped values for typed attributes', () => {
    // @ts-expect-error — `tabIndex` accepts number, not arbitrary string.
    const bad1 = <div tabIndex="not a number" />;
    expect(bad1.toString()).toContain('tabindex');

    // @ts-expect-error — `disabled` is boolean-like, not arbitrary string.
    const bad2 = <input disabled="please" />;
    expect(bad2.toString()).toContain('disabled');
  });

  it('KF-100: custom tag merged via declare module typechecks and renders', () => {
    const ok = <kf-test-element foo="hello" bar={42} data-x="y" />;
    expect(ok.toString()).toContain('kf-test-element');
    expect(ok.toString()).toContain('foo="hello"');
    expect(ok.toString()).toContain('bar="42"');
  });

  it('KF-100: unmerged custom tag fails to typecheck', () => {
    // @ts-expect-error — `<kf-undeclared-tag>` is not in IntrinsicElements
    // and has not been declaration-merged. Authors must opt in per KF-100.
    const bad = <kf-undeclared-tag />;
    expect(bad.toString()).toContain('kf-undeclared-tag');
  });

  it('KF-183: accepts both camelCase and lowercase HTML forms for autocomplete / spellcheck', () => {
    // The kerf JSX → HTML-string runtime renders both forms to the same
    // lowercase output (ATTR_ALIASES normalizes the camelCase form). The
    // type system now accepts either spelling so HTML-savvy developers
    // who type the canonical HTML attribute names compile cleanly.
    const inputCamel = <input autoComplete="off" spellCheck />;
    const inputLower = <input autocomplete="off" spellcheck />;
    const formCamel = <form autoComplete="on" spellCheck />;
    const formLower = <form autocomplete="on" spellcheck />;
    const selectCamel = <select autoComplete="off" />;
    const selectLower = <select autocomplete="off" />;
    const textareaCamel = <textarea autoComplete="off" spellCheck />;
    const textareaLower = <textarea autocomplete="off" spellcheck />;
    expect(inputCamel.toString()).toContain('autocomplete="off"');
    expect(inputLower.toString()).toContain('autocomplete="off"');
    expect(formCamel.toString()).toContain('autocomplete="on"');
    expect(formLower.toString()).toContain('autocomplete="on"');
    expect(selectCamel.toString()).toContain('autocomplete="off"');
    expect(selectLower.toString()).toContain('autocomplete="off"');
    expect(textareaCamel.toString()).toContain('autocomplete="off"');
    expect(textareaLower.toString()).toContain('autocomplete="off"');
    expect(inputCamel.toString()).toContain('spellcheck');
    expect(inputLower.toString()).toContain('spellcheck');
  });

  it('KF-191: accepts both camelCase and lowercase HTML forms for class / for / tabindex / autofocus', () => {
    // Migration doc (`/kerf/migrating/react/`) explicitly directs developers
    // to write the canonical HTML attribute names (`class`, `for`,
    // `tabindex`, `autofocus`). The type system now accepts either
    // spelling so JSX that follows the doc's guidance compiles cleanly.
    const divCamel = <div className="x" tabIndex={0} />;
    const divLower = <div class="x" tabindex="0" />;
    const labelCamel = <label htmlFor="email">Email</label>;
    const labelLower = <label for="email">Email</label>;
    const inputCamel = <input autoFocus />;
    const inputLower = <input autofocus />;
    const inputLowerStr = <input autofocus="true" />;
    const outputCamel = <output htmlFor="x" />;
    const outputLower = <output for="x" />;
    // SVG attribute set picks up the lowercase forms too.
    const svgCamel = <svg className="icon" tabIndex={0} />;
    const svgLower = <svg class="icon" tabindex={0} />;
    expect(divCamel.toString()).toContain('class="x"');
    expect(divLower.toString()).toContain('class="x"');
    expect(divCamel.toString()).toContain('tabindex="0"');
    expect(divLower.toString()).toContain('tabindex="0"');
    expect(labelCamel.toString()).toContain('for="email"');
    expect(labelLower.toString()).toContain('for="email"');
    expect(inputCamel.toString()).toContain('autofocus');
    expect(inputLower.toString()).toContain('autofocus');
    expect(inputLowerStr.toString()).toContain('autofocus');
    expect(outputCamel.toString()).toContain('for="x"');
    expect(outputLower.toString()).toContain('for="x"');
    expect(svgCamel.toString()).toContain('class="icon"');
    expect(svgLower.toString()).toContain('class="icon"');
  });

  it('still allows arbitrary data-* and aria-* attributes', () => {
    const ok1 = <div data-action="add" data-id="42" />;
    const ok2 = <button aria-label="close" aria-pressed={false} />;
    expect(ok1.toString()).toContain('data-action="add"');
    expect(ok2.toString()).toContain('aria-label="close"');
  });
});
