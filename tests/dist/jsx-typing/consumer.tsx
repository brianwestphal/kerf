/**
 * KF-123 regression gate. Compiled by `tsc -p tests/dist/jsx-typing` against
 * `dist/jsx-runtime.d.ts` (the file consumers actually see) with the same
 * `jsxImportSource: "kerfjs"` setup a downstream app uses.
 *
 * If `dist/jsx-runtime.d.ts` ever re-emits `interface IntrinsicElements
 * extends IntrinsicElements {}` (the KF-123 self-shadow), every `<tag>` in
 * this file fails with TS2339 and the build gate fails.
 *
 * Runtime never executes — `tsc --noEmit` is the only check.
 */

import { each, Fragment, isSafeHtml, mount, raw, signal, type SafeHtml } from 'kerfjs';
import { arraySignal } from 'kerfjs/array-signal';

const count = signal(0);
const rows = arraySignal<{ id: number; label: string }>([]);

const safeRef: SafeHtml = (
  <div id="app" className="root" data-test="ok">
    <header role="banner">
      <h1>kerf</h1>
      <p style="color:red">Hello</p>
    </header>
    <main>
      <button type="button" disabled={false} data-action="inc">
        +
      </button>
      <span>{count.value}</span>
      <input type="text" value="x" placeholder="type" />
      <textarea rows={4} cols={40}>seed</textarea>
      <select>
        <option value="a">A</option>
      </select>
      <ul>
        {each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}
      </ul>
      <details open>
        <summary>more</summary>
        <pre><code>{raw('<b>raw</b>')}</code></pre>
      </details>
      <a href="/x" rel="noopener" target="_blank">link</a>
      <img src="/x.png" alt="" width={32} height={32} />
      <table>
        <thead><tr><th scope="col">a</th></tr></thead>
        <tbody><tr><td>1</td></tr></tbody>
      </table>
      <form action="/x" method="post">
        <label htmlFor="i">L</label>
        <input id="i" name="i" />
      </form>
      <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
        <circle cx={5} cy={5} r={3} fill="currentColor" />
        <path d="M0 0 L10 10" stroke="black" />
      </svg>
    </main>
    <Fragment>
      <footer>{isSafeHtml(raw('')) ? 'safe' : 'no'}</footer>
    </Fragment>
  </div>
);

declare const root: HTMLElement;
mount(root, () => safeRef);
