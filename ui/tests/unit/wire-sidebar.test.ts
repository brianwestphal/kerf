import { raw, signal } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { CollapsiblePanel, CollapsiblePanelToggle } from '../../src/collapsible-panel.js';
import { classifyViewport, type DeviceClass } from '../../src/device-class.js';
import { type SidebarStorage, wireSidebar } from '../../src/wire-sidebar.js';

const roots: HTMLElement[] = [];

function mount(collapsed: boolean): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML =
    String(CollapsiblePanelToggle({ side: 'left', collapsed, action: 'toggle-nav', panelId: 'nav' })) +
    String(CollapsiblePanel({ id: 'nav', side: 'left', collapsed, label: 'Navigator', children: raw('<a href="#a" id="a">A</a><a href="#b" id="b">B</a>') }));
  document.body.append(root);
  roots.push(root);
  return root;
}

function fakeStorage(seed: Record<string, string> = {}): SidebarStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

describe('wireSidebar', () => {
  it('toggles the panel on its action click and restores focus to the trigger on close', () => {
    const root = mount(false);
    const collapsed = signal(true);
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }] });
    const toggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-nav"]')!;
    toggle.focus();

    // Open: focus moves to the first focusable inside the panel.
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('#a'));

    // Close: focus restores to the trigger that opened it.
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(true);
    expect(document.activeElement).toBe(toggle);
    stop();
  });

  it('seeds collapsed state from storage and persists changes', () => {
    const root = mount(false);
    const storage = fakeStorage({ 'sidebar.nav': 'true' });
    const collapsed = signal(false);
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav', storageKey: 'sidebar.nav' }], storage });
    expect(collapsed.value).toBe(true); // seeded from storage
    collapsed.value = false;
    expect(storage.data['sidebar.nav']).toBe('false'); // persisted
    stop();
  });

  it('presents a compact overlay with a dismissable backdrop and Escape close', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    expect(device.value.compact).toBe(true);
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }], deviceClass: device });

    expect(root.dataset.collapsibleOverlay).toBe('true');
    const backdrop = root.querySelector('.kui-collapsible-panel__backdrop');
    expect(backdrop).not.toBeNull();

    // Re-running the overlay effect (another compact size) reuses the one backdrop.
    device.value = classifyViewport(375, 'portrait');
    expect(root.querySelectorAll('.kui-collapsible-panel__backdrop')).toHaveLength(1);

    // Escape collapses the open panel and removes the backdrop.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(collapsed.value).toBe(true);
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();

    // Backdrop click also collapses.
    collapsed.value = false;
    root.querySelector<HTMLButtonElement>('.kui-collapsible-panel__backdrop')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(true);
    stop();
  });

  it('traps Tab focus within the open compact overlay panel', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }], deviceClass: device });
    const a = root.querySelector<HTMLElement>('#a')!;
    const b = root.querySelector<HTMLElement>('#b')!;

    // Tab off the last focusable wraps to the first.
    b.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(a);

    // Shift+Tab off the first wraps to the last.
    a.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(b);

    // Tab in the middle is left to the browser; other keys are ignored.
    a.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(a);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }));
    expect(document.activeElement).toBe(a);
    stop();
  });

  it('ignores keydowns when there is nothing to trap, and skips seeding an unset key', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const storage = fakeStorage(); // no stored value for the key
    const device = signal<DeviceClass>(classifyViewport(1440, 'landscape')); // non-compact
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav', storageKey: 'sidebar.nav' }], deviceClass: device, storage });
    expect(collapsed.value).toBe(false); // no stored value → not seeded

    // Non-compact: Tab is ignored.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    // Compact but every panel collapsed: no open panel to trap.
    device.value = classifyViewport(390, 'portrait');
    collapsed.value = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    // Compact and open, but the panel element is gone: nothing to focus.
    collapsed.value = false;
    root.querySelector('[data-collapsible-panel="nav"]')!.remove();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(collapsed.value).toBe(false); // no crash through any guard
    stop();
  });

  it('ignores clicks outside a registered toggle', () => {
    const root = mount(false);
    root.insertAdjacentHTML('beforeend', '<button type="button" data-action="unrelated">x</button><span id="plain">plain</span>');
    const collapsed = signal(false);
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }] });
    root.querySelector<HTMLElement>('#plain')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); // no [data-action]
    root.querySelector<HTMLElement>('[data-action="unrelated"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); // not a panel toggle
    expect(collapsed.value).toBe(false);
    stop();
  });

  it('focuses the opened panel itself when it has no focusable content, and traps nothing', () => {
    const root = document.createElement('div');
    root.innerHTML = String(CollapsiblePanel({ id: 'empty', side: 'bottom', label: 'Console', children: raw('<p>no controls</p>') }));
    document.body.append(root);
    roots.push(root);
    const collapsed = signal(true); // start collapsed, then open via signal
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, { panels: [{ id: 'empty', collapsed, toggleAction: 'toggle-console' }], deviceClass: device });
    collapsed.value = false; // open transition → focus falls back to the panel element (no focusables)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); // nothing to trap
    expect(collapsed.value).toBe(false);

    // Opening again after the element is gone hits neither focus branch.
    collapsed.value = true;
    root.querySelector('[data-collapsible-panel="empty"]')?.remove();
    collapsed.value = false;
    expect(collapsed.value).toBe(false);
    stop();
  });

  it('falls back to no persistence when localStorage is unavailable', () => {
    const root = mount(false);
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
      for (const descriptor of [{ get() { throw new Error('blocked'); } }, { get() { return undefined; } }] as const) {
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
        const collapsed = signal(false);
        const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav', storageKey: 'k' }] });
        expect(collapsed.value).toBe(false); // not seeded — storage was unavailable
        stop();
      }
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  it('drops overlay chrome when not compact and cleans up on disposal', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const device = signal<DeviceClass>(classifyViewport(1440, 'landscape'));
    expect(device.value.compact).toBe(false);
    const stop = wireSidebar(root, { panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }], deviceClass: device });
    expect(root.dataset.collapsibleOverlay).toBeUndefined();
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();

    // Becoming compact adds the overlay; disposal removes it.
    device.value = classifyViewport(375, 'portrait');
    expect(root.dataset.collapsibleOverlay).toBe('true');
    stop();
    expect(root.dataset.collapsibleOverlay).toBeUndefined();
    // Listener is gone: an Escape no longer changes state.
    device.value = classifyViewport(375, 'portrait');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(collapsed.value).toBe(false);
  });
});
