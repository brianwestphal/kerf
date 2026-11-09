import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isPopoverPinned,
  type PinnablePopoverChange,
  type PinnablePopoverOptions,
  PinnablePopoverSurface,
  type PinnablePopoverSurfaceProps,
  pinPopover,
  wirePinnablePopover,
} from '../../src/components/surfaces/surface-scaffold/surface-scaffold.js';

const VIEW_WIDTH = 1024;
const VIEW_HEIGHT = 768;
const SIZE = { width: 300, height: 200 };
/** Where the UA centers an unplaced surface. */
const CENTER = {
  x: (VIEW_WIDTH - SIZE.width) / 2,
  y: (VIEW_HEIGHT - SIZE.height) / 2,
};

const render = (props: Partial<PinnablePopoverSurfaceProps> = {}) =>
  String(
    PinnablePopoverSurface({
      id: 'library',
      label: 'Library',
      children: <p>Rows</p>,
      ...props,
    }),
  );

const open = new WeakSet<Element>();

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  };
}

/** A popover surface whose box follows the placement the controller owns. */
function mount(
  props: Partial<PinnablePopoverSurfaceProps> = {},
  invoker = true,
): { surface: HTMLElement; trigger: HTMLButtonElement } {
  document.body.innerHTML = `${invoker ? '<button id="trigger" popovertarget="library">Library</button>' : '<button id="trigger">Library</button>'}${render(props)}<p id="outside">Page</p>`;
  const surface = document.getElementById('library')!;
  const trigger = document.getElementById('trigger') as HTMLButtonElement;
  trigger.getBoundingClientRect = () => rect(100, 40, 80, 40);
  surface.getBoundingClientRect = () => {
    const placed = surface.hasAttribute('data-placed');
    const width = parseFloat(surface.style.width) || SIZE.width;
    const height = parseFloat(surface.style.height) || SIZE.height;
    return rect(
      placed
        ? parseFloat(
            surface.style.getPropertyValue('--_kui-pinnable-popover-surface-x'),
          )
        : (VIEW_WIDTH - width) / 2,
      placed
        ? parseFloat(
            surface.style.getPropertyValue('--_kui-pinnable-popover-surface-y'),
          )
        : (VIEW_HEIGHT - height) / 2,
      width,
      height,
    );
  };
  const toggle = (state: 'open' | 'closed') => {
    for (const type of ['beforetoggle', 'toggle']) {
      const event = new Event(type);
      Object.assign(event, { newState: state });
      surface.dispatchEvent(event);
    }
  };
  surface.showPopover = () => {
    open.add(surface);
    toggle('open');
  };
  surface.hidePopover = () => {
    open.delete(surface);
    toggle('closed');
  };
  return { surface, trigger };
}

const position = (surface: HTMLElement) => ({
  x: parseFloat(
    surface.style.getPropertyValue('--_kui-pinnable-popover-surface-x'),
  ),
  y: parseFloat(
    surface.style.getPropertyValue('--_kui-pinnable-popover-surface-y'),
  ),
});
const pin = (surface: HTMLElement) =>
  surface.querySelector<HTMLButtonElement>('[data-pinnable-popover-pin]')!;
const handle = (surface: HTMLElement) =>
  surface.querySelector<HTMLButtonElement>(
    '.kui-pinnable-popover-surface__handle',
  )!;
const header = (surface: HTMLElement) =>
  surface.querySelector<HTMLElement>('.kui-pinnable-popover-surface__header')!;
const bottomResize = (surface: HTMLElement) =>
  surface.querySelector<HTMLButtonElement>(
    '.kui-pinnable-popover-surface__bottom-resize',
  )!;
const flush = () => new Promise((resolve) => globalThis.setTimeout(resolve, 0));
const key = (target: Element, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};
const pointer = (
  target: Element,
  type: string,
  clientX: number,
  clientY: number,
  init: PointerEventInit = {},
) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      composed: true,
      clientX,
      clientY,
      pointerId: 1,
      button: 0,
      ...init,
    }),
  );

