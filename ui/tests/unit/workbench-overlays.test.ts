import { mount, raw, signal } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { wireWorkbench } from '../../src/wire-workbench.js';
import {
  Workbench,
  type WorkbenchResponsiveOverlayAt,
} from '../../src/workbench.js';

const roots: HTMLElement[] = [];
const disposers: Array<() => void> = [];

/** Whether the fake Workbench container is below the `narrow` breakpoint. */
let narrow = false;
const observers: FakeResizeObserver[] = [];

/** happy-dom never lays out, so the tests drive container resizes. */
class FakeResizeObserver {
  readonly targets = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
  fire() {
    if (this.targets.size > 0)
      this.callback([], this as unknown as ResizeObserver);
  }
}

/** Resize the fake container across the `narrow` breakpoint. */
function resize(toNarrow: boolean) {
  narrow = toNarrow;
  for (const observer of observers) observer.fire();
}

const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));

beforeEach(() => {
  narrow = false;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  // The container query, modeled: a responsive panel below its breakpoint and
  // a static overlay are out of flow.
  const real = globalThis.getComputedStyle;
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
    (element: Element, pseudo?: string | null) => {
      const style = real(element, pseudo);
      if (
        !(element instanceof HTMLElement) ||
        !element.matches('.kui-workbench__rail, .kui-workbench__drawer')
      )
        return style;
      const overlay =
        element.dataset.presentation === 'overlay' ||
        (narrow && element.hasAttribute('data-responsive-overlay-at'));
      return new Proxy(style, {
        get: (target, property) =>
          property === 'position'
            ? overlay
              ? 'absolute'
              : 'relative'
            : Reflect.get(target, property),
      });
    },
  );
});

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  for (const root of roots.splice(0)) root.remove();
  observers.splice(0);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

interface StudioOptions {
  at?: WorkbenchResponsiveOverlayAt;
  rightPresentation?: 'inline' | 'overlay';
  render?: boolean;
  /** Render the app's toggles with `aria-controls` naming their panels. */
  controls?: boolean;
  /** Render the console with no focusable control of its own. */
  bareConsole?: boolean;
}

/** A mounted Workbench whose panels' collapsed flags are app-owned signals. */
function studio({
  at = 'narrow',
  rightPresentation = 'inline',
  render = true,
  controls = false,
  bareConsole = false,
}: StudioOptions = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  roots.push(root);
  const left = signal(false);
  const right = signal(true);
  const drawer = signal(false);
  const shown = signal(render);
  const rightMode = signal(rightPresentation);
  const toggle = (name: string, collapsed: boolean) =>
    `<button type="button" data-toggle="${name}"${controls && name === 'nav' ? ' aria-controls="studio-left-rail"' : ''}>${collapsed ? 'Show' : 'Hide'} ${name}</button>`;
  // A console toggle that names an element inside the drawer (and an id
  // that matches nothing), plus a disabled one that must be skipped.
  const consoleToggles = controls
    ? '<button type="button" disabled aria-controls="console-body">Off</button><button type="button" aria-controls="elsewhere console-body">Console</button>'
    : '';
  // Each panel carries its own close control, as a panel header would.
  const panelContent = (name: string) =>
    raw(
      `<div id="${name}-body"><button type="button" data-toggle="${name}">Close ${name}</button><button type="button">${name} item</button></div>`,
    );
  const stopMount = mount(root, () =>
    shown.value
      ? Workbench({
          id: 'studio',
          label: 'Studio',
          main: raw(
            `<div>${toggle('nav', left.value)}${toggle('inspector', right.value)}${consoleToggles}<button type="button" data-plain>Plain</button></div>`,
          ),
          leftRail: {
            content: panelContent('nav'),
            label: 'Navigator',
            collapsed: left.value,
            responsiveOverlayAt: at,
          },
          rightRail: {
            content: panelContent('inspector'),
            label: 'Inspector',
            collapsed: right.value,
            presentation: rightMode.value,
            restoreControl: raw(
              '<div><button type="button" data-restore>Show inspector</button></div>',
            ),
          },
          bottomDrawer: {
            content: bareConsole
              ? raw('<div id="console-body">Build log</div>')
              : panelContent('console'),
            label: 'Console',
            collapsed: drawer.value,
            responsiveOverlayAt: at,
          },
        })
      : raw('<p>Loading</p>'),
  );
  disposers.push(stopMount);
  // The app's own toggles, delegated on its root like a real app's.
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>(
      '[data-toggle]',
    );
    if (button?.dataset.toggle === 'nav') left.value = !left.value;
    if (button?.dataset.toggle === 'inspector') right.value = !right.value;
  };
  root.addEventListener('click', onClick);
  const panel = (selector: string) =>
    root.querySelector<HTMLElement>(`#studio ${selector}`)!;
  return {
    root,
    left,
    right,
    drawer,
    shown,
    rightMode,
    leftRail: () => panel('[data-workbench-rail="left"]'),
    rightRail: () => panel('[data-workbench-rail="right"]'),
    drawerPanel: () => panel('[data-workbench-drawer]'),
    button: (text: string) =>
      [...root.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent === text,
      )!,
    wire: (
      options: { dismissOverlays?: boolean; exclusiveOverlays?: boolean } = {},
    ) => {
      const dispose = wireWorkbench(root, {
        id: 'studio',
        panels: {
          leftRail: { collapsed: left },
          rightRail: { collapsed: right },
          bottomDrawer: { collapsed: drawer },
        },
        ...options,
      });
      disposers.push(dispose);
      return dispose;
    },
  };
}

