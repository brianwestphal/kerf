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

  it('accepts every SVG fragment tag toElement() supports — pinned via <filter> (the one once missing)', () => {
    // <filter> is in toElement's SVG_FRAGMENT_TAGS; it must also be an
    // intrinsic element so JSX-authored SVG filters compile (docs/6 §6.10
    // claims the table covers the SVG primitives toElement supports).
    const ok = (
      <defs>
        <filter id="blur">
          <rect width={4} height={4} />
        </filter>
      </defs>
    );
    expect(ok.toString()).toContain('<filter id="blur">');
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
    const inputCamel = <input autoComplete="off" spellCheck="false" />;
    const inputLower = <input autocomplete="off" spellcheck="false" />;
    const formCamel = <form autoComplete="on" spellCheck="true" />;
    const formLower = <form autocomplete="on" spellcheck="true" />;
    const selectCamel = <select autoComplete="off" />;
    const selectLower = <select autocomplete="off" />;
    const textareaCamel = <textarea autoComplete="off" spellCheck="false" />;
    const textareaLower = <textarea autocomplete="off" spellcheck="false" />;
    expect(inputCamel.toString()).toContain('autocomplete="off"');
    expect(inputLower.toString()).toContain('autocomplete="off"');
    expect(formCamel.toString()).toContain('autocomplete="on"');
    expect(formLower.toString()).toContain('autocomplete="on"');
    expect(selectCamel.toString()).toContain('autocomplete="off"');
    expect(selectLower.toString()).toContain('autocomplete="off"');
    expect(textareaCamel.toString()).toContain('autocomplete="off"');
    expect(textareaLower.toString()).toContain('autocomplete="off"');
    expect(inputCamel.toString()).toContain('spellcheck="false"');
    expect(inputLower.toString()).toContain('spellcheck="false"');
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
    expect(outputCamel.toString()).toContain('for="x"');
    expect(outputLower.toString()).toContain('for="x"');
    expect(svgCamel.toString()).toContain('class="icon"');
    expect(svgLower.toString()).toContain('class="icon"');
  });

  it('KF-436: enumerated attributes reject boolean and accept the spec keywords', () => {
    // `draggable`, `spellcheck`, and `contenteditable` are ENUMERATED, not
    // boolean: they take the strings "true"/"false" and their missing-value
    // default is a third state. A boolean renders markup that means something
    // else — see the rule in src/jsx-types.ts's header — so the type rejects it
    // and these directives are what keeps that true.

    // @ts-expect-error — `draggable={true}` renders `<div draggable>`, an empty
    // value, which is INVALID for draggable and falls back to the auto state:
    // for a <div>, not draggable at all.
    const bad1 = <div draggable={true} />;
    // @ts-expect-error — `draggable={false}` omits the attribute, which is auto
    // again — and auto for <img> / <a href> means draggable.
    const bad2 = <img src="x.png" alt="x" draggable={false} />;
    // @ts-expect-error — `spellCheck={false}` omits the attribute, which means
    // "inherit the default", not off.
    const bad3 = <textarea spellCheck={false} />;
    // @ts-expect-error — same for the lowercase spelling.
    const bad4 = <textarea spellcheck={false} />;
    // @ts-expect-error — `contentEditable={false}` omits the attribute, so a
    // child of an editable region stays editable.
    const bad5 = <div contentEditable={false} />;
    // @ts-expect-error — same for the lowercase spelling.
    const bad6 = <div contenteditable={true} />;

    // The correct forms compile and render the keyword verbatim.
    expect(String(<div draggable="true" />)).toBe('<div draggable="true"></div>');
    expect(String(<img src="x.png" alt="x" draggable="false" />))
      .toBe('<img src="x.png" alt="x" draggable="false">');
    expect(String(<textarea spellCheck="false" />)).toBe('<textarea spellcheck="false"></textarea>');
    expect(String(<div contentEditable="plaintext-only" />))
      .toBe('<div contenteditable="plaintext-only"></div>');

    // And the wrong forms really do render the wrong markup — this is the
    // failure the type now prevents, pinned so the claim stays checkable.
    expect(bad1.toString()).toBe('<div draggable></div>');
    expect(bad2.toString()).toBe('<img src="x.png" alt="x">');
    expect(bad3.toString()).toBe('<textarea></textarea>');
    expect(bad4.toString()).toBe('<textarea></textarea>');
    expect(bad5.toString()).toBe('<div></div>');
    expect(bad6.toString()).toBe('<div contenteditable></div>');
  });

  it('KF-436: `hidden` stays boolean (a real boolean attribute) and takes `until-found`', () => {
    expect(String(<div hidden />)).toBe('<div hidden></div>');
    expect(String(<div hidden={false} />)).toBe('<div></div>');
    expect(String(<div hidden="until-found">x</div>))
      .toBe('<div hidden="until-found">x</div>');
  });

  it('KF-436: lowercase `autofocus` rejects the string forms', () => {
    // A present boolean attribute is true whatever its value, so
    // `autofocus="false"` turns autofocus ON. Blessing that spelling in the
    // types would hand authors a switch wired backwards.
    // @ts-expect-error — use `{false}` or omit the attribute.
    const bad = <input autofocus="false" />;
    expect(bad.toString()).toBe('<input autofocus="false">');
    expect(String(<input autofocus={false} />)).toBe('<input>');
  });

  it('KF-436: `<select>` / `<textarea>` reject `value` (no such content attribute)', () => {
    // @ts-expect-error — a <select>'s selection comes from <option selected>.
    const bad1 = <select value="b" />;
    // @ts-expect-error — a <textarea>'s value is its child text.
    const bad2 = <textarea value="hi" />;
    // Rendering them proves why: inert markup the browser never reads.
    expect(bad1.toString()).toBe('<select value="b"></select>');
    expect(bad2.toString()).toBe('<textarea value="hi"></textarea>');

    // The forms that actually work.
    expect(String(<option value="b" defaultSelected>b</option>))
      .toBe('<option value="b" selected>b</option>');
    expect(String(<textarea>draft</textarea>)).toBe('<textarea>draft</textarea>');
  });

  it('KF-436: `<style scoped>` is gone (removed from the standard, never shipped)', () => {
    // @ts-expect-error — the scoped-stylesheet proposal was dropped.
    const bad = <style scoped />;
    expect(bad.toString()).toBe('<style scoped></style>');
  });

  it('KF-438: `translate` / `autocorrect` are enumerated — boolean rejected, keywords accepted', () => {
    // Same trap as `spellcheck` (KF-436): both take keyword STRINGS, and the
    // missing-value default is a third state, so the boolean forms render
    // markup that means something else.

    // @ts-expect-error — `translate={false}` omits the attribute, which means
    // *inherit*, not "no" — the opt-out silently never happens.
    const bad1 = <div translate={false} />;
    // @ts-expect-error — the keywords are "yes"/"no", not "true"/"false"; the
    // boolean spelling is rejected in both directions.
    const bad2 = <div translate={true} />;
    // @ts-expect-error — `autocorrect={false}` omits the attribute, which means
    // *inherit the default* (on, for most editable elements), not off.
    const bad3 = <input autocorrect={false} />;
    // @ts-expect-error — same in the other direction.
    const bad4 = <input autocorrect={true} />;

    // The correct forms compile and render the keyword verbatim.
    expect(String(<div translate="no" />)).toBe('<div translate="no"></div>');
    expect(String(<p translate="yes" />)).toBe('<p translate="yes"></p>');
    expect(String(<input autocorrect="off" />)).toBe('<input autocorrect="off">');
    expect(String(<textarea autocorrect="on" />)).toBe('<textarea autocorrect="on"></textarea>');

    // And the wrong forms really do render the wrong markup — pinned so the
    // claim stays checkable.
    expect(bad1.toString()).toBe('<div></div>');
    expect(bad2.toString()).toBe('<div translate></div>');
    expect(bad3.toString()).toBe('<input>');
    expect(bad4.toString()).toBe('<input autocorrect>');
  });

  it('KF-438: `popover` takes the keywords AND the bare form (empty value is the spec keyword for auto)', () => {
    // Unlike `draggable`, boolean popover lands on spec states in both
    // directions: `{true}` renders the bare attribute → the auto state
    // (`<div popover>` is the canonical spelling), `{false}` omits it → not a
    // popover. So boolean stays allowed here.
    expect(String(<div popover />)).toBe('<div popover></div>');
    expect(String(<div popover={false} />)).toBe('<div></div>');
    expect(String(<div popover="manual" />)).toBe('<div popover="manual"></div>');
    expect(String(<div popover="hint" />)).toBe('<div popover="hint"></div>');
    expect(String(<div popover="auto" />)).toBe('<div popover="auto"></div>');
  });

  it('KF-438: modern global attributes — inert, nonce, part/exportparts, enterKeyHint, microdata', () => {
    // `inert` and `itemScope` are genuine boolean attributes.
    expect(String(<div inert />)).toBe('<div inert></div>');
    expect(String(<div inert={false} />)).toBe('<div></div>');
    expect(String(<script nonce="r4nd0m">{'x()'}</script>)).toContain('nonce="r4nd0m"');
    expect(String(<span part="label" exportparts="inner: outer" />))
      .toBe('<span part="label" exportparts="inner: outer"></span>');
    expect(String(<input enterKeyHint="send" />)).toContain('enterKeyHint="send"');

    // The camelCase spellings reach the real lowercase names through the HTML
    // parser (pinned per-name in jsx-attr-names.test.tsx).
    const host = document.createElement('div');
    host.innerHTML = String(
      <div itemScope itemType="https://schema.org/Person" itemId="urn:p:1" itemRef="extra">
        <span itemProp="name">Ada</span>
        <input enterKeyHint="go" />
      </div>,
    );
    const item = host.firstElementChild!;
    expect(item.hasAttribute('itemscope')).toBe(true);
    expect(item.getAttribute('itemtype')).toBe('https://schema.org/Person');
    expect(item.getAttribute('itemid')).toBe('urn:p:1');
    expect(item.getAttribute('itemref')).toBe('extra');
    expect(item.querySelector('span')!.getAttribute('itemprop')).toBe('name');
    expect(item.querySelector('input')!.getAttribute('enterkeyhint')).toBe('go');
  });

  it('KF-438: per-element additions render their real HTML names', () => {
    const host = document.createElement('div');

    // <button> popover-invoker + Invoker Commands attributes.
    host.innerHTML = String(
      <button popoverTarget="menu" popoverTargetAction="show" command="show-modal" commandFor="dlg">open</button>,
    );
    const button = host.firstElementChild!;
    expect(button.getAttribute('popovertarget')).toBe('menu');
    expect(button.getAttribute('popovertargetaction')).toBe('show');
    expect(button.getAttribute('command')).toBe('show-modal');
    expect(button.getAttribute('commandfor')).toBe('dlg');

    // <input dirname> / <textarea dirname>, <img ismap>.
    host.innerHTML = String(<input name="comment" dirName="comment.dir" />);
    expect(host.firstElementChild!.getAttribute('dirname')).toBe('comment.dir');
    host.innerHTML = String(<textarea name="bio" dirName="bio.dir" />);
    expect(host.firstElementChild!.getAttribute('dirname')).toBe('bio.dir');
    host.innerHTML = String(<img src="map.png" alt="map" isMap />);
    expect(host.firstElementChild!.hasAttribute('ismap')).toBe(true);

    // <link disabled / imagesrcset / imagesizes / blocking>.
    host.innerHTML = String(
      <link rel="preload" as="image" imageSrcSet="a.png 1x, b.png 2x" imageSizes="100vw" blocking="render" disabled />,
    );
    const link = host.firstElementChild!;
    expect(link.getAttribute('imagesrcset')).toBe('a.png 1x, b.png 2x');
    expect(link.getAttribute('imagesizes')).toBe('100vw');
    expect(link.getAttribute('blocking')).toBe('render');
    expect(link.hasAttribute('disabled')).toBe(true);

    // <script blocking / fetchpriority>.
    expect(String(<script src="/app.js" blocking="render" fetchPriority="high" />))
      .toContain('blocking="render" fetchPriority="high"');

    // <area download / ping / referrerpolicy> — typed on <a>, now on <area> too.
    host.innerHTML = String(
      <area alt="zone" href="/z" download="zone.png" ping="https://log.example/a" referrerPolicy="no-referrer" />,
    );
    const area = host.firstElementChild!;
    expect(area.getAttribute('download')).toBe('zone.png');
    expect(area.getAttribute('ping')).toBe('https://log.example/a');
    expect(area.getAttribute('referrerpolicy')).toBe('no-referrer');

    // <meta media / property> (property is Open Graph — not in the HTML
    // standard, typed because it is universal; see jsx-types.ts's deviations).
    expect(String(<meta property="og:title" content="kerf" />))
      .toBe('<meta property="og:title" content="kerf">');
    expect(String(<meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)" />))
      .toContain('media="(prefers-color-scheme: dark)"');
  });

  it('still allows arbitrary data-* and aria-* attributes', () => {
    const ok1 = <div data-action="add" data-id="42" />;
    const ok2 = <button aria-label="close" aria-pressed={false} />;
    expect(ok1.toString()).toContain('data-action="add"');
    expect(ok2.toString()).toContain('aria-label="close"');
  });
});
