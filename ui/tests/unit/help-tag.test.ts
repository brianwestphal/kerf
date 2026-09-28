import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  HELP_TAG_SHOW_DELAY,
  HELP_TAG_VIEWPORT_MARGIN,
  HELP_TAG_WARM_WINDOW,
  installHelpTags,
} from '../../src/install-help-tag.js';

// Fakes of the Web Awesome members the help-tag boundary drives: a tooltip with
// `open` / `anchor` / `updateComplete`, and Select / Dropdown hosts with an
// open shadow root. The browser suite (tests/browser/select-help-tag.spec.ts)
// covers the real elements.
class FakeTooltip extends HTMLElement {
  open = false;
  anchor: Element | null = null;
  updateComplete: Promise<boolean> = Promise.resolve(true);
}

interface FakeHost extends HTMLElement {
  open: boolean;
  selectedOptions?: (HTMLElement & { label?: string })[];
}

let keyboardFocus = true;
// Each test's fake clock starts past the previous one, so no warm window
// (which lives in the installed listeners) carries across tests.
let clock = Date.now();
function fakeTime() {
  if (!vi.isFakeTimers()) vi.useFakeTimers({ now: (clock += 60_000) });
}

beforeAll(() => {
  customElements.define('wa-tooltip', FakeTooltip);
  installHelpTags(document, { focusVisible: () => keyboardFocus });
  // Idempotent: a second registration adds no second set of listeners.
  installHelpTags(document);
});

afterEach(() => {
  // Leave every trigger and let any warm window lapse.
  keyboardFocus = true;
  pointerOver(document.body);
  focusIn(document.body);
  if (vi.isFakeTimers()) vi.advanceTimersByTime(HELP_TAG_WARM_WINDOW + 1);
  vi.useRealTimers();
  document.body.replaceChildren();
});

function select({
  name = 'Filter by label',
  iconOnly = true,
  multipleSummary,
  choice,
}: {
  name?: string;
  iconOnly?: boolean;
  multipleSummary?: string;
  choice?: { label?: string; text?: string };
} = {}) {
  fakeTime();
  const host = document.createElement('wa-select') as FakeHost;
  host.open = false;
  host.dataset.component = 'select';
  host.dataset.selectedPresentation = iconOnly ? 'icon-only' : 'label';
  host.setAttribute('label', name);
  if (multipleSummary !== undefined) {
    const label = document.createElement('span');
    label.slot = 'label';
    label.innerHTML = `${name}<span class="kui-select__name-summary">${multipleSummary}</span>`;
    host.append(label);
  }
  if (choice) {
    const option = document.createElement('wa-option') as HTMLElement & {
      label?: string;
    };
    option.innerHTML = choice.text ?? '';
    if (choice.label !== undefined) option.label = choice.label;
    host.selectedOptions = [option];
    host.append(option);
  }
  const option = document.createElement('wa-option');
  host.append(option);
  const root = host.attachShadow({ mode: 'open' });
  const combobox = document.createElement('div');
  combobox.setAttribute('part', 'combobox');
  const input = document.createElement('input');
  combobox.append(input);
  const listbox = document.createElement('div');
  listbox.setAttribute('part', 'listbox');
  root.append(combobox, listbox);
  document.body.append(host);
  return { host, combobox, input, listbox, option };
}

function popupMenu({
  label = 'Sort tickets',
  shadow = true,
}: { label?: string | null; shadow?: boolean } = {}) {
  fakeTime();
  const host = document.createElement('wa-dropdown') as FakeHost;
  host.open = false;
  host.dataset.component = 'popup-menu';
  const trigger = document.createElement('wa-button');
  trigger.slot = 'trigger';
  const text = document.createElement('span');
  if (label === null) text.textContent = 'Actions';
  else {
    text.className = 'kui-popup-menu__label';
    text.textContent = label;
  }
  trigger.append(text);
  const item = document.createElement('wa-dropdown-item');
  host.append(trigger, item);
  if (shadow) host.attachShadow({ mode: 'open' });
  document.body.append(host);
  return { host, trigger, item };
}

const tagOf = (host: Element) =>
  host.shadowRoot?.querySelector<FakeTooltip>('wa-tooltip.kui-help-tag') ??
  null;

function pointerOver(target: EventTarget, pointerType = 'mouse') {
  target.dispatchEvent(
    new PointerEvent('pointerover', {
      bubbles: true,
      composed: true,
      pointerType,
    }),
  );
}

