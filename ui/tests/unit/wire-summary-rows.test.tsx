import { mount, signal } from 'kerfjs';
import { describe, expect, it } from 'vitest';

import { List } from '../../src/components/collections/list/list.js';
import { SummaryRow } from '../../src/components/collections/summary-row/summary-row.js';
import { wireSummaryRows } from '../../src/components/collections/summary-row/wiring/wire-summary-rows.js';

const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

const press = (
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
  type: 'keydown' | 'keyup' = 'keydown',
) =>
  target.dispatchEvent(
    new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init }),
  );

function ticketList(selected: () => string | undefined, ids: string[]) {
  return (
    <List selectionMode="single" ariaLabel="Tickets">
      {ids.map((id) => (
        <SummaryRow
          title={<span>{id}</span>}
          selected={selected() === id}
          rootAttributes={{
            'data-action': 'select-ticket',
            'data-item-id': id,
          }}
        />
      ))}
    </List>
  );
}

describe('wireSummaryRows', () => {
  it('makes a SummaryRow listbox one roving Tab stop that survives re-renders', async () => {
    const selected = signal<string | undefined>('b');
    const ids = signal(['a', 'b', 'c']);
    const root = document.createElement('div');
    document.body.append(root);
    const dispose = mount(root, () =>
      ticketList(() => selected.value, ids.value),
    );
    const row = (id: string) =>
      root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
    const stops = () =>
      ids.value.map((id) => `${id}:${row(id).getAttribute('tabindex')}`);
    // Unwired, every option is a Tab stop (the server-rendered default).
    expect(stops()).toEqual(['a:0', 'b:0', 'c:0']);
    const stop = wireSummaryRows(root);
    // The selected option is the stop.
    expect(stops()).toEqual(['a:-1', 'b:0', 'c:-1']);
    // Focus moves the stop, and a re-render keeps it on the focused option.
    row('c').focus();
    expect(stops()).toEqual(['a:-1', 'b:-1', 'c:0']);
    selected.value = 'a';
    await flush();
    expect(stops()).toEqual(['a:-1', 'b:-1', 'c:0']);
    // Removing the focused option falls back to the selected one, then to the
    // first option when nothing is selected.
    ids.value = ['a', 'b'];
    await flush();
    expect(stops()).toEqual(['a:0', 'b:-1']);
    selected.value = undefined;
    row('b').focus();
    ids.value = ['a'];
    await flush();
    expect(stops()).toEqual(['a:0']);
    // Disposal stops managing the stop.
    stop();
    ids.value = ['a', 'b'];
    await flush();
    expect(stops()).toEqual(['a:0', 'b:0']);
    dispose();
    root.remove();
  });

  it('moves focus with Up/Down/Home/End and selects with Enter and Space', () => {
    const selected = signal<string | undefined>('a');
    const root = document.createElement('div');
    document.body.append(root);
    const dispose = mount(root, () =>
      ticketList(() => selected.value, ['a', 'b', 'c']),
    );
    const clicks: string[] = [];
    root.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        '[data-action="select-ticket"]',
      )!;
      const flags = (['shiftKey', 'ctrlKey', 'metaKey'] as const).filter(
        (flag) => (event as MouseEvent)[flag],
      );
      clicks.push([target.dataset.itemId, ...flags].join('+'));
      selected.value = target.dataset.itemId;
    });
    const stop = wireSummaryRows(root);
    const row = (id: string) =>
      root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
    row('a').focus();
    expect(press(row('a'), 'ArrowUp')).toBe(true);
    expect(press(row('a'), 'ArrowDown')).toBe(false);
    expect(document.activeElement).toBe(row('b'));
    // Movement never selects.
    expect(row('b').getAttribute('aria-selected')).toBe('false');
    expect(press(row('b'), 'End')).toBe(false);
    expect(document.activeElement).toBe(row('c'));
    expect(press(row('c'), 'ArrowDown')).toBe(true);
    expect(press(row('c'), 'Home')).toBe(false);
    expect(document.activeElement).toBe(row('a'));
    expect(press(row('a'), 'ArrowDown')).toBe(false);
    expect(press(row('b'), 'ArrowUp')).toBe(false);
    expect(document.activeElement).toBe(row('a'));
    // Ctrl/Meta movement, Alt keys, and other keys are the platform's.
    expect(press(row('a'), 'ArrowDown', { ctrlKey: true })).toBe(true);
    expect(press(row('a'), 'End', { metaKey: true })).toBe(true);
    expect(press(row('a'), 'ArrowDown', { altKey: true })).toBe(true);
    expect(press(row('a'), 'Enter', { altKey: true })).toBe(true);
    expect(press(row('a'), 'ArrowRight')).toBe(true);
    expect(press(row('a'), 'x')).toBe(true);
    expect(document.activeElement).toBe(row('a'));
    expect(clicks).toEqual([]);

    // Enter selects now, with the key's modifiers on the click.
    row('b').focus();
    expect(press(row('b'), 'Enter', { shiftKey: true })).toBe(false);
    expect(clicks).toEqual(['b+shiftKey']);
    expect(row('b').getAttribute('aria-selected')).toBe('true');
    // Space selects on release, marks the press, and ignores auto-repeat.
    row('c').focus();
    expect(press(row('c'), ' ', { metaKey: true })).toBe(false);
    expect(row('c').getAttribute('data-kui-pressed')).toBe('true');
    expect(press(row('c'), ' ', { repeat: true })).toBe(false);
    expect(clicks).toEqual(['b+shiftKey']);
    press(row('c'), ' ', {}, 'keyup');
    expect(row('c').hasAttribute('data-kui-pressed')).toBe(false);
    expect(clicks).toEqual(['b+shiftKey', 'c+metaKey']);
    // A keyup with no pending press, or of another key, does nothing.
    press(row('c'), ' ', {}, 'keyup');
    press(row('c'), 'Enter', {}, 'keyup');
    expect(clicks).toHaveLength(2);
    // Leaving the option cancels a pending Space.
    press(row('c'), 'Spacebar');
    row('a').focus();
    expect(row('c').hasAttribute('data-kui-pressed')).toBe(false);
    press(row('a'), 'Spacebar', {}, 'keyup');
    expect(clicks).toHaveLength(2);
    // A release that lands elsewhere does not activate.
    press(row('a'), ' ');
    press(root, ' ', {}, 'keyup');
    expect(clicks).toHaveLength(2);
    // Focus moving elsewhere while Space is pending does not cancel another
    // option's press.
    press(row('a'), ' ');
    row('b').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(row('a').getAttribute('data-kui-pressed')).toBe('true');
    stop();
    expect(row('a').hasAttribute('data-kui-pressed')).toBe(false);
    // After disposal nothing is handled.
    expect(press(row('a'), 'ArrowDown')).toBe(true);
    dispose();
    root.remove();
  });

  it('lets an app intercept any key with preventDefault before Kerf handles it', () => {
    const root = document.createElement('div');
    root.innerHTML = String(ticketList(() => undefined, ['a', 'b']));
    document.body.append(root);
    const clicks: string[] = [];
    root.addEventListener('click', () => clicks.push('click'));
    const row = (id: string) =>
      root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
    // The app claims keys on the option itself, ahead of Kerf's root listener.
    const claim = (event: Event) => event.preventDefault();
    row('a').addEventListener('keydown', claim);
    const stop = wireSummaryRows(root);
    row('a').focus();
    for (const key of ['ArrowDown', 'End', 'Enter', ' ']) {
      expect(press(row('a'), key)).toBe(false);
      expect(document.activeElement).toBe(row('a'));
    }
    press(row('a'), ' ', {}, 'keyup');
    expect(row('a').hasAttribute('data-kui-pressed')).toBe(false);
    expect(clicks).toEqual([]);
    // Without the claim, Kerf handles the same key.
    row('a').removeEventListener('keydown', claim);
    press(row('a'), 'ArrowDown');
    expect(document.activeElement).toBe(row('b'));
    stop();
    root.remove();
  });

  it('leaves group rows, options outside a listbox, and other lists alone', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <div>
        <SummaryRow
          title={<span>Loose</span>}
          rootAttributes={{ 'data-item-id': 'loose' }}
        />
        <SummaryRow
          semanticRole="group"
          ariaLabel="Diagnostic"
          title={<button type="button">Open</button>}
          rootAttributes={{ 'data-item-id': 'group' }}
        />
        <div role="listbox" aria-multiselectable="true">
          <SummaryRow
            title={<span>Multi</span>}
            rootAttributes={{ 'data-item-id': 'multi' }}
          />
        </div>
        <List selectionMode="single" ariaLabel="Empty" />
      </div>,
    );
    document.body.append(root);
    const clicks: string[] = [];
    root.addEventListener('click', () => clicks.push('click'));
    const stop = wireSummaryRows(root);
    const row = (id: string) =>
      root.querySelector<HTMLElement>(`[data-item-id="${id}"]`)!;
    expect(row('loose').getAttribute('tabindex')).toBe('0');
    expect(row('multi').getAttribute('tabindex')).toBe('0');
    for (const id of ['loose', 'multi']) {
      row(id).focus();
      expect(press(row(id), 'ArrowDown')).toBe(true);
      expect(press(row(id), 'Enter')).toBe(true);
    }
    const button = row('group').querySelector('button')!;
    button.focus();
    expect(press(button, 'Enter')).toBe(true);
    // Keys from text inside an option, or outside the wired root, are skipped.
    const text = root.querySelector('[data-item-id="loose"] span')!.firstChild!;
    expect(press(text as unknown as Element, 'Enter')).toBe(true);
    const outside = document.createElement('div');
    outside.innerHTML = String(ticketList(() => undefined, ['x']));
    document.body.append(outside);
    const foreign = outside.querySelector<HTMLElement>('[role="option"]')!;
    foreign.focus();
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(clicks).toEqual([]);
    stop();
    outside.remove();
    root.remove();
  });

  it('wires a root that is itself the listbox', () => {
    const host = document.createElement('div');
    host.innerHTML = String(ticketList(() => 'b', ['a', 'b']));
    document.body.append(host);
    const listbox = host.querySelector<HTMLElement>('[role="listbox"]')!;
    const stop = wireSummaryRows(listbox);
    expect(
      [...listbox.querySelectorAll('[role="option"]')].map((node) =>
        node.getAttribute('tabindex'),
      ),
    ).toEqual(['-1', '0']);
    stop();
    host.remove();
  });
});
