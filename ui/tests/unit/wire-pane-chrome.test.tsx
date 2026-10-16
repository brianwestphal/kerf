import { signal } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { wirePaneChrome } from '../../src/components/layout/pane/wiring/wire-pane-chrome.js';

function setup() {
  const root = document.createElement('div');
  root.innerHTML = `<button type="button" id="toggle">Filters</button><div class="kui-pane" data-compact-header="overlay" data-compact-footer="overlay"><div class="kui-pane__header"><button type="button" id="inside">Clear</button></div><div class="kui-pane__content"><p id="content">Rows</p></div><div class="kui-pane__footer"><button type="button" id="foot">Done</button></div></div>`;
  document.body.append(root);
  const header = signal(false);
  const footer = signal(false);
  const stop = wirePaneChrome(root, { header, footer });
  const el = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const press = (target: HTMLElement) => {
    target.dispatchEvent(
      new Event('pointerdown', { bubbles: true, composed: true }),
    );
    target.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
  };
  const escape = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.activeElement!.dispatchEvent(event);
    return event;
  };
  return { root, header, footer, stop, el, press, escape };
}

afterEach(() => document.body.replaceChildren());

describe('wirePaneChrome', () => {
  it('closes the chrome holding focus on Escape and returns focus to its opener', () => {
    const t = setup();
    t.el('toggle').focus();
    t.header.value = true;
    t.el('inside').focus();
    const event = t.escape();
    expect(event.defaultPrevented).toBe(true);
    expect(t.header.value).toBe(false);
    expect(document.activeElement).toBe(t.el('toggle'));
    // With nothing open, Escape passes through.
    expect(t.escape().defaultPrevented).toBe(false);
    // The last opened closes first when focus is elsewhere.
    t.header.value = true;
    t.footer.value = true;
    t.el('content').tabIndex = -1;
    t.el('content').focus();
    t.escape();
    expect(t.footer.value).toBe(false);
    expect(t.header.value).toBe(true);
    // A handled Escape is left alone.
    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.dispatchEvent(handled);
    expect(t.header.value).toBe(true);
    t.stop();
  });

  it('closes on a press outside, not inside or on a press that opened it', () => {
    const t = setup();
    t.header.value = true;
    t.press(t.el('inside'));
    expect(t.header.value).toBe(true);
    t.press(t.el('content'));
    expect(t.header.value).toBe(false);
    // A press that opens the chrome (open only by the click) leaves it open.
    t.el('toggle').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    t.header.value = true;
    t.el('toggle').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(t.header.value).toBe(true);
    // Closing without focus inside leaves focus where it is.
    t.el('content').focus();
    t.header.value = false;
    t.stop();
    // Disposed: presses and Escape do nothing.
    t.header.value = true;
    t.press(t.el('content'));
    expect(t.header.value).toBe(true);
  });

  it('wires only the slots given and tolerates a pane without overlay chrome', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p id="p">Nothing</p>';
    document.body.append(root);
    const header = signal(true);
    const stop = wirePaneChrome(root, { header });
    root
      .querySelector<HTMLElement>('#p')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    root
      .querySelector<HTMLElement>('#p')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(header.value).toBe(false);
    stop();
    expect(wirePaneChrome(root, {})).toBeTypeOf('function');
  });
});
