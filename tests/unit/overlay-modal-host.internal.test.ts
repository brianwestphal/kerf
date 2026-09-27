/**
 * The in-dialog host slot (KF-FBHQEP). A surface lifted over a modal
 * `<dialog>` is visible but inert — every engine inerts content outside the
 * modal — so a `popover()` / `tooltip()` whose anchor sits inside an open
 * modal `<dialog>` renders into that dialog's `[data-kerf-overlay-host]`
 * element instead: part of the modal subtree, fully interactive, never lifted.
 * A dialog kerf opened gets the slot on demand; an app-owned dialog opts in by
 * marking an element. The slot is also the one sanctioned nested-mount
 * boundary, so the enclosing dialog content can itself be a kerf `mount()`.
 *
 * The real clickability / focus / Escape ordering is pinned in
 * `tests/browser/overlay-modal-host.spec.ts`.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { _resetWarnedForTests } from '../../src/dev-overlay-warn.js';
import { each } from '../../src/each.js';
import { html } from '../../src/html.js';
import { raw } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { overlay, popover, tooltip } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';

const HOST = '[data-kerf-overlay-host]';

let warn: MockInstance<typeof console.warn>;
const cleanups: Array<() => void> = [];

beforeEach(() => {
  document.body.innerHTML = '';
  _resetWarnedForTests();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  warn.mockRestore();
  vi.useRealTimers();
});

function openKerfDialog(content = '<button id="anchor">a</button>') {
  const h = overlay(raw(content), { native: true, initialFocus: false });
  cleanups.push(() => h.close());
  return h;
}
const byId = (id: string) => document.getElementById(id) as HTMLElement;

const realMatches = Element.prototype.matches;
/** happy-dom has no `:modal`: report `dialog` as the modal one. */
function reportModal(dialog: Element) {
  return vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
    this: Element,
    selector: string,
  ) {
    return selector === ':modal'
      ? this === dialog
      : realMatches.call(this, selector);
  });
}

/** An app-owned modal dialog (reported through `:modal`). */
function openAppDialog(inner: string): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.innerHTML = inner;
  document.body.appendChild(dialog);
  dialog.showModal();
  const matches = reportModal(dialog);
  cleanups.push(() => {
    matches.mockRestore();
    dialog.close();
  });
  return dialog;
}

describe('a popover anchored inside a modal <dialog> kerf opened', () => {
  it('renders into an on-demand host slot inside the dialog, not lifted and not warned', () => {
    const dialog = openKerfDialog();
    const pop = popover(byId('anchor'), raw('<button id="pick">pick</button>'));

    const host = dialog.el.querySelector(HOST) as HTMLElement;
    expect(host.parentElement).toBe(dialog.el);
    expect(host.hasAttribute('data-morph-skip')).toBe(true);
    expect(host.hasAttribute('data-morph-preserve')).toBe(true);
    expect(host.style.display).toBe('contents');
    expect(pop.el.parentElement).toBe(host);
    expect(pop.el.hasAttribute('popover')).toBe(false); // no lift needed
    expect(pop.el.style.position).toBe('fixed'); // still anchored-positioned
    expect(warn).not.toHaveBeenCalled(); // its controls are usable

    pop.close();
    expect(host.isConnected).toBe(true); // the slot outlives one surface
  });

  it('reuses one slot for every surface in the dialog', () => {
    const dialog = openKerfDialog();
    const a = popover(byId('anchor'), raw('<p>a</p>'));
    const b = popover(byId('anchor'), raw('<p>b</p>'));
    cleanups.push(() => (a.close(), b.close()));
    expect(dialog.el.querySelectorAll(HOST)).toHaveLength(1);
    expect(b.el.parentElement).toBe(a.el.parentElement);
  });

  it('a tooltip anchored inside the dialog renders into the slot too', () => {
    vi.useFakeTimers();
    const dialog = openKerfDialog();
    cleanups.push(tooltip(byId('anchor'), 'tip', { delay: 0 }));
    byId('anchor').dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    const tip = document.querySelector('.kerf-tooltip') as HTMLElement;
    expect(tip.parentElement!.parentElement).toBe(dialog.el);
  });

  it('an explicit container wins over the slot, and one inside the modal is not lifted', () => {
    const dialog = openAppDialog(
      '<button id="anchor">a</button><div id="box"></div><div data-kerf-overlay-host data-morph-skip></div>',
    );
    const pop = popover(byId('anchor'), raw('<p>x</p>'), {
      container: byId('box'),
    });
    cleanups.unshift(() => pop.close());
    expect(pop.el.parentElement).toBe(byId('box'));
    expect(pop.el.hasAttribute('popover')).toBe(false); // inside the modal: no lift
    expect(dialog.querySelector(HOST)!.childElementCount).toBe(0);
  });

  it('the slot survives the dialog content re-rendering, and the popover inside it too', () => {
    const label = signal('one');
    const dialog = overlay(
      () => html`<button id="anchor">${label.value}</button>`,
      {
        native: true,
        initialFocus: false,
      },
    );
    cleanups.push(() => dialog.close());
    const pop = popover(byId('anchor'), raw('<p id="menu">menu</p>'));
    cleanups.push(() => pop.close());

    label.value = 'two';
    expect(byId('anchor').textContent).toBe('two');
    expect(dialog.el.querySelector(HOST)).not.toBeNull();
    expect(byId('menu').isConnected).toBe(true);
  });

  it('Escape closes an Escape-dismissible popover first, then the dialog', () => {
    const dialog = openKerfDialog();
    const pop = popover(byId('anchor'), raw('<button>pick</button>'), {
      dismiss: ['escape', 'outside'],
    });
    const down = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true); // withheld from the dialog
    expect(pop.el.isConnected).toBe(false);
    expect((dialog.el as HTMLDialogElement).open).toBe(true);

    dialog.el.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.el.isConnected).toBe(false);
  });

  it('a dialog that is not open gives no slot (the popover renders in the body)', () => {
    const dialog = document.createElement('dialog');
    dialog.innerHTML = '<button id="anchor">a</button>';
    document.body.appendChild(dialog);
    const pop = popover(byId('anchor'), raw('<p>x</p>'));
    cleanups.push(() => pop.close());
    expect(pop.el.parentElement).toBe(document.body);
  });
});