function wire(surface: HTMLElement, options: PinnablePopoverOptions = {}) {
  const changes: PinnablePopoverChange[] = [];
  const dispose = wirePinnablePopover(surface, {
    onChange: (change) => changes.push(change),
    ...options,
  });
  return { changes, dispose };
}

describe('PinnablePopoverSurface', () => {
  it('renders a manual popover dialog with a move handle, Pin, and Close', () => {
    const html = render({ describedBy: 'library-summary' });
    expect(html).toContain(
      'class="kui-pinnable-popover-surface" data-component="pinnable-popover-surface" data-presentation="overlay" data-size="medium"',
    );
    expect(html).toContain('popover="manual" role="dialog"');
    expect(html).toContain('aria-labelledby="library-title"');
    expect(html).toContain('aria-describedby="library-summary"');
    expect(html).toContain(
      'class="kui-pinnable-popover-surface__handle" aria-describedby="library-move-description"',
    );
    expect(html).toContain('id="library-move-description" hidden');
    expect(html).toContain('Moving it pins it.');
    expect(html).toContain(
      'aria-label="Pin" aria-pressed="false" data-pinnable-popover-pin=""',
    );
    expect(html).toContain(
      'aria-label="Close" popoverTarget="library" popoverTargetAction="hide"',
    );
    expect(html).not.toContain('data-pinned');
    expect(html.slice(0, html.indexOf('>'))).not.toContain('style=');
  });

  it('renders its geometry, labels, header actions, and an embedded pinned preview', () => {
    const html = render({
      presentation: 'embedded',
      pinned: true,
      size: 'small',
      preferredWidth: '30rem' as never,
      height: '20rem' as never,
      maxHeight: '25rem' as never,
      viewportGutter: '1rem' as never,
      bodyLayout: 'fill',
      pinLabel: 'Keep Open',
      closeLabel: 'Dismiss',
      moveDescription: 'Arrow keys move it.',
      headerActions: <button type="button">Filter</button>,
      rootAttributes: { 'data-key': 'library', 'data-pinned': 'no' },
      className: 'app-library',
      slot: 'panel',
    });
    expect(html).toContain('class="kui-pinnable-popover-surface app-library"');
    expect(html).toContain('data-key="library"');
    expect(html).toContain('data-presentation="embedded" data-size="small"');
    expect(html).toContain(
      'data-height="" data-max-height="" data-body-layout="fill" data-pinned=""',
    );
    expect(html).not.toContain('popover="manual"');
    expect(html).not.toContain('popovertarget');
    expect(html).toContain(
      'style="--_kui-pinnable-popover-surface-preferred-width:30rem;--_kui-pinnable-popover-surface-gutter:1rem;--_kui-pinnable-popover-surface-height:20rem;--_kui-pinnable-popover-surface-max-height:25rem"',
    );
    expect(html).toContain('slot="panel"');
    expect(html).toContain('aria-label="Keep Open" aria-pressed="true"');
    expect(html).toContain('aria-label="Dismiss"');
    expect(html).toContain('Arrow keys move it.');
    expect(html.indexOf('Filter')).toBeLessThan(html.indexOf('Keep Open'));
  });

  it('leaves viewport heights to the CSS caps', () => {
    const html = render({ height: 'viewport', maxHeight: 'viewport' });
    expect(html).toContain('data-height="" data-max-height=""');
    expect(html.slice(0, html.indexOf('>'))).not.toContain('style=');
  });

  it('renders an opt-in bottom resize handle only on overlays', () => {
    expect(render({ resizeFromBottom: true })).toContain(
      'class="kui-pinnable-popover-surface__bottom-resize" aria-label="Resize Library vertically"',
    );
    expect(
      render({ presentation: 'embedded', resizeFromBottom: true }),
    ).not.toContain('kui-pinnable-popover-surface__bottom-resize');
  });
});