const press = (target: Element) => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, composed: true }),
  );
  (target as HTMLElement).click();
};

const escape = (target: Element = document.body) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};

describe('wireWorkbench transient overlays', () => {
  it('collapses responsive overlays when the breakpoint applies and restores them when it stops', () => {
    const app = studio();
    narrow = true;
    app.wire();
    // Wire-up on a narrow container: both responsive panels start collapsed.
    expect(app.left.value).toBe(true);
    expect(app.drawer.value).toBe(true);
    expect(app.leftRail().dataset.collapsed).toBe('true');
    // The presentation change skips the collapse motion and leaves no style.
    expect(
      app
        .leftRail()
        .querySelector('.kui-workbench__panel-content')!
        .getAttribute('style'),
    ).toBeNull();
    // The static right rail is the app's to present.
    expect(app.right.value).toBe(true);

    // The user opens the navigator overlay; a crossing to wide restores the
    // inline states remembered at entry, not the overlay's state.
    app.left.value = false;
    app.drawer.value = false;
    app.drawer.value = true;
    resize(false);
    expect(app.left.value).toBe(false);
    expect(app.drawer.value).toBe(false);

    // Collapsed inline, then a crossing to narrow and back: still collapsed.
    app.left.value = true;
    resize(true);
    expect(app.left.value).toBe(true);
    expect(app.drawer.value).toBe(true);
    app.left.value = false;
    resize(false);
    expect(app.left.value).toBe(true);
    expect(app.drawer.value).toBe(false);

    // Repeated resizes on one side of the breakpoint change nothing.
    resize(false);
    expect(app.left.value).toBe(true);
    app.left.value = false;
    resize(true);
    resize(true);
    expect(app.left.value).toBe(true);
  });

  it('hands the remembered inline state back on disposal', () => {
    const app = studio();
    narrow = true;
    const dispose = app.wire();
    expect(app.left.value).toBe(true);
    dispose();
    expect(app.left.value).toBe(false);
    expect(app.drawer.value).toBe(false);
    // Nothing is wired afterwards.
    app.left.value = false;
    resize(true);
    escape();
    expect(app.left.value).toBe(false);
  });

  it('picks up a Workbench that renders after wire-up and an app presentation change', async () => {
    const app = studio({ render: false });
    narrow = true;
    app.wire();
    app.shown.value = true;
    await flush();
    expect(app.left.value).toBe(true);
    expect(app.drawer.value).toBe(true);

    // A static overlay the app switches in is left alone; switching back to a
    // responsive-only inline panel is observed through its attributes.
    app.rightMode.value = 'overlay';
    await flush();
    expect(app.right.value).toBe(true);

    // Replacing the Workbench observes the new one.
    app.shown.value = false;
    await flush();
    app.left.value = false;
    app.shown.value = true;
    await flush();
    resize(false);
    resize(true);
    expect(app.left.value).toBe(true);
  });

  it('rescues focus a collapse would strand inside a panel', () => {
    const app = studio();
    app.wire();
    app.button('Hide nav').focus();
    app.button('nav item').focus();
    resize(true);
    expect(app.left.value).toBe(true);
    // No opener was recorded (the panel was open at wire-up) and it has no
    // restore control: focus leaves the hidden panel.
    return Promise.resolve().then(() => {
      expect(app.leftRail().contains(document.activeElement)).toBe(false);
    });
  });

  it('returns focus to an aria-controls toggle for a panel open at wire-up', () => {
    const app = studio({ controls: true });
    app.wire();
    // Both panels were open at wire-up, so neither has a recorded opener.
    app.button('Close nav').focus();
    app.button('Close nav').click();
    expect(app.left.value).toBe(true);
    // The toggle whose aria-controls names the rail takes the focus.
    expect(document.activeElement?.getAttribute('aria-controls')).toBe(
      'studio-left-rail',
    );

    // A token naming an element inside the panel counts too, and a disabled
    // control is skipped.
    app.button('console item').focus();
    app.drawer.value = true;
    expect(document.activeElement?.textContent).toBe('Console');

    // A recorded opener still wins over the aria-controls toggle.
    app.button('Plain').focus();
    app.left.value = false;
    app.button('nav item').focus();
    app.left.value = true;
    expect(document.activeElement?.textContent).toBe('Plain');
  });

  it("returns focus when the app's own control inside a panel closes it", () => {
    const app = studio();
    narrow = true;
    app.wire();

    // An overlay opened from the toolbar and closed from its own header.
    const showNav = app.button('Show nav');
    showNav.focus();
    showNav.click();
    expect(app.left.value).toBe(false);
    app.button('Close nav').focus();
    app.button('Close nav').click();
    expect(app.left.value).toBe(true);
    expect(document.activeElement).toBe(showNav);

    // The same holds inline: a collapsed track must not keep the focus.
    resize(false);
    app.left.value = true;
    showNav.focus();
    showNav.click();
    expect(app.left.value).toBe(false);
    app.button('Close nav').focus();
    app.button('Close nav').click();
    expect(app.left.value).toBe(true);
    expect(document.activeElement).toBe(showNav);

    // A close with focus elsewhere leaves the focus alone.
    app.left.value = false;
    app.button('Plain').focus();
    app.left.value = true;
    expect(document.activeElement?.textContent).toBe('Plain');
  });

  it('returns focus stranded in an open overlay when disposal collapses it', () => {
    const app = studio();
    app.left.value = true;
    narrow = true;
    const dispose = app.wire();
    // The inline state was collapsed; the user opens the overlay from its
    // toggle and moves into it.
    const showNav = app.button('Show nav');
    showNav.focus();
    showNav.click();
    app.button('nav item').focus();
    dispose();
    expect(app.left.value).toBe(true);
    expect(document.activeElement).toBe(showNav);
  });

  it('closes the focused, else the most recent, overlay on Escape and returns focus', () => {
    const app = studio({ rightPresentation: 'overlay' });
    narrow = true;
    // Non-exclusive, so two overlays can be open at once.
    app.wire({ exclusiveOverlays: false });

    // Open the navigator from its toggle: the toggle becomes its opener.
    const showNav = app.button('Show nav');
    showNav.focus();
    showNav.click();
    expect(app.left.value).toBe(false);
    app.button('nav item').focus();
    expect(escape().defaultPrevented).toBe(true);
    expect(app.left.value).toBe(true);
    expect(document.activeElement?.textContent).toBe('Show nav');

    // Two open overlays with focus outside both: the most recent closes.
    app.left.value = false;
    app.right.value = false;
    escape();
    expect(app.right.value).toBe(true);
    expect(app.left.value).toBe(false);
    escape();
    expect(app.left.value).toBe(true);

    // With focus in the older one, that one closes first.
    app.left.value = false;
    app.right.value = false;
    app.button('nav item').focus();
    escape();
    expect(app.left.value).toBe(true);
    expect(app.right.value).toBe(false);
    escape();
    expect(app.right.value).toBe(true);

    // Nothing open: Escape passes through untouched.
    expect(escape().defaultPrevented).toBe(false);
  });

  it('keeps overlays exclusive: opening one closes the other open overlays', async () => {
    const app = studio({ rightPresentation: 'overlay' });
    narrow = true;
    app.wire();

    // A keyboard open has no press, so only exclusivity closes the other.
    const showNav = app.button('Show nav');
    showNav.focus();
    showNav.click();
    expect(app.left.value).toBe(false);
    app.button('Show inspector').focus();
    app.button('Show inspector').click();
    expect(app.right.value).toBe(false);
    expect(app.left.value).toBe(true);
    // The drawer too: opening it closes the inspector, and back again.
    app.drawer.value = false;
    expect(app.right.value).toBe(true);
    app.right.value = false;
    expect(app.drawer.value).toBe(true);
    expect(app.left.value).toBe(true);

    // Focus moves into the overlay that opens, so none is left in the one
    // that closed; closing the new one skips an opener inside the closed one.
    const opener = app.button('Show nav');
    opener.focus();
    app.left.value = false;
    expect(app.right.value).toBe(true);
    app.button('nav item').focus();
    app.right.value = false;
    expect(app.left.value).toBe(true);
    expect(document.activeElement?.textContent).toBe('Close inspector');
    app.right.value = true;
    await Promise.resolve();
    expect(document.activeElement?.hasAttribute('data-restore')).toBe(true);

    // Inline panels are never closed by it: wide, the navigator and drawer
    // are inline and stay open while the static overlay inspector opens.
    app.right.value = true;
    resize(false);
    app.left.value = false;
    app.drawer.value = false;
    app.right.value = false;
    expect(app.left.value).toBe(false);
    expect(app.drawer.value).toBe(false);
    // And an inline panel opening leaves the open overlay alone.
    app.left.value = true;
    app.left.value = false;
    expect(app.right.value).toBe(false);
  });

  it('moves focus into an overlay that opens, never into an inline panel', () => {
    const app = studio({ rightPresentation: 'overlay', bareConsole: true });
    app.wire();
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');

    // Wide: the navigator opens inline and focus stays on its toggle.
    app.left.value = true;
    const hideNav = app.button('Show nav');
    hideNav.focus();
    hideNav.click();
    expect(app.left.value).toBe(false);
    expect(document.activeElement).toBe(hideNav);

    // The static overlay inspector takes focus on its first control, without
    // scrolling its sliding content, and Escape hands it back to the toggle.
    const showInspector = app.button('Show inspector');
    showInspector.focus();
    focus.mockClear();
    showInspector.click();
    expect(document.activeElement?.textContent).toBe('Close inspector');
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    escape();
    expect(document.activeElement).toBe(showInspector);

    // Narrow: the responsive navigator is an overlay now, so it takes focus.
    resize(true);
    expect(app.left.value).toBe(true);
    app.button('Show nav').focus();
    app.button('Show nav').click();
    expect(document.activeElement?.textContent).toBe('Close nav');

    // A panel with no control of its own is focused itself.
    app.left.value = true;
    app.button('Plain').focus();
    focus.mockClear();
    app.drawer.value = false;
    expect(focus.mock.contexts.at(-1)).toBe(app.drawerPanel());
  });

  it('keeps Tab inside the open overlay, wrapping at either end', () => {
    const app = studio({ rightPresentation: 'overlay', bareConsole: true });
    narrow = true;
    app.wire({ exclusiveOverlays: false });
    const tab = (shiftKey = false) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      (document.activeElement ?? document.body).dispatchEvent(event);
      return event;
    };

    // Nothing open: Tab passes through.
    app.button('Plain').focus();
    expect(tab().defaultPrevented).toBe(false);

    app.button('Show nav').click();
    expect(document.activeElement?.textContent).toBe('Close nav');
    // Inside the panel, Tab moves on natively until the last control, which
    // wraps to the first; Shift+Tab on the first wraps to the last.
    expect(tab().defaultPrevented).toBe(false);
    app.button('nav item').focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('Close nav');
    expect(tab(true).defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('nav item');
    expect(tab(true).defaultPrevented).toBe(false);

    // Focus the app moved outside comes back in, at the matching end.
    app.button('Plain').focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('Close nav');
    app.button('Plain').focus();
    tab(true);
    expect(document.activeElement?.textContent).toBe('nav item');

    // Two open overlays: Tab stays in the one holding focus, else it goes to
    // the most recently opened one.
    app.right.value = false;
    expect(document.activeElement?.textContent).toBe('Close inspector');
    app.button('nav item').focus();
    tab();
    expect(document.activeElement?.textContent).toBe('Close nav');
    app.button('Plain').focus();
    tab();
    expect(document.activeElement?.textContent).toBe('Close inspector');

    // A Tab another handler took is left alone.
    app.button('inspector item').focus();
    const handled = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.activeElement!.dispatchEvent(handled);
    expect(document.activeElement?.textContent).toBe('inspector item');

    // An overlay with no focusable control does not trap.
    app.right.value = true;
    app.left.value = true;
    app.drawer.value = false;
    app.button('Plain').focus();
    expect(tab().defaultPrevented).toBe(false);
  });

  it('skips a control the CSS hides when it wraps Tab', () => {
    const app = studio();
    narrow = true;
    app.wire();
    app.button('Show nav').click();
    // A trailing control that is rendered but not displayed, like the
    // separator of a responsive overlay.
    const hidden = document.createElement('button');
    hidden.textContent = 'hidden';
    hidden.style.display = 'none';
    app.leftRail().append(hidden);
    const tab = () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.activeElement!.dispatchEvent(event);
      return event;
    };
    app.button('nav item').focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement?.textContent).toBe('Close nav');

    // Without checkVisibility every matched control counts.
    for (const button of app.leftRail().querySelectorAll('button'))
      Object.defineProperty(button, 'checkVisibility', { value: undefined });
    app.button('nav item').focus();
    expect(tab().defaultPrevented).toBe(false);
  });

  it('with exclusiveOverlays false lets overlays stay open together', () => {
    const app = studio({ rightPresentation: 'overlay' });
    narrow = true;
    app.wire({ exclusiveOverlays: false });
    app.left.value = false;
    app.right.value = false;
    app.drawer.value = false;
    expect(app.left.value).toBe(false);
    expect(app.right.value).toBe(false);
    expect(app.drawer.value).toBe(false);
  });

  it('leaves Escape to whoever already handled it, and to inline panels', () => {
    const app = studio();
    app.wire();
    // Wide: the navigator is inline, so Escape is not an overlay dismissal.
    expect(escape().defaultPrevented).toBe(false);
    expect(app.left.value).toBe(false);

    resize(true);
    app.left.value = false;
    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(app.left.value).toBe(false);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(app.left.value).toBe(false);
  });

  it('closes an open overlay on a press outside it, never on its own opening press', () => {
    const app = studio();
    narrow = true;
    app.wire();

    // The press that opens the navigator does not close it.
    press(app.button('Show nav'));
    expect(app.left.value).toBe(false);
    // A press inside it keeps it open.
    press(app.button('nav item'));
    expect(app.left.value).toBe(false);
    // A press outside it closes it.
    press(app.button('Plain'));
    expect(app.left.value).toBe(true);

    // The app's own toggle closes it once, and it stays closed.
    press(app.button('Show nav'));
    expect(app.left.value).toBe(false);
    press(app.button('Hide nav'));
    expect(app.left.value).toBe(true);

    // A keyboard click has no press, so it does not dismiss.
    app.left.value = false;
    app.button('Plain').click();
    expect(app.left.value).toBe(false);
    // A press that starts outside but ends inside keeps it open.
    app
      .button('Plain')
      .dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, composed: true }),
      );
    app.button('nav item').click();
    expect(app.left.value).toBe(false);
    // A press outside the whole Workbench closes it too.
    press(document.body);
    expect(app.left.value).toBe(true);
  });

  it('returns stranded focus to the restore control when there is no opener', async () => {
    const app = studio({ rightPresentation: 'overlay' });
    app.wire();
    app.right.value = false;
    app.button('inspector item').focus();
    escape();
    expect(app.right.value).toBe(true);
    // The restore control renders with the collapsed panel.
    await Promise.resolve();
    expect(document.activeElement?.hasAttribute('data-restore')).toBe(true);

    // A press outside never has focus to rescue.
    app.right.value = false;
    press(app.button('Plain'));
    expect(app.right.value).toBe(true);
  });

  it('looks for a restore control the app renders a moment later', async () => {
    const app = studio();
    narrow = true;
    app.wire();
    const workbench = app.root.querySelector<HTMLElement>('#studio')!;
    const lateRestore = () => {
      const late = document.createElement('div');
      late.className = 'kui-workbench__restore';
      late.dataset.panel = 'bottom';
      late.innerHTML = '<button type="button" data-late>Show console</button>';
      workbench.append(late);
      return late;
    };

    // The console had no opener and has no restore control yet.
    app.drawer.value = false;
    app.button('console item').focus();
    escape();
    expect(app.drawer.value).toBe(true);
    const late = lateRestore();
    await Promise.resolve();
    expect(document.activeElement?.hasAttribute('data-late')).toBe(true);
    late.remove();

    // Reopened before the look: focus stays in the reopened panel.
    (document.activeElement as HTMLElement | null)?.blur();
    app.drawer.value = false;
    app.button('console item').focus();
    escape();
    app.drawer.value = false;
    lateRestore();
    await Promise.resolve();
    expect(document.activeElement?.textContent).toBe('Close console');
    workbench.querySelector('[data-late]')!.parentElement!.remove();

    // Nothing to return to: focus leaves the hidden panel.
    escape();
    expect(app.drawer.value).toBe(true);
    await Promise.resolve();
    expect(app.drawerPanel().contains(document.activeElement)).toBe(false);

    // Focus the user already moved elsewhere is left there.
    app.drawer.value = false;
    app.button('console item').focus();
    escape();
    app.button('Plain').focus();
    await Promise.resolve();
    expect(document.activeElement?.textContent).toBe('Plain');
  });

  it('with dismissOverlays false leaves every collapsed write to the app', () => {
    const app = studio();
    narrow = true;
    app.wire({ dismissOverlays: false });
    expect(app.left.value).toBe(false);
    escape();
    press(app.button('Plain'));
    expect(app.left.value).toBe(false);
  });

  it('accepts the Workbench itself as the wiring root', () => {
    const app = studio();
    narrow = true;
    const workbench = app.root.querySelector<HTMLElement>('#studio')!;
    disposers.push(
      wireWorkbench(workbench, {
        id: 'studio',
        panels: { leftRail: { collapsed: app.left } },
      }),
    );
    expect(app.left.value).toBe(true);
  });

  it('hands the inline state back on disposal after the Workbench is gone', async () => {
    const app = studio();
    narrow = true;
    const dispose = app.wire();
    expect(app.left.value).toBe(true);
    app.shown.value = false;
    dispose();
    expect(app.left.value).toBe(false);
  });

  it('works without ResizeObserver, from wire-up and presentation changes', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const app = studio();
    narrow = true;
    app.wire();
    expect(app.left.value).toBe(true);
  });

  it('never touches a nested Workbench or a panel without a collapsed signal', () => {
    const app = studio();
    // A nested Workbench inside the navigator, with its own responsive rail.
    const inner = document.createElement('div');
    inner.innerHTML = String(
      Workbench({
        id: 'inner',
        label: 'Inner',
        main: raw('<div>inner</div>'),
        leftRail: {
          content: raw('<div>inner nav</div>'),
          responsiveOverlayAt: 'narrow',
        },
      }),
    );
    app
      .leftRail()
      .querySelector('.kui-workbench__panel-content')!
      .append(inner);
    narrow = true;
    disposers.push(
      wireWorkbench(app.root, {
        id: 'studio',
        panels: { leftRail: { collapsed: app.left }, rightRail: {} },
      }),
    );
    expect(app.left.value).toBe(true);
    expect(
      inner
        .querySelector('[data-workbench-rail="left"]')!
        .getAttribute('data-collapsed'),
    ).toBe('false');
    expect(app.right.value).toBe(true);
    // Only its own drawer wiring: the drawer was not given a signal.
    expect(app.drawer.value).toBe(false);
  });
});