function pointerOutOfWindow(target: EventTarget) {
  target.dispatchEvent(
    new PointerEvent('pointerout', {
      bubbles: true,
      composed: true,
      relatedTarget: null,
    }),
  );
}

function pointerDown(target: EventTarget) {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, composed: true }),
  );
}

function focusIn(target: EventTarget) {
  target.dispatchEvent(
    new FocusEvent('focusin', { bubbles: true, composed: true }),
  );
}

function focusOut(target: EventTarget, relatedTarget: EventTarget | null) {
  target.dispatchEvent(
    new FocusEvent('focusout', {
      bubbles: true,
      composed: true,
      relatedTarget,
    }),
  );
}

function waShow(target: EventTarget) {
  target.dispatchEvent(
    new Event('wa-show', { bubbles: true, composed: true, cancelable: true }),
  );
}

describe('icon-only trigger help tags', () => {
  it('show a multiple filter name and chosen labels after the hover delay', async () => {
    const { host, combobox, input } = select({
      multipleSummary: ': Bug, Docs',
    });
    pointerOver(input);
    expect(tagOf(host)).toBeNull();
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY - 1);
    expect(tagOf(host)).toBeNull();
    vi.advanceTimersByTime(1);
    const tag = tagOf(host)!;
    expect(tag.open).toBe(true);
    expect(tag.textContent).toBe('Filter by label: Bug, Docs');
    expect(tag.anchor).toBe(combobox);
    // Aria-hidden and not wired through `for`, so it never renames the trigger.
    expect(tag.getAttribute('aria-hidden')).toBe('true');
    expect(tag.getAttribute('trigger')).toBe('manual');
    expect(tag.hasAttribute('for')).toBe(false);
    expect(tag.getAttribute('placement')).toBe('bottom');
    expect(tag.style.pointerEvents).toBe('none');
    // A first update that resets the anchor is corrected afterwards, and the
    // tag's popup keeps clear of the viewport edge.
    tag.anchor = null;
    const popup = document.createElement('wa-popup') as HTMLElement & {
      shiftPadding?: number;
    };
    tag.attachShadow({ mode: 'open' }).append(popup);
    await tag.updateComplete;
    await Promise.resolve();
    expect(tag.anchor).toBe(combobox);
    expect(popup.shiftPadding).toBe(HELP_TAG_VIEWPORT_MARGIN);

    // Moving within the trigger keeps it; leaving hides it.
    pointerOver(combobox);
    expect(tag.open).toBe(true);
    pointerOver(document.body);
    expect(tag.open).toBe(false);
  });

  it("keeps the tag's lifecycle events from reaching the control", () => {
    const { host, input } = select({ multipleSummary: '' });
    const heard = vi.fn();
    host.addEventListener('wa-show', heard);
    host.addEventListener('wa-after-hide', heard);
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    const tag = tagOf(host)!;
    expect(tag.textContent).toBe('Filter by label');
    tag.dispatchEvent(new Event('wa-show', { bubbles: true, composed: true }));
    tag.dispatchEvent(
      new Event('wa-after-hide', { bubbles: true, composed: true }),
    );
    expect(heard).not.toHaveBeenCalled();
    // The tag's own wa-show is not the control opening.
    expect(tag.open).toBe(true);
  });

  it('names a single Select and its current choice, and follows a change', () => {
    const { host, input } = select({
      name: 'Rendering balance',
      choice: { label: 'Balanced' },
    });
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    const tag = tagOf(host)!;
    expect(tag.textContent).toBe('Rendering balance: Balanced');
    host.selectedOptions![0]!.label = 'Quiet';
    host.dispatchEvent(new Event('change', { bubbles: true }));
    expect(tag.textContent).toBe('Rendering balance: Quiet');
    host.selectedOptions![0]!.label = 'Explicit';
    host.dispatchEvent(new Event('input', { bubbles: true }));
    expect(tag.textContent).toBe('Rendering balance: Explicit');
    // A change on another control leaves the tag alone.
    const other = select({ name: 'Other', choice: { label: 'A' } });
    other.host.dispatchEvent(new Event('change', { bubbles: true }));
    document.body.dispatchEvent(new Event('change', { bubbles: true }));
    expect(tag.textContent).toBe('Rendering balance: Explicit');
  });

  it('falls back to option text and to the bare name', () => {
    const fromText = select({
      name: 'Mode',
      choice: { text: '  <span></span>\n  Quiet  ' },
    });
    focusIn(fromText.input);
    expect(tagOf(fromText.host)!.textContent).toBe('Mode: Quiet');
    const same = select({ name: 'Mode', choice: { label: 'Mode' } });
    focusIn(same.input);
    expect(tagOf(same.host)!.textContent).toBe('Mode');
    const none = select({ name: 'Mode' });
    focusIn(none.input);
    expect(tagOf(none.host)!.textContent).toBe('Mode');
    const empty = select({ name: '', choice: { text: '' } });
    empty.host.removeAttribute('label');
    focusIn(empty.input);
    expect(tagOf(empty.host)).toBeNull();
  });

  it('ignores labeled Selects, text PopupMenus, the popup, and touch', () => {
    const labeled = select({ iconOnly: false });
    pointerOver(labeled.input);
    focusIn(labeled.input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(labeled.host)).toBeNull();

    const text = popupMenu({ label: null });
    pointerOver(text.trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(text.host)).toBeNull();

    const filter = select({ multipleSummary: '' });
    pointerOver(filter.listbox);
    pointerOver(filter.option);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(filter.host)).toBeNull();
    pointerOver(filter.input, 'touch');
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(filter.host)).toBeNull();
  });

  it('names an icon-only PopupMenu trigger; a host without a shadow root gets none', () => {
    const { host, trigger } = popupMenu();
    pointerOver(trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    const tag = tagOf(host)!;
    expect(tag.textContent).toBe('Sort tickets');
    expect(tag.anchor).toBe(trigger);

    const bare = popupMenu({ shadow: false });
    pointerOver(bare.trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(bare.host.querySelector('wa-tooltip')).toBeNull();
    // The previous tag closed when the pointer moved to the new trigger.
    expect(tag.open).toBe(false);

    const unnamed = popupMenu({ label: '' });
    pointerOver(unnamed.trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(unnamed.host)).toBeNull();
  });

  it('shows at once on keyboard focus, never on a click focus', () => {
    const { host, input, option } = select({ multipleSummary: ': Bug' });
    keyboardFocus = false;
    focusIn(input);
    expect(tagOf(host)).toBeNull();
    focusOut(input, null);
    keyboardFocus = true;
    focusIn(input);
    const tag = tagOf(host)!;
    expect(tag.open).toBe(true);
    // Re-focusing the same trigger changes nothing.
    focusIn(input);
    expect(tag.open).toBe(true);
    // Focus moving within the control is handled by focusin, not focusout.
    focusOut(input, option);
    expect(tag.open).toBe(true);
    // Focus leaving the trigger hides the tag.
    focusOut(input, document.body);
    expect(tag.open).toBe(false);
    focusOut(document.body, null);
  });

  it('keeps a focus tag while the pointer leaves, and a hover tag while focus leaves', () => {
    const { host, input } = select({ multipleSummary: '' });
    focusIn(input);
    const tag = tagOf(host)!;
    pointerOver(input);
    expect(tag.open).toBe(true);
    pointerOver(document.body);
    expect(tag.open).toBe(true);
    focusIn(document.body);
    expect(tag.open).toBe(false);

    vi.advanceTimersByTime(HELP_TAG_WARM_WINDOW + 1);
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(true);
    focusIn(input);
    focusOut(input, null);
    expect(tag.open).toBe(true);
    pointerOutOfWindow(input);
    expect(tag.open).toBe(false);
    // A pointerout to another element is not leaving the window.
    input.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        composed: true,
        relatedTarget: document.body,
      }),
    );
    pointerOutOfWindow(document.body);
  });

  it('hovering another trigger replaces a focus tag', () => {
    const focused = popupMenu({ label: 'Sort' });
    const hovered = popupMenu({ label: 'More' });
    focusIn(focused.trigger);
    expect(tagOf(focused.host)!.open).toBe(true);
    pointerOver(hovered.trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(hovered.host)!.open).toBe(true);
    expect(tagOf(focused.host)!.open).toBe(false);
    // Hovering the focused trigger (whose tag the hover replaced) reopens it.
    pointerOver(focused.trigger);
    expect(tagOf(focused.host)!.open).toBe(true);
    expect(tagOf(hovered.host)!.open).toBe(false);
  });

  it('shows a neighbor at once while warm, after the delay once cold', () => {
    const first = popupMenu({ label: 'Sort' });
    const second = popupMenu({ label: 'More' });
    pointerOver(first.trigger);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    pointerOver(document.body);
    pointerOver(second.trigger);
    expect(tagOf(second.host)!.open).toBe(true);
    pointerOver(document.body);
    vi.advanceTimersByTime(HELP_TAG_WARM_WINDOW + 1);
    pointerOver(first.trigger);
    expect(tagOf(first.host)!.open).toBe(false);
    // Leaving before the delay cancels the pending tag.
    pointerOver(document.body);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(first.host)!.open).toBe(false);
  });

  it('hides for the open popup and stays hidden until the pointer moves elsewhere', () => {
    const { host, input, option } = select({ multipleSummary: '' });
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    const tag = tagOf(host)!;
    pointerDown(input);
    expect(tag.open).toBe(false);
    host.open = true;
    waShow(host);
    // The pointer in the open popup, and back on the trigger, shows nothing.
    pointerOver(option);
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(false);
    host.open = false;
    // Still on the trigger after the popup closes: still dismissed.
    pointerOver(input.parentElement!);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(false);
    pointerOver(document.body);
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(true);
    // An open popup never shows a tag.
    pointerOver(document.body);
    host.open = true;
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(false);
    host.open = false;
  });

  it('hides a keyboard tag when its popup opens and not again when it closes', () => {
    const { host, input, option } = select({ multipleSummary: '' });
    focusIn(input);
    const tag = tagOf(host)!;
    host.open = true;
    waShow(host);
    expect(tag.open).toBe(false);
    // Focus visits the popup and returns to the trigger on close.
    focusOut(input, host);
    focusIn(option);
    host.open = false;
    focusIn(input);
    expect(tag.open).toBe(false);
    // Tabbing away ends the dismissal; returning shows it again.
    focusOut(input, document.body);
    focusIn(document.body);
    focusIn(input);
    expect(tag.open).toBe(true);
    // A wa-show from something inside the control is not the popup opening.
    option.dispatchEvent(
      new Event('wa-show', { bubbles: true, composed: true }),
    );
    expect(tag.open).toBe(true);
    waShow(document.body);
    expect(tag.open).toBe(true);
  });

  it('dismisses on Escape until focus leaves', () => {
    const { host, input } = select({ multipleSummary: '' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    focusIn(input);
    const tag = tagOf(host)!;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(tag.open).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(tag.open).toBe(false);
    pointerOver(input);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tag.open).toBe(false);
    focusOut(input, null);
    focusIn(input);
    expect(tag.open).toBe(true);
  });

  it('does not show for a trigger removed before its hover delay', () => {
    const { host, input } = select({ multipleSummary: '' });
    pointerOver(input);
    host.remove();
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(tagOf(host)).toBeNull();
  });

  it('ignores a pointer press outside any trigger', () => {
    const { host, input } = select({ multipleSummary: '' });
    pointerDown(document.body);
    focusIn(input);
    expect(tagOf(host)!.open).toBe(true);
  });

  it('treats a select without a shadow root as having no trigger', () => {
    fakeTime();
    const host = document.createElement('wa-select');
    host.dataset.component = 'select';
    host.dataset.selectedPresentation = 'icon-only';
    const inner = document.createElement('span');
    host.append(inner);
    document.body.append(host);
    focusIn(inner);
    pointerOver(inner);
    vi.advanceTimersByTime(HELP_TAG_SHOW_DELAY);
    expect(host.querySelector('wa-tooltip')).toBeNull();
    // A non-HTMLElement event target on the path is skipped.
    focusIn(document);
  });
});

describe('focus-visible default', () => {
  it('reads :focus-visible and treats an unsupported selector as not visible', async () => {
    vi.resetModules();
    const { installHelpTags: install } =
      await import('../../src/install-help-tag.js');
    const doc = document.implementation.createHTMLDocument('help');
    install(doc);
    const host = doc.createElement('wa-dropdown');
    host.dataset.component = 'popup-menu';
    const trigger = doc.createElement('wa-button');
    trigger.slot = 'trigger';
    trigger.innerHTML = '<span class="kui-popup-menu__label">Sort</span>';
    host.append(trigger);
    host.attachShadow({ mode: 'open' });
    doc.body.append(host);
    const matches = vi
      .spyOn(trigger, 'matches')
      .mockImplementationOnce(() => {
        throw new SyntaxError('unsupported');
      })
      .mockImplementationOnce(() => false);
    focusIn(trigger);
    focusIn(doc.body);
    focusIn(trigger);
    expect(matches).toHaveBeenCalledWith(':focus-visible');
    expect(host.shadowRoot!.querySelector('wa-tooltip')).toBeNull();
  });
});