describe('wirePinnablePopover', () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: VIEW_WIDTH,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: VIEW_HEIGHT,
    });
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      if (selector === ':popover-open') return open.has(this);
      return matches.call(this, selector);
    });
  });
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('dir');
    vi.restoreAllMocks();
  });

  it('leaves an embedded surface alone', () => {
    const { surface } = mount({ presentation: 'embedded' });
    const dispose = wirePinnablePopover(surface);
    pinPopover(surface);
    expect(isPopoverPinned(surface)).toBe(false);
    dispose();
  });

  it('opens a transient surface below its invoker, after the next frame too', async () => {
    const { surface } = mount();
    wire(surface);
    surface.showPopover();
    expect(surface.hasAttribute('data-placed')).toBe(true);
    expect(position(surface)).toEqual({ x: 100, y: 84 });
    surface.style.removeProperty('--_kui-pinnable-popover-surface-x');
    await flush();
    await new Promise((resolve) => globalThis.requestAnimationFrame(resolve));
    expect(position(surface)).toEqual({ x: 100, y: 84 });
    surface.hidePopover();
  });

  it('marks a fill-last body only while its results are scrolled', () => {
    const { surface } = mount({ bodyLayout: 'fill-last' });
    const { dispose } = wire(surface);
    surface.showPopover();
    const results = surface.querySelector(
      '.kui-pinnable-popover-surface__body > p',
    )!;
    expect(surface.hasAttribute('data-scrolled')).toBe(false);
    results.scrollTop = 5;
    results.dispatchEvent(new Event('scroll', { bubbles: false }));
    expect(surface.hasAttribute('data-scrolled')).toBe(true);
    results.scrollTop = 0;
    results.dispatchEvent(new Event('scroll', { bubbles: false }));
    expect(surface.hasAttribute('data-scrolled')).toBe(false);
    header(surface).dispatchEvent(new Event('scroll', { bubbles: false }));
    results.remove();
    surface.hidePopover();
    surface.showPopover();
    expect(surface.hasAttribute('data-scrolled')).toBe(false);
    dispose();
  });

  it('pins and resizes from the bottom by pointer and arrow keys', () => {
    const { surface } = mount({ resizeFromBottom: true });
    const { changes } = wire(surface);
    surface.showPopover();
    const grip = bottomResize(surface);
    grip.setPointerCapture = vi.fn();
    grip.hasPointerCapture = () => true;
    grip.releasePointerCapture = vi.fn();
    pointer(grip, 'pointerdown', 200, 284);
    expect(grip.setPointerCapture).toHaveBeenCalledWith(1);
    pointer(grip, 'pointermove', 200, 350);
    expect(surface.style.height).toBe('266px');
    pointer(grip, 'pointerup', 200, 350);
    expect(grip.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(changes.map((change) => change.reason)).toEqual(['pin', 'resize']);
    expect(changes.at(-1)!.placement).toEqual({ x: 100, y: 84, height: 266 });
    expect(key(grip, { key: 'ArrowUp' }).defaultPrevented).toBe(true);
    expect(surface.style.height).toBe('258px');
    expect(
      key(grip, { key: 'ArrowDown', shiftKey: true }).defaultPrevented,
    ).toBe(true);
    expect(surface.style.height).toBe('298px');
    expect(
      key(grip, { key: 'ArrowDown', metaKey: true }).defaultPrevented,
    ).toBe(false);
    expect(changes.at(-1)!.placement?.height).toBe(298);
    grip.hasPointerCapture = () => false;
    pointer(grip, 'pointerdown', 200, 382);
    pointer(grip, 'pointerup', 200, 382);
    expect(changes.at(-1)!.reason).toBe('resize');
  });

  it('can size a closed surface before it has a saved placement', () => {
    const { surface } = mount({ resizeFromBottom: true });
    const { changes } = wire(surface);
    const grip = bottomResize(surface);
    key(grip, { key: 'ArrowDown' });
    expect(changes.at(-1)!.placement).toEqual({
      x: CENTER.x,
      y: CENTER.y,
      height: 208,
    });
    const second = mount({ resizeFromBottom: true }).surface;
    const secondChanges = wire(second).changes;
    const secondGrip = bottomResize(second);
    pointer(secondGrip, 'pointerdown', 400, 484);
    pointer(secondGrip, 'pointerup', 400, 484);
    expect(secondChanges.at(-1)!.placement).toEqual({
      x: CENTER.x,
      y: CENTER.y,
      height: SIZE.height,
    });
  });

  it('flips above an anchor with no room below, and aligns end in RTL', () => {
    const { surface } = mount();
    const anchor = document.createElement('button');
    anchor.getBoundingClientRect = () => rect(900, 700, 60, 40);
    document.body.append(anchor);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          direction: 'rtl',
          getPropertyValue: () => '',
        }) as unknown as CSSStyleDeclaration,
    );
    wire(surface, { anchor });
    surface.showPopover();
    // End-aligned to the anchor's right edge (960 - 300), above it.
    expect(position(surface)).toEqual({ x: 660, y: 496 });
  });

  it('stays below a low anchor without room above, clamped to the gutter', () => {
    const { surface } = mount();
    wire(surface, { anchor: () => document.getElementById('trigger') });
    document.getElementById('trigger')!.getBoundingClientRect = () =>
      rect(-50, 100, 40, 500);
    surface.showPopover();
    expect(position(surface)).toEqual({ x: 16, y: 552 });
  });

  it('opens centered without an anchor', () => {
    const { surface } = mount({}, false);
    wire(surface, { anchor: () => null });
    surface.showPopover();
    expect(surface.hasAttribute('data-placed')).toBe(false);
  });

  it('opens centered when the surface has no id to find an invoker by', () => {
    const { surface } = mount();
    surface.removeAttribute('id');
    wire(surface);
    surface.showPopover();
    expect(surface.hasAttribute('data-placed')).toBe(false);
  });

  it('closes a transient surface on a press outside it and its openers', () => {
    const { surface, trigger } = mount();
    const anchor = document.createElement('span');
    anchor.getBoundingClientRect = () => rect(10, 10, 10, 10);
    document.body.append(anchor);
    wire(surface, { anchor });
    surface.showPopover();
    pointer(surface.querySelector('p')!, 'pointerdown', 0, 0);
    pointer(anchor, 'pointerdown', 0, 0);
    pointer(trigger, 'pointerdown', 0, 0);
    expect(open.has(surface)).toBe(true);
    pointer(document.getElementById('outside')!, 'pointerdown', 0, 0);
    expect(open.has(surface)).toBe(false);
    // A closed surface ignores presses.
    pointer(document.getElementById('outside')!, 'pointerdown', 0, 0);
  });

  it('keeps a pinned surface open on a press outside', () => {
    const { surface } = mount();
    wire(surface, { pinned: true });
    expect(surface.hasAttribute('data-pinned')).toBe(true);
    expect(pin(surface).getAttribute('aria-pressed')).toBe('true');
    surface.showPopover();
    pointer(document.getElementById('outside')!, 'pointerdown', 0, 0);
    expect(open.has(surface)).toBe(true);
  });

  it('closes on Escape: anywhere while transient, from inside while pinned', () => {
    const { surface } = mount();
    wire(surface);
    // Closed: nothing to do.
    expect(key(document.body, { key: 'Escape' }).defaultPrevented).toBe(false);
    surface.showPopover();
    key(document.body, { key: 'Enter' });
    expect(open.has(surface)).toBe(true);
    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(open.has(surface)).toBe(true);
    expect(key(document.body, { key: 'Escape' }).defaultPrevented).toBe(true);
    expect(open.has(surface)).toBe(false);

    surface.showPopover();
    pinPopover(surface);
    key(document.body, { key: 'Escape' });
    expect(open.has(surface)).toBe(true);
    handle(surface).focus();
    key(handle(surface), { key: 'Escape' });
    expect(open.has(surface)).toBe(false);
  });

  it('leaves Escape to an open light-dismiss popover or modal dialog', () => {
    const { surface } = mount();
    wire(surface);
    surface.showPopover();
    vi.spyOn(document, 'querySelector').mockReturnValue(
      document.createElement('div'),
    );
    key(document.body, { key: 'Escape' });
    expect(open.has(surface)).toBe(true);
  });

  it('pins and unpins from the Pin toggle and pinPopover, reporting each', () => {
    const { surface } = mount();
    const { changes } = wire(surface);
    expect(isPopoverPinned(surface)).toBe(false);
    surface.showPopover();
    pin(surface)
      .querySelector('svg')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(isPopoverPinned(surface)).toBe(true);
    expect(surface.hasAttribute('data-pinned')).toBe(true);
    expect(pin(surface).getAttribute('aria-pressed')).toBe('true');
    expect(changes.at(-1)).toEqual({
      pinned: true,
      placement: { x: 100, y: 84 },
      reason: 'pin',
    });
    pinPopover(surface);
    expect(changes).toHaveLength(1);
    // A click elsewhere in the surface is not the toggle.
    surface.querySelector('p')!.click();
    pinPopover(surface, false);
    expect(changes.at(-1)).toEqual({
      pinned: false,
      placement: null,
      reason: 'unpin',
    });
    expect(surface.hasAttribute('data-pinned')).toBe(false);
    expect(pin(surface).getAttribute('aria-pressed')).toBe('false');
  });

  it('reports a pin of a closed surface without a placement', () => {
    const { surface } = mount();
    const { changes } = wire(surface);
    pinPopover(surface);
    expect(changes).toEqual([{ pinned: true, placement: null, reason: 'pin' }]);
    // Opened pinned with nothing to restore: centered.
    surface.showPopover();
    expect(surface.hasAttribute('data-placed')).toBe(false);
  });

  it('reads its pinned state from the markup when it is not wired', () => {
    const { surface } = mount({ presentation: 'embedded', pinned: true });
    expect(isPopoverPinned(surface)).toBe(true);
    pinPopover(surface, false);
    expect(isPopoverPinned(surface)).toBe(true);
  });

  it('moves with the arrow keys on the title, pinning it and clamping to the gutter', () => {
    const { surface } = mount();
    const { changes } = wire(surface);
    surface.showPopover();
    key(handle(surface), { key: 'ArrowRight' });
    expect(changes.map((change) => change.reason)).toEqual(['pin', 'move']);
    expect(position(surface)).toEqual({ x: 108, y: 84 });
    key(handle(surface), { key: 'ArrowDown', shiftKey: true });
    expect(position(surface)).toEqual({ x: 108, y: 124 });
    expect(changes.at(-1)!.placement).toEqual({ x: 108, y: 124 });
    for (let index = 0; index < 5; index += 1)
      key(handle(surface), { key: 'ArrowUp', shiftKey: true });
    expect(position(surface).y).toBe(16);
    key(handle(surface), { key: 'ArrowLeft' });
    expect(position(surface).x).toBe(100);
    const count = changes.length;
    expect(
      key(handle(surface), { key: 'ArrowLeft', metaKey: true })
        .defaultPrevented,
    ).toBe(false);
    key(handle(surface), { key: 'ArrowLeft', altKey: true });
    key(handle(surface), { key: 'ArrowLeft', ctrlKey: true });
    key(handle(surface), { key: 'Home' });
    key(surface.querySelector('p')!, { key: 'ArrowLeft' });
    expect(changes).toHaveLength(count);
  });

  it('honors custom steps and a resolved gutter', () => {
    const { surface } = mount();
    const style = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const real = style(element);
      return {
        direction: 'ltr',
        getPropertyValue: (name: string) =>
          name === '--_kui-pinnable-popover-surface-gutter-px'
            ? '24px'
            : real.getPropertyValue(name),
      } as unknown as CSSStyleDeclaration;
    });
    wire(surface, { step: 2, largeStep: 1000 });
    surface.showPopover();
    key(handle(surface), { key: 'ArrowRight' });
    expect(position(surface).x).toBe(102);
    key(handle(surface), { key: 'ArrowRight', shiftKey: true });
    expect(position(surface).x).toBe(VIEW_WIDTH - 24 - SIZE.width);
  });

  it('drags by the header past a threshold, pinning it, and reports the move', () => {
    const { surface } = mount();
    const { changes } = wire(surface);
    surface.showPopover();
    const bar = header(surface);
    bar.setPointerCapture = vi.fn();
    let captured = true;
    bar.hasPointerCapture = () => captured;
    bar.releasePointerCapture = vi.fn(() => {
      captured = false;
    });
    pointer(handle(surface), 'pointerdown', 150, 100);
    expect(bar.setPointerCapture).toHaveBeenCalledWith(1);
    pointer(bar, 'pointermove', 151, 101);
    expect(changes).toEqual([]);
    pointer(bar, 'pointermove', 200, 100, { pointerId: 2 });
    expect(changes).toEqual([]);
    pointer(bar, 'pointermove', 250, 300);
    expect(changes.map((change) => change.reason)).toEqual(['pin']);
    expect(position(surface)).toEqual({ x: 200, y: 284 });
    pointer(bar, 'pointerup', 250, 300, { pointerId: 2 });
    pointer(bar, 'pointerup', 250, 300);
    expect(bar.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(changes.at(-1)).toEqual({
      pinned: true,
      placement: { x: 200, y: 284 },
      reason: 'move',
    });
    // Dragged past the edge: clamped inside the gutter.
    pointer(bar, 'pointerdown', 250, 300);
    pointer(bar, 'pointermove', 2000, -500);
    pointer(bar, 'pointercancel', 2000, -500);
    expect(position(surface)).toEqual({
      x: VIEW_WIDTH - 16 - SIZE.width,
      y: 16,
    });
    expect(changes.at(-1)!.reason).toBe('move');
  });

  it('ignores presses that are not a header drag', () => {
    const { surface } = mount({
      headerActions: <button type="button">Filter</button>,
    });
    const { changes } = wire(surface);
    surface.showPopover();
    const bar = header(surface);
    pointer(surface.querySelectorAll('button')[1]!, 'pointerdown', 0, 0);
    pointer(bar, 'pointermove', 400, 400);
    pointer(bar, 'pointerdown', 0, 0, { button: 2 });
    pointer(bar, 'pointermove', 400, 400);
    pointer(surface.querySelector('p')!, 'pointerdown', 0, 0);
    pointer(bar, 'pointermove', 400, 400);
    // A header nested in the body is not the surface's.
    const nested = document.createElement('header');
    nested.className = 'kui-pinnable-popover-surface__header';
    surface
      .querySelector('.kui-pinnable-popover-surface__body')!
      .append(nested);
    pointer(nested, 'pointerdown', 0, 0);
    pointer(bar, 'pointermove', 400, 400);
    // A press without movement is a click, not a move.
    pointer(bar, 'pointerdown', 0, 0);
    pointer(bar, 'pointerup', 0, 0);
    pointer(bar, 'pointerup', 0, 0);
    expect(changes).toEqual([]);
  });

  it('re-clamps a pinned surface on window resize and returns when there is room', () => {
    const { surface } = mount();
    const { changes } = wire(surface, {
      pinned: true,
      placement: { x: 700, y: 500 },
    });
    surface.showPopover();
    expect(position(surface)).toEqual({ x: 700, y: 500 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    window.dispatchEvent(new Event('resize'));
    expect(position(surface)).toEqual({ x: 800 - 16 - SIZE.width, y: 500 });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: VIEW_WIDTH,
    });
    window.dispatchEvent(new Event('resize'));
    expect(position(surface)).toEqual({ x: 700, y: 500 });
    // Scrolling never moves a pinned surface.
    document.dispatchEvent(new Event('scroll'));
    expect(changes).toEqual([]);
  });

  it('follows its anchor on resize and scroll while transient', () => {
    const { surface, trigger } = mount();
    wire(surface);
    // Closed: nothing to lay out.
    window.dispatchEvent(new Event('resize'));
    expect(surface.hasAttribute('data-placed')).toBe(false);
    surface.showPopover();
    trigger.getBoundingClientRect = () => rect(300, 60, 80, 40);
    document.dispatchEvent(new Event('scroll'));
    expect(position(surface)).toEqual({ x: 300, y: 104 });
    trigger.getBoundingClientRect = () => rect(320, 60, 80, 40);
    window.dispatchEvent(new Event('resize'));
    expect(position(surface).x).toBe(320);
  });

  it('keeps a pinned surface where it was when it reopens without a stored placement', () => {
    const { surface } = mount();
    wire(surface);
    surface.showPopover();
    surface.hidePopover();
    pinPopover(surface);
    surface.showPopover();
    expect(position(surface)).toEqual({ x: 100, y: 84 });
  });

  it('restores a stored size, survives re-renders, and reports a resize', () => {
    const { surface } = mount();
    const { changes } = wire(surface, {
      pinned: true,
      placement: { x: 40, y: 50, width: 320, height: 240 },
    });
    surface.showPopover();
    expect(surface.style.width).toBe('320px');
    expect(surface.style.height).toBe('240px');
    expect(position(surface)).toEqual({ x: 40, y: 50 });

    // A morph back to the template's attributes.
    surface.setAttribute('style', '');
    surface.removeAttribute('data-pinned');
    pin(surface).setAttribute('aria-pressed', 'false');
    return flush().then(async () => {
      expect(surface.style.width).toBe('320px');
      expect(position(surface)).toEqual({ x: 40, y: 50 });
      expect(surface.hasAttribute('data-pinned')).toBe(true);
      expect(pin(surface).getAttribute('aria-pressed')).toBe('true');
      expect(changes).toEqual([]);

      // The person resizes it from its corner.
      surface.style.width = '400px';
      await flush();
      expect(changes.at(-1)).toEqual({
        pinned: true,
        placement: { x: 40, y: 50, width: 400, height: 240 },
        reason: 'resize',
      });
      surface.style.height = '300px';
      await flush();
      expect(changes.at(-1)!.placement).toEqual({
        x: 40,
        y: 50,
        width: 400,
        height: 300,
      });

      // Unpinned, the size goes back to the CSS.
      pinPopover(surface, false);
      expect(surface.style.width).toBe('');
      expect(position(surface)).toEqual({ x: 100, y: 84 });
    });
  });

  it('takes a resize of a pinned surface with nothing stored yet', async () => {
    const { surface } = mount();
    const { changes } = wire(surface, { pinned: true });
    surface.showPopover();
    surface.style.height = '260px';
    await flush();
    expect(changes).toEqual([
      {
        pinned: true,
        placement: {
          x: CENTER.x,
          y: (VIEW_HEIGHT - 260) / 2,
          width: SIZE.width,
          height: 260,
        },
        reason: 'resize',
      },
    ]);
  });

  it('lays out a surface that is already open when wired, and disposes cleanly', () => {
    const { surface } = mount();
    open.add(surface);
    const { changes, dispose } = wire(surface, {
      placement: { x: 1, y: 1 },
    });
    // A placement without pinned is ignored: transient, below the invoker.
    expect(position(surface)).toEqual({ x: 100, y: 84 });
    dispose();
    expect(surface.hasAttribute('data-placed')).toBe(false);
    expect(
      surface.style.getPropertyValue('--_kui-pinnable-popover-surface-x'),
    ).toBe('');
    pinPopover(surface);
    key(handle(surface), { key: 'ArrowRight' });
    expect(changes).toEqual([]);
    expect(isPopoverPinned(surface)).toBe(false);
  });

  it('keeps a newer controller when an older one is disposed', () => {
    const { surface } = mount();
    const first = wire(surface);
    const second = wire(surface);
    first.dispose();
    pinPopover(surface);
    expect(isPopoverPinned(surface)).toBe(true);
    expect(second.changes).toHaveLength(1);
    second.dispose();
  });

  it('works without an onChange', () => {
    const { surface } = mount();
    const dispose = wirePinnablePopover(surface);
    pinPopover(surface);
    expect(isPopoverPinned(surface)).toBe(true);
    dispose();
  });
});
