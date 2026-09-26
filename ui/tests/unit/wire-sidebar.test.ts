import { effect, mount as mount$, raw, signal } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CollapsiblePanel,
  CollapsiblePanelToggle,
} from '../../src/collapsible-panel.js';
import { classifyViewport, type DeviceClass } from '../../src/device-class.js';
import { type SidebarStorage, wireSidebar } from '../../src/wire-sidebar.js';

const roots: HTMLElement[] = [];

function mount(collapsed: boolean): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML =
    String(
      CollapsiblePanelToggle({
        side: 'left',
        collapsed,
        action: 'toggle-nav',
        panelId: 'nav',
      }),
    ) +
    String(
      CollapsiblePanel({
        id: 'nav',
        side: 'left',
        collapsed,
        label: 'Navigator',
        children: raw('<a href="#a" id="a">A</a><a href="#b" id="b">B</a>'),
      }),
    );
  document.body.append(root);
  roots.push(root);
  return root;
}

function fakeStorage(
  seed: Record<string, string> = {},
): SidebarStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

describe('wireSidebar', () => {
  it('toggles the panel on its action click and restores focus to the trigger on close', () => {
    const root = mount(false);
    const collapsed = signal(true);
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
    });
    const toggle = root.querySelector<HTMLButtonElement>(
      '[data-action="toggle-nav"]',
    )!;
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

  it('moves focus to the outside toggle when the trigger lives inside the collapsed panel', () => {
    const root = mount(false);
    const inner = document.createElement('button');
    inner.dataset.action = 'toggle-nav';
    root.querySelector('[data-collapsible-panel="nav"]')!.prepend(inner);
    const outside = root.querySelector<HTMLButtonElement>(
      ':scope > [data-action="toggle-nav"]',
    )!;
    const collapsed = signal(false);
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
    });
    inner.focus();
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(true);
    // Not the now-hidden trigger: the panel's toggle outside it.
    expect(document.activeElement).toBe(outside);
    stop();
  });

  it('waits for an expand toggle the app renders only once the panel collapses', async () => {
    const root = mount(false);
    const outside = root.querySelector<HTMLButtonElement>(
      ':scope > [data-action="toggle-nav"]',
    )!;
    outside.remove();
    const inner = document.createElement('button');
    inner.dataset.action = 'toggle-nav';
    root.querySelector('[data-collapsible-panel="nav"]')!.prepend(inner);
    const collapsed = signal(false);
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
    });
    // Stand-in for an app that subscribed AFTER the wire, so it renders its
    // expand toggle only after the wire's focus effect already looked for it.
    const stopRender = effect(() => {
      if (collapsed.value) root.prepend(outside);
      else outside.remove();
    });
    inner.focus();
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.activeElement).toBe(outside);

    // Reopened before the retry runs: the retry leaves focus alone.
    collapsed.value = false;
    inner.focus();
    collapsed.value = true;
    collapsed.value = false;
    await Promise.resolve();
    await Promise.resolve();
    expect(collapsed.value).toBe(false);
    stopRender();
    stop();
  });

  it('seeds collapsed state from storage and persists changes', () => {
    const root = mount(false);
    const storage = fakeStorage({ 'sidebar.nav': 'true' });
    const collapsed = signal(false);
    const stop = wireSidebar(root, {
      panels: [
        {
          id: 'nav',
          collapsed,
          toggleAction: 'toggle-nav',
          storageKey: 'sidebar.nav',
        },
      ],
      storage,
    });
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
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
      deviceClass: device,
    });

    expect(root.dataset.collapsibleOverlay).toBe('true');
    // The overlay starts closed; a user toggle opens it with its backdrop.
    expect(collapsed.value).toBe(true);
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();
    root
      .querySelector<HTMLElement>('[data-action="toggle-nav"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(false);
    const backdrop = root.querySelector('.kui-collapsible-panel__backdrop');
    expect(backdrop).not.toBeNull();

    // Re-running the overlay effect (another compact size) reuses the one backdrop.
    device.value = classifyViewport(375, 'portrait');
    expect(
      root.querySelectorAll('.kui-collapsible-panel__backdrop'),
    ).toHaveLength(1);

    // Escape collapses the open panel and removes the backdrop.
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(collapsed.value).toBe(true);
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();

    // Backdrop click also collapses.
    collapsed.value = false;
    root
      .querySelector<HTMLButtonElement>('.kui-collapsible-panel__backdrop')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(true);
    stop();
  });

  it('supports a hidden compact replacement without overlay focus or backdrop', () => {
    const root = mount(false);
    const collapsed = signal(true);
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
      deviceClass: device,
      compactPresentation: 'hidden',
    });
    expect(root.dataset.collapsibleResponsive).toBe('hidden');
    expect(root.dataset.collapsibleOverlay).toBe('false');
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();
    root
      .querySelector<HTMLElement>('[data-action="toggle-nav"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(collapsed.value).toBe(false);
    expect(document.activeElement).not.toBe(root.querySelector('#a'));
    device.value = classifyViewport(1440, 'landscape');
    expect(root.dataset.collapsibleResponsive).toBe('inline');
    stop();
    expect(root.dataset.collapsibleResponsive).toBeUndefined();
  });

  it('keeps compact overlays exclusive when another panel opens', () => {
    const root = mount(false);
    root.insertAdjacentHTML(
      'beforeend',
      '<button data-action="toggle-inspector">Inspector</button>',
    );
    const nav = signal(false);
    const inspector = signal(true);
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, {
      panels: [
        { id: 'nav', collapsed: nav, toggleAction: 'toggle-nav' },
        {
          id: 'inspector',
          collapsed: inspector,
          toggleAction: 'toggle-inspector',
        },
      ],
      deviceClass: device,
    });
    root
      .querySelector<HTMLElement>('[data-action="toggle-nav"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(nav.value).toBe(false);
    root
      .querySelector<HTMLElement>('[data-action="toggle-inspector"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(inspector.value).toBe(false);
    expect(nav.value).toBe(true);
    root
      .querySelector<HTMLElement>('.kui-collapsible-panel__backdrop')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(inspector.value).toBe(true);
    stop();
  });

  it('traps Tab focus within the open compact overlay panel', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
      deviceClass: device,
    });
    collapsed.value = false; // the user opens the overlay
    const a = root.querySelector<HTMLElement>('#a')!;
    const b = root.querySelector<HTMLElement>('#b')!;

    // Tab off the last focusable wraps to the first.
    b.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(a);

    // Shift+Tab off the first wraps to the last.
    a.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(b);

    // Tab in the middle is left to the browser; other keys are ignored.
    a.focus();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(a);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true }),
    );
    expect(document.activeElement).toBe(a);
    stop();
  });

  it('ignores keydowns when there is nothing to trap, and skips seeding an unset key', () => {
    const root = mount(false);
    const collapsed = signal(false);
    const storage = fakeStorage(); // no stored value for the key
    const device = signal<DeviceClass>(classifyViewport(1440, 'landscape')); // non-compact
    const stop = wireSidebar(root, {
      panels: [
        {
          id: 'nav',
          collapsed,
          toggleAction: 'toggle-nav',
          storageKey: 'sidebar.nav',
        },
      ],
      deviceClass: device,
      storage,
    });
    expect(collapsed.value).toBe(false); // no stored value → not seeded

    // Non-compact: Tab is ignored.
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    // Compact but every panel collapsed: no open panel to trap.
    device.value = classifyViewport(390, 'portrait');
    collapsed.value = true;
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    // Compact and open, but the panel element is gone: nothing to focus.
    collapsed.value = false;
    root.querySelector('[data-collapsible-panel="nav"]')!.remove();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(collapsed.value).toBe(false); // no crash through any guard
    stop();
  });

  it('ignores clicks outside a registered toggle', () => {
    const root = mount(false);
    root.insertAdjacentHTML(
      'beforeend',
      '<button type="button" data-action="unrelated">x</button><span id="plain">plain</span>',
    );
    const collapsed = signal(false);
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
    });
    root
      .querySelector<HTMLElement>('#plain')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })); // no [data-action]
    root
      .querySelector<HTMLElement>('[data-action="unrelated"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true })); // not a panel toggle
    expect(collapsed.value).toBe(false);
    stop();
  });

  it('focuses the opened panel itself when it has no focusable content, and traps nothing', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      CollapsiblePanel({
        id: 'empty',
        side: 'bottom',
        label: 'Console',
        children: raw('<p>no controls</p>'),
      }),
    );
    document.body.append(root);
    roots.push(root);
    const collapsed = signal(true); // start collapsed, then open via signal
    const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
    const stop = wireSidebar(root, {
      panels: [{ id: 'empty', collapsed, toggleAction: 'toggle-console' }],
      deviceClass: device,
    });
    collapsed.value = false; // open transition → focus falls back to the panel element (no focusables)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    ); // nothing to trap
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
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage',
    );
    try {
      for (const descriptor of [
        {
          get() {
            throw new Error('blocked');
          },
        },
        {
          get() {
            return undefined;
          },
        },
      ] as const) {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          ...descriptor,
        });
        const collapsed = signal(false);
        const stop = wireSidebar(root, {
          panels: [
            {
              id: 'nav',
              collapsed,
              toggleAction: 'toggle-nav',
              storageKey: 'k',
            },
          ],
        });
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
    const stop = wireSidebar(root, {
      panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
      deviceClass: device,
    });
    expect(root.dataset.collapsibleOverlay).toBeUndefined();
    expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();

    // Becoming compact adds the overlay; disposal removes it.
    device.value = classifyViewport(375, 'portrait');
    expect(root.dataset.collapsibleOverlay).toBe('true');
    stop();
    expect(root.dataset.collapsibleOverlay).toBeUndefined();
    // Listener is gone: an Escape no longer changes state.
    device.value = classifyViewport(375, 'portrait');
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(collapsed.value).toBe(false);
  });
  describe('compact overlay initial-state contract', () => {
    const wire = (
      collapsed: ReturnType<typeof signal<boolean>>,
      device: ReturnType<typeof signal<DeviceClass>>,
      storage?: SidebarStorage,
    ) =>
      wireSidebar(mount(collapsed.value), {
        panels: [
          {
            id: 'nav',
            collapsed,
            toggleAction: 'toggle-nav',
            storageKey: 'sidebar.nav',
          },
        ],
        deviceClass: device,
        storage: storage ?? fakeStorage(),
      });

    it('starts collapsed on a compact device even when the inline default is open', () => {
      const collapsed = signal(false);
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const outside = document.createElement('button');
      document.body.append(outside);
      outside.focus();
      const stop = wire(collapsed, device);
      expect(collapsed.value).toBe(true);
      expect(document.querySelector('.kui-collapsible-panel__backdrop')).toBe(
        null,
      );
      // No overlay is open, so nothing traps Tab or intercepts Escape, and the
      // presentation change never moved focus.
      expect(document.activeElement).toBe(outside);
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(collapsed.value).toBe(true);
      stop();
      outside.remove();
    });

    it('does not restore a persisted open state as a compact overlay, and never persists the overlay', () => {
      const storage = fakeStorage({ 'sidebar.nav': 'false' });
      const collapsed = signal(true);
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const stop = wire(collapsed, device, storage);
      expect(collapsed.value).toBe(true);
      // An explicit open/close in compact is transient.
      collapsed.value = false;
      collapsed.value = true;
      expect(storage.data['sidebar.nav']).toBe('false');
      // Crossing to a wide class restores (and keeps) the stored inline choice.
      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(false);
      expect(storage.data['sidebar.nav']).toBe('false');
      stop();
    });

    it('collapses on a wide → compact crossing and restores the inline state on the way back', () => {
      const storage = fakeStorage();
      const collapsed = signal(false);
      const device = signal<DeviceClass>(classifyViewport(1440, 'landscape'));
      const stop = wire(collapsed, device, storage);
      expect(collapsed.value).toBe(false);
      expect(storage.data['sidebar.nav']).toBe('false');

      device.value = classifyViewport(390, 'portrait');
      expect(collapsed.value).toBe(true);
      expect(document.querySelector('.kui-collapsible-panel__backdrop')).toBe(
        null,
      );
      // Another compact class is not a new crossing: an opened overlay stays.
      collapsed.value = false;
      device.value = classifyViewport(375, 'portrait');
      expect(collapsed.value).toBe(false);

      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(false);
      expect(document.querySelector('.kui-collapsible-panel__backdrop')).toBe(
        null,
      );

      // A collapsed inline choice is also restored after a compact round trip.
      collapsed.value = true;
      device.value = classifyViewport(390, 'portrait');
      collapsed.value = false; // opened as an overlay
      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(true);
      expect(storage.data['sidebar.nav']).toBe('true');
      stop();
    });

    it('rescues focus stranded in a panel the presentation collapses', () => {
      const collapsed = signal(true);
      const device = signal<DeviceClass>(classifyViewport(1440, 'landscape'));
      const root = mount(false);
      const stop = wireSidebar(root, {
        panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
        deviceClass: device,
      });
      const toggle = root.querySelector<HTMLElement>(
        '[data-action="toggle-nav"]',
      )!;
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(document.activeElement).toBe(root.querySelector('#a'));
      device.value = classifyViewport(390, 'portrait');
      expect(collapsed.value).toBe(true);
      expect(document.activeElement).toBe(toggle);

      // Restoring the inline state on the way back does not steal focus.
      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(false);
      expect(document.activeElement).toBe(toggle);

      // Focus outside the panel is left alone by a presentation collapse.
      root.querySelector<HTMLElement>('#b')!.focus();
      toggle.remove(); // the remembered trigger is gone: nowhere to rescue to
      device.value = classifyViewport(390, 'portrait');
      expect(collapsed.value).toBe(true);
      stop();
    });

    it('seeds an app-declared inline default so a compact-seeded signal restores it on a wide crossing', () => {
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const collapsed = signal(device.value.compact); // compact first render
      const storage = fakeStorage();
      const panel = {
        id: 'nav',
        collapsed,
        toggleAction: 'toggle-nav',
        storageKey: 'sidebar.nav',
        inlineCollapsed: false,
      };
      const stop = wireSidebar(mount(true), {
        panels: [panel],
        deviceClass: device,
        storage,
      });
      expect(collapsed.value).toBe(true);
      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(false);
      stop();

      // A stored inline choice outranks the declared default.
      const stored = signal(true);
      const stopStored = wireSidebar(mount(true), {
        panels: [{ ...panel, collapsed: stored }],
        deviceClass: signal<DeviceClass>(classifyViewport(1440, 'landscape')),
        storage: fakeStorage({ 'sidebar.nav': 'true' }),
      });
      expect(stored.value).toBe(true);
      stopStored();

      // Without storage the declared default seeds a wide wire-up directly.
      const plain = signal(true);
      const stopPlain = wireSidebar(mount(true), {
        panels: [
          {
            id: 'nav',
            collapsed: plain,
            toggleAction: 'toggle-nav',
            inlineCollapsed: false,
          },
        ],
      });
      expect(plain.value).toBe(false);
      stopPlain();
    });

    it('re-marks a host the app re-renders when a crossing collapses the panels', () => {
      const collapsed = signal(false);
      const device = signal<DeviceClass>(classifyViewport(1440, 'landscape'));
      const root = mount(false);
      // Stand-in for an app mount that morphs the host: it re-renders on the
      // collapsed state and drops attributes its template does not emit. It
      // subscribes first, like a real app that renders before wiring.
      const stopRender = effect(() => {
        void collapsed.value;
        delete root.dataset.collapsibleOverlay;
        delete root.dataset.collapsibleResponsive;
      });
      const stop = wireSidebar(root, {
        panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
        deviceClass: device,
      });
      device.value = classifyViewport(390, 'portrait');
      expect(collapsed.value).toBe(true);
      expect(root.dataset.collapsibleOverlay).toBe('true');
      expect(root.dataset.collapsibleResponsive).toBe('overlay');
      device.value = classifyViewport(1440, 'landscape');
      expect(collapsed.value).toBe(false);
      expect(root.dataset.collapsibleResponsive).toBe('inline');
      stop();
      stopRender();
    });

    it('re-applies the overlay host state after a re-render that touches no panel', async () => {
      // A real kerf mount of the host that also renders unrelated state (a nav
      // selection). Selecting morphs the host, which strips the wire's
      // attributes and would drop its injected backdrop; no panel signal
      // changes, so only the wire's observer can restore them.
      const collapsed = signal(true);
      const selected = signal('inbox');
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const root = document.createElement('div');
      document.body.append(root);
      roots.push(root);
      const stopView = mount$(root, () =>
        raw(
          String(
            CollapsiblePanelToggle({
              side: 'left',
              collapsed: collapsed.value,
              action: 'toggle-nav',
              panelId: 'nav',
            }),
          ) +
            `<div class="shell" data-selected="${selected.value}">` +
            String(
              CollapsiblePanel({
                id: 'nav',
                side: 'left',
                collapsed: collapsed.value,
                label: 'Navigator',
                children: raw('<a href="#a" id="a">A</a>'),
              }),
            ) +
            '</div>',
        ),
      );
      const stop = wireSidebar(root, {
        panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
        deviceClass: device,
      });
      root
        .querySelector<HTMLElement>('[data-action="toggle-nav"]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      const backdrop = root.querySelector('.kui-collapsible-panel__backdrop');
      expect(backdrop).not.toBeNull();

      selected.value = 'projects';
      expect(root.querySelector<HTMLElement>('.shell')!.dataset.selected).toBe(
        'projects',
      );
      await Promise.resolve();
      expect(root.dataset.collapsibleOverlay).toBe('true');
      expect(root.dataset.collapsibleResponsive).toBe('overlay');
      // The same backdrop node survives, still directly before its panel.
      expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBe(
        backdrop,
      );
      expect(backdrop!.nextElementSibling).toBe(
        root.querySelector('[data-collapsible-panel="nav"]'),
      );

      // An app that removes the backdrop outright gets it back before the
      // panel it covers for.
      backdrop!.remove();
      await Promise.resolve();
      expect(backdrop!.nextElementSibling).toBe(
        root.querySelector('[data-collapsible-panel="nav"]'),
      );

      // Closing still tears it all down, and disposal stops the observer.
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(root.querySelector('.kui-collapsible-panel__backdrop')).toBeNull();
      stop();
      delete root.dataset.collapsibleOverlay;
      root.dataset.collapsibleResponsive = 'app-owned';
      await Promise.resolve();
      expect(root.dataset.collapsibleOverlay).toBeUndefined();
      expect(root.dataset.collapsibleResponsive).toBe('app-owned');
      stopView();
    });

    it('hands the inline state back on disposal', () => {
      const collapsed = signal(false);
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const stop = wire(collapsed, device);
      expect(collapsed.value).toBe(true);
      stop();
      expect(collapsed.value).toBe(false);
      expect(document.querySelector('.kui-collapsible-panel__backdrop')).toBe(
        null,
      );
    });

    it('leaves the hidden compact presentation alone', () => {
      const collapsed = signal(false);
      const device = signal<DeviceClass>(classifyViewport(390, 'portrait'));
      const stop = wireSidebar(mount(false), {
        panels: [{ id: 'nav', collapsed, toggleAction: 'toggle-nav' }],
        deviceClass: device,
        compactPresentation: 'hidden',
      });
      expect(collapsed.value).toBe(false);
      stop();
    });
  });
});