describe('an app-owned modal <dialog>', () => {
  it('opts in by marking an element: the popover renders there and never warns', () => {
    const dialog = openAppDialog(
      '<button id="anchor">a</button><div data-kerf-overlay-host data-morph-skip></div>',
    );
    const pop = popover(byId('anchor'), raw('<button>pick</button>'));
    cleanups.push(() => pop.close());
    expect(pop.el.parentElement).toBe(dialog.querySelector(HOST));
    expect(warn).not.toHaveBeenCalled();
  });

  it('a slot belonging to a nested dialog is not used for the outer one', () => {
    const dialog = openAppDialog(
      '<button id="anchor">a</button><dialog><div data-kerf-overlay-host data-morph-skip></div></dialog>',
    );
    const pop = popover(byId('anchor'), raw('<p>x</p>'), {});
    cleanups.push(() => pop.close());
    expect(pop.el.parentElement).toBe(document.body);
    expect(dialog.querySelectorAll(HOST)).toHaveLength(1); // none created
  });

  it('without a marked element nothing is created: the lift + inert warning remain', () => {
    const proto = HTMLElement.prototype as {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    proto.showPopover = () => {};
    proto.hidePopover = () => {};
    cleanups.push(() => {
      delete proto.showPopover;
      delete proto.hidePopover;
    });
    const dialog = openAppDialog('<button id="anchor">a</button>');
    const pop = popover(byId('anchor'), raw('<button>pick</button>'));
    cleanups.unshift(() => pop.close());
    expect(pop.el.parentElement).toBe(document.body);
    expect(pop.el.getAttribute('popover')).toBe('manual');
    expect(dialog.querySelector(HOST)).toBeNull();
    expect(String(warn.mock.calls[0][0])).toMatch(/data-kerf-overlay-host/);
  });

  it('a kerf-mounted dialog content can host a popover in its slot (nested-mount boundary)', () => {
    const dialog = document.createElement('dialog');
    document.body.appendChild(dialog);
    const rows = signal([{ k: 'a' }, { k: 'b' }]);
    const label = signal('x');
    const heading = signal('h1'); // read as plain text: re-renders the surrounds
    const dispose = mount(
      dialog,
      () => html`<h2>${heading.value}</h2>
        <p class=${label}>${label}</p>
        <ul>${each(rows.value, (r) => html`<li data-key=${r.k}>${r.k}</li>`)}</ul>
        <button id="anchor">open</button>
        <div data-kerf-overlay-host data-morph-skip></div>`,
    );
    dialog.showModal();
    const matches = reportModal(dialog);
    cleanups.push(() => {
      matches.mockRestore();
      dispose();
    });

    // The popover's own content uses the same marker kinds as the dialog's.
    const inner = signal('i');
    const zRow = { k: 'z' };
    const pop = popover(
      byId('anchor'),
      () => html`<p class=${inner}>${inner}</p>
        <ol>${each([zRow], (r) => html`<li data-key=${r.k}>${r.k}</li>`)}</ol>`,
    );
    cleanups.unshift(() => pop.close());
    expect(pop.el.parentElement).toBe(dialog.querySelector(HOST));

    // Re-render the outer mount: its bindings and lists must stay its own.
    heading.value = 'h2';
    label.value = 'y';
    rows.value = [...rows.value, { k: 'c' }];
    expect(dialog.querySelector('p')!.className).toBe('y');
    expect(dialog.querySelector('p')!.textContent).toBe('y');
    expect(dialog.querySelectorAll('ul li')).toHaveLength(3);
    expect(pop.el.querySelector('p')!.className).toBe('i');
    expect(pop.el.querySelectorAll('ol li')).toHaveLength(1);
    inner.value = 'j';
    expect(pop.el.querySelector('p')!.textContent).toBe('j');
    expect(dialog.querySelector('p')!.textContent).toBe('y');
  });

  it('a mount over the dialog after a surface is inside its slot is not refused', () => {
    const dialog = openAppDialog(
      '<button id="anchor">a</button><div data-kerf-overlay-host data-morph-skip></div>',
    );
    const pop = popover(byId('anchor'), raw('<p>x</p>'));
    cleanups.unshift(() => pop.close());
    const dispose = mount(
      dialog,
      () =>
        html`<button id="anchor">a</button><div data-kerf-overlay-host data-morph-skip></div>`,
    );
    dispose();
  });

  it('an element marked without data-morph-skip is not a slot (the popover stays in the body)', () => {
    const dialog = openAppDialog(
      '<button id="anchor">a</button><div data-kerf-overlay-host></div>',
    );
    const pop = popover(byId('anchor'), raw('<p>x</p>'));
    cleanups.unshift(() => pop.close());
    expect(pop.el.parentElement).toBe(document.body);
    expect(dialog.querySelector(HOST)!.childElementCount).toBe(0);
  });
});
