import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/content-item.js';
import {
  isContentItemActivation,
  wireContentItems,
} from '../../src/wire-content-items.js';

describe('interactive ContentItem', () => {
  it('renders flush geometry and native title on static and interactive items', () => {
    const staticItem = String(
      ContentItem({ children: 'Preview', flush: true, title: 'Preview title' }),
    );
    expect(staticItem).toContain('kui-content-item--flush');
    expect(staticItem).toContain('title="Preview title"');
    const interactive = String(
      ContentItem({ interactive: true, action: 'open', title: 'Open title' }),
    );
    expect(interactive).toContain('title="Open title"');
    expect(interactive).not.toContain('kui-content-item--flush');
  });

  it('keeps static region and root metadata behavior', () => {
    const html = String(
      ContentItem({
        children: 'Details',
        ariaLabel: 'Details',
        focusTarget: true,
        rootAttributes: { 'data-action': 'existing-app-action' },
      }),
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('data-action="existing-app-action"');
    expect(html).not.toContain('data-interactive');
  });

  it('maps selection modes and protects interactive metadata', () => {
    const toggle = String(
      // @ts-expect-error interactive data-action is component-owned; runtime also filters JS callers
      ContentItem({
        interactive: true,
        action: 'pick',
        itemId: 'row-1',
        selectionMode: 'toggle',
        selected: true,
        children: 'Pick',
        rootAttributes: { 'data-action': 'override', 'data-note': 'safe' },
      }),
    );
    expect(toggle).toContain('role="button"');
    expect(toggle).toContain('aria-pressed="true"');
    expect(toggle).toContain('data-action="pick"');
    expect(toggle).toContain('data-item-id="row-1"');
    expect(toggle).toContain('data-note="safe"');
    expect(toggle).not.toContain('override');
    expect(toggle).not.toContain('aria-selected');

    const single = String(
      ContentItem({
        interactive: true,
        action: 'choose',
        selectionMode: 'single',
        selected: false,
      }),
    );
    expect(single).toContain('role="option"');
    expect(single).toContain('aria-selected="false"');
    expect(single).not.toContain('aria-pressed');

    const multiple = String(
      ContentItem({
        interactive: true,
        action: 'select',
        selectionMode: 'multiple',
        selected: true,
        children: <button type="button">Approve</button>,
      }),
    );
    expect(multiple).toContain('role="row"');
    expect(multiple).toContain('aria-selected="true"');
    expect(multiple).toContain('<div role="gridcell"><button');
    expect(multiple).not.toContain('aria-pressed');

    const disabled = String(
      ContentItem({ interactive: true, action: 'pick', disabled: true }),
    );
    expect(disabled).toContain('aria-disabled="true"');
    expect(disabled).toContain('tabindex="-1"');
    expect(disabled).not.toContain('data-action="pick"');
  });

  it('rejects incomplete interactive configuration', () => {
    expect(() => ContentItem({ interactive: true, action: '' })).toThrow(
      'requires an action',
    );
    expect(() =>
      ContentItem({ interactive: true, action: 'pick', selected: true }),
    ).toThrow('requires a selectionMode');
  });
});

describe('wireContentItems', () => {
  it('distinguishes card clicks from nested control clicks for app delegates', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <ContentItem interactive action="pick" selectionMode="multiple">
        <span>Copy</span>
        <button type="button">Open menu</button>
      </ContentItem>,
    );
    document.body.append(root);
    const card = root.firstElementChild as HTMLElement;
    const button = card.querySelector('button')!;
    const activations: boolean[] = [];
    root.addEventListener('click', (event) => {
      activations.push(isContentItemActivation(event, card));
    });
    card.click();
    button.click();
    expect(activations).toEqual([true, false]);
    root.remove();
  });

  it('moves focus between enabled multi-select rows without changing selection', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <div role="grid" aria-multiselectable="true">
        <ContentItem
          interactive
          action="pick"
          selectionMode="multiple"
          itemId="one"
        >
          One
        </ContentItem>
        <ContentItem
          interactive
          action="pick"
          selectionMode="multiple"
          itemId="two"
          disabled
        >
          Two
        </ContentItem>
        <ContentItem
          interactive
          action="pick"
          selectionMode="multiple"
          itemId="three"
        >
          <button type="button">Nested</button>
        </ContentItem>
      </div>,
    );
    document.body.append(root);
    const first = root.querySelector<HTMLElement>('[data-item-id="one"]')!;
    const last = root.querySelector<HTMLElement>('[data-item-id="three"]')!;
    const nested = last.querySelector('button')!;
    const stop = wireContentItems(root);
    const arrow = (target: Element, key: string) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    first.focus();
    expect(arrow(first, 'ArrowUp')).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(arrow(first, 'Home')).toBe(false);
    expect(arrow(first, 'ArrowDown')).toBe(false);
    expect(document.activeElement).toBe(last);
    expect(last.getAttribute('aria-selected')).toBe('false');
    expect(arrow(last, 'Home')).toBe(false);
    expect(document.activeElement).toBe(first);
    expect(arrow(first, 'End')).toBe(false);
    expect(document.activeElement).toBe(last);
    expect(arrow(last, 'ArrowDown')).toBe(true);
    expect(arrow(last, 'ArrowUp')).toBe(false);
    expect(document.activeElement).toBe(first);
    last.focus();
    nested.focus();
    expect(arrow(nested, 'ArrowUp')).toBe(true);
    expect(document.activeElement).toBe(nested);
    stop();
    root.remove();

    const isolated = document.createElement('div');
    isolated.innerHTML = String(
      <ContentItem interactive action="pick" selectionMode="multiple">
        Isolated
      </ContentItem>,
    );
    document.body.append(isolated);
    const stopIsolated = wireContentItems(isolated);
    const orphan = isolated.firstElementChild!;
    expect(arrow(orphan, 'ArrowDown')).toBe(true);
    stopIsolated();
    isolated.remove();
  });

  it('handles Enter and Space, cancellation, disabled state, and disposal', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <>
        <ContentItem interactive action="pick" itemId="one">
          One
        </ContentItem>
        <ContentItem interactive action="pick" itemId="two" disabled>
          Two
        </ContentItem>
        <button type="button">Outside</button>
      </>,
    );
    document.body.append(root);
    const first = root.querySelector<HTMLElement>('[data-item-id="one"]')!;
    const disabled = root.querySelector<HTMLElement>('[data-item-id="two"]')!;
    const outside = root.querySelector<HTMLButtonElement>('button')!;
    const activated: string[] = [];
    root.addEventListener('click', (event) => {
      const item = (event.target as Element).closest('[data-action="pick"]');
      if (item) activated.push(item.getAttribute('data-item-id') ?? '');
    });
    const stop = wireContentItems(root);
    const key = (
      target: Element,
      type: 'keydown' | 'keyup',
      value: string,
      repeat = false,
    ) =>
      target.dispatchEvent(
        new KeyboardEvent(type, { key: value, bubbles: true, repeat }),
      );

    first.focus();
    key(first, 'keydown', 'Enter');
    expect(activated).toEqual(['one']);
    key(first, 'keydown', ' ');
    key(first, 'keydown', ' ', true);
    expect(first.dataset.kuiPressed).toBe('true');
    expect(activated).toEqual(['one']);
    key(first, 'keyup', ' ');
    expect(activated).toEqual(['one', 'one']);
    expect(first.dataset.kuiPressed).toBeUndefined();

    key(first, 'keydown', ' ');
    outside.focus();
    key(first, 'keyup', ' ');
    expect(activated).toEqual(['one', 'one']);
    expect(first.dataset.kuiPressed).toBeUndefined();

    disabled.focus();
    key(disabled, 'keydown', 'Enter');
    key(disabled, 'keydown', ' ');
    key(disabled, 'keyup', ' ');
    expect(activated).toEqual(['one', 'one']);

    first.focus();
    stop();
    key(first, 'keydown', 'Enter');
    expect(activated).toEqual(['one', 'one']);
    root.remove();
  });

  it('ignores modified keys, nested controls, and unrelated events', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <ContentItem interactive action="pick" itemId="card">
        <span>Copy</span>
        <button type="button">Nested action</button>
      </ContentItem>,
    );
    document.body.append(root);
    const item = root.querySelector<HTMLElement>('[data-item-id="card"]')!;
    const nested = root.querySelector<HTMLButtonElement>('button')!;
    const copy = root.querySelector<HTMLElement>('span')!;
    let clicks = 0;
    item.addEventListener('click', () => clicks++);
    const stop = wireContentItems(root);
    item.focus();

    for (const modifier of ['altKey', 'ctrlKey', 'metaKey'] as const) {
      item.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          [modifier]: true,
        }),
      );
    }
    const prevented = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    prevented.preventDefault();
    item.dispatchEvent(prevented);
    nested.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    copy.firstChild?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    item.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    item.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(clicks).toBe(0);

    item.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Spacebar', bubbles: true }),
    );
    expect(item.dataset.kuiPressed).toBe('true');
    item.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Spacebar', bubbles: true }),
    );
    expect(clicks).toBe(1);
    stop();
    root.remove();
  });

  it('does not activate the card for a native control inside a custom-element shadow root', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <ContentItem interactive action="pick" itemId="card">
        Card
      </ContentItem>,
    );
    document.body.append(root);
    const item = root.querySelector<HTMLElement>('[data-item-id="card"]')!;
    const host = document.createElement('x-card-action');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    button.textContent = 'Nested action';
    shadow.append(button);
    item.append(host);
    let cardClicks = 0;
    item.addEventListener('click', (event) => {
      if (event.target === item) cardClicks++;
    });
    const stop = wireContentItems(root);
    for (const key of ['Enter', ' ']) {
      button.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      button.dispatchEvent(
        new KeyboardEvent('keyup', {
          key,
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
    }
    expect(cardClicks).toBe(0);
    expect(item.dataset.kuiPressed).toBeUndefined();

    item.focus();
    item.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(cardClicks).toBe(1);
    stop();
    root.remove();
  });

  it('cancels pending Space when the target changes or leaves the wired root', () => {
    const outer = document.createElement('div');
    outer.innerHTML = String(
      <>
        <ContentItem interactive action="pick" itemId="first">
          First
        </ContentItem>
        <ContentItem interactive action="pick" itemId="second">
          Second
        </ContentItem>
      </>,
    );
    document.body.append(outer);
    const first = outer.querySelector<HTMLElement>('[data-item-id="first"]')!;
    const second = outer.querySelector<HTMLElement>('[data-item-id="second"]')!;
    const ids: string[] = [];
    outer.addEventListener('click', (event) => {
      ids.push((event.target as HTMLElement).dataset.itemId ?? '');
    });
    const stop = wireContentItems(outer);
    first.focus();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
    );
    second.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true }),
    );
    expect(ids).toEqual([]);
    expect(first.dataset.kuiPressed).toBeUndefined();

    stop();

    const inner = document.createElement('div');
    first.append(inner);
    const stopInner = wireContentItems(inner);
    inner.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(ids).toEqual([]);
    stopInner();
    outer.remove();
  });
});
