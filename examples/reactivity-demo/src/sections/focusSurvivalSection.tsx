/**
 * §3 — Focus / cursor preservation across re-renders.
 *
 * The headline morphdom win: an `<input>` the user is typing into survives an
 * unrelated re-render. The 1 Hz tick is purely a demo device — re-renders in
 * production code happen on actual state change, but the timer here makes the
 * preservation observable while you're interacting with the page.
 */

import { attr, delegate, mount, signal, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  setName:       attr('data-action', 'set-name'),
  toggleLetters: attr('data-action', 'toggle-letters'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;

export function mountFocusSurvival(root: HTMLElement): void {
  const name = signal('');
  const tick = signal(0);
  const showLetters = signal(true);

  setInterval(() => { tick.value += 1; }, 1000);

  mount(root, () => (
    <div className="demo-card">
      <h2>3. Focus / cursor preservation <span className="demo-tag">morphdom in action</span></h2>

      <div className="demo-row">
        <label className="demo-label">
          Type your name:
          <input
            type="text"
            id="focus-name-input"
            value={name.value}
            placeholder="(focus stays put on every tick)"
            {...ACTIONS.setName.attrs}
            className="demo-input"
            autocomplete="off"
            spellcheck="false"
          />
        </label>
        <button type="button" {...ACTIONS.toggleLetters.attrs} className="demo-btn demo-btn-ghost">
          {showLetters.value ? 'hide' : 'show'} letter list
        </button>
      </div>

      <p className="demo-tick-line">
        Re-render tick: <strong>{tick.value}</strong>
        {' · '}
        Hello, <strong>{name.value === '' ? '<empty>' : name.value}</strong>
      </p>

      {showLetters.value && name.value !== '' ? (
        <ul className="demo-letter-list">
          {name.value.split('').map((ch, i) => (
            <li className="demo-letter" data-key={String(i)}>{ch}</li>
          ))}
        </ul>
      ) : null}

      <p className="demo-note">
        The <code>tick</code> signal increments every second, forcing this
        whole block to re-render. The input's <code>id</code> gives morphdom a
        stable diff key, and the focus-preservation hook copies the live
        value + selection range across the morph. Try: click into the input,
        type slowly — the cursor never jumps.
      </p>
    </div>
  ));

  delegate(root, 'input', ACTIONS.setName.selector, (_e, target) => {
    name.value = (target as HTMLInputElement).value;
  });
  delegate(root, 'click', ACTIONS.toggleLetters.selector, () => {
    showLetters.value = !showLetters.value;
  });
}
