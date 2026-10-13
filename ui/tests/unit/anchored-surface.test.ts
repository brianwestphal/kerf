import { type OverlayContent, popover } from 'kerfjs/overlay';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  openAnchoredSurface,
  openAnchoredSurfaceAt,
} from '../../src/components/feedback/anchored-surface/anchored-surface.js';

vi.mock('kerfjs/overlay', () => ({ popover: vi.fn() }));

const mockedPopover = vi.mocked(popover);
const content = (() => 'help') as unknown as OverlayContent;

function surface() {
  const el = document.createElement('div');
  let resolve!: (value: unknown) => void;
  const result = new Promise<unknown>((done) => {
    resolve = done;
  });
  const close = vi.fn((value?: unknown) => resolve(value));
  return { el, close, result };
}

beforeEach(() => {
  document.body.replaceChildren();
  mockedPopover.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('anchored surface contract', () => {
  it('rejects an unnamed surface before opening an overlay', () => {
    expect(() =>
      openAnchoredSurface(document.createElement('button'), content, {
        label: '  ',
      }),
    ).toThrow('nonempty label');
    expect(mockedPopover).not.toHaveBeenCalled();
  });
  it('delegates placement and lifecycle, names the non-modal surface, and focuses content by default', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    expect(
      openAnchoredSurface(anchor, content, {
        label: 'Help',
        placement: 'top',
        align: 'end',
        gap: 8,
      }),
    ).toBe(handle);
    expect(mockedPopover).toHaveBeenCalledWith(anchor, content, {
      placement: 'top',
      align: 'end',
      gap: 8,
      className: 'kui-anchored-surface',
      native: true,
      initialFocus: true,
      dismiss: ['escape', 'outside'],
      viewportMargin: 8,
      fitHeight: true,
    });
    expect(handle.el.getAttribute('role')).toBe('dialog');
    expect(handle.el.getAttribute('aria-label')).toBe('Help');
    expect(handle.el.dataset.component).toBe('anchored-surface');
    expect(document.activeElement).toBe(anchor);
  });

  it('forwards explicit focus, dismissal, and viewport-margin policy', () => {
    const anchor = document.createElement('button');
    mockedPopover.mockReturnValue(surface());
    const onDismiss = vi.fn();
    openAnchoredSurface(anchor, content, {
      label: 'Read-only help',
      initialFocus: false,
      dismiss: false,
      onDismiss,
      viewportMargin: 16,
    });
    expect(mockedPopover).toHaveBeenCalledWith(
      anchor,
      content,
      expect.objectContaining({
        initialFocus: false,
        dismiss: false,
        onDismiss,
        viewportMargin: 16,
        fitHeight: true,
      }),
    );
  });

  it('uses the pointer viewport rect within a modal context and removes its temporary anchor on close', async () => {
    const context = document.createElement('dialog');
    const input = document.createElement('input');
    context.append(input);
    document.body.append(context);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    openAnchoredSurfaceAt({ x: 27, y: 48, context: input }, content, {
      label: 'Point help',
    });
    const anchor = context.querySelector('span')!;
    expect(input.children).toHaveLength(0);
    expect(anchor.getBoundingClientRect().x).toBe(27);
    expect(anchor.getBoundingClientRect().y).toBe(48);
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
    expect(mockedPopover.mock.calls[0][0]).toBe(anchor);
    handle.close();
    await handle.result;
    expect(context.querySelector('span')).toBeNull();
  });

  it('forwards an explicit container to the overlay core', () => {
    const anchor = document.createElement('button');
    const container = document.createElement('div');
    mockedPopover.mockReturnValue(surface());
    openAnchoredSurface(anchor, content, { label: 'Help', container });
    expect(mockedPopover).toHaveBeenCalledWith(
      anchor,
      content,
      expect.objectContaining({ container }),
    );
  });

  describe('a pointer context inside a shadow-root modal (wa-dialog / wa-drawer)', () => {
    // happy-dom assigns slots but has no `Element.assignedSlot`; browsers do.
    beforeAll(() => {
      Object.defineProperty(Element.prototype, 'assignedSlot', {
        configurable: true,
        get(this: Element) {
          const slots =
            this.parentElement?.shadowRoot?.querySelectorAll('slot') ?? [];
          return (
            Array.from(slots).find((slot) =>
              slot.assignedElements().includes(this),
            ) ?? null
          );
        },
      });
    });
    afterAll(() => {
      delete (Element.prototype as { assignedSlot?: unknown }).assignedSlot;
    });

    function shadowModal(light: string): HTMLElement {
      const host = document.createElement('div');
      host.innerHTML = light;
      document.body.append(host);
      host.attachShadow({ mode: 'open' }).innerHTML =
        '<slot name="outside"></slot><dialog><slot></slot></dialog>';
      return host;
    }

    it('joins the shadow host light DOM, so the anchor is slotted into the dialog', () => {
      const host = shadowModal('<p><input id="field"></p>');
      mockedPopover.mockReturnValue(surface());
      openAnchoredSurfaceAt(
        { x: 1, y: 2, context: host.querySelector('#field')! },
        content,
        { label: 'Help' },
      );
      const anchor = mockedPopover.mock.calls[0][0];
      expect(anchor.parentElement).toBe(host);
    });

    it('content slotted outside the shadow dialog stays in the body', () => {
      const host = shadowModal('<button slot="outside">x</button>');
      mockedPopover.mockReturnValue(surface());
      openAnchoredSurfaceAt(
        { x: 1, y: 2, context: host.querySelector('button')! },
        content,
        { label: 'Help' },
      );
      expect(mockedPopover.mock.calls[0][0].parentElement).toBe(document.body);
    });

    it('a target inside a component shadow tree resolves through its host', () => {
      const dialog = document.createElement('dialog');
      const widget = document.createElement('div');
      dialog.append(widget);
      document.body.append(dialog);
      const shadow = widget.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<button>inner</button>';
      mockedPopover.mockReturnValue(surface());
      openAnchoredSurfaceAt(
        { x: 1, y: 2, context: shadow.querySelector('button')! },
        content,
        { label: 'Help' },
      );
      expect(mockedPopover.mock.calls[0][0].parentElement).toBe(dialog);
    });
  });

  it('closes when the owning modal closes and drops its listener after dismissal', async () => {
    const dialog = document.createElement('dialog');
    dialog.open = true;
    const anchor = document.createElement('button');
    dialog.append(anchor);
    document.body.append(dialog);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    openAnchoredSurface(anchor, content, { label: 'Modal help' });
    dialog.dispatchEvent(new Event('close'));
    expect(handle.close).toHaveBeenCalledTimes(1);
    await handle.result;
    dialog.dispatchEvent(new Event('close'));
    expect(handle.close).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid coordinates and cleans up when construction throws', () => {
    expect(() =>
      openAnchoredSurfaceAt({ x: NaN, y: 4 }, content, { label: 'Help' }),
    ).toThrow('finite coordinates');
    mockedPopover.mockImplementation(() => {
      throw new Error('placement failed');
    });
    expect(() =>
      openAnchoredSurfaceAt({ x: 1, y: 2 }, content, { label: 'Help' }),
    ).toThrow('placement failed');
    expect(document.querySelector('span')).toBeNull();
  });

  describe('tone', () => {
    // happy-dom does not model `color-scheme`; stub the computed value the
    // browser reports for the anchor.
    function anchorWithScheme(colorScheme: string) {
      const anchor = document.createElement('button');
      document.body.append(anchor);
      const real = window.getComputedStyle.bind(window);
      vi.spyOn(window, 'getComputedStyle').mockImplementation((element) =>
        element === anchor
          ? ({ colorScheme } as CSSStyleDeclaration)
          : real(element),
      );
      return anchor;
    }
    function preferDark(dark: boolean) {
      vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
          matches: dark && query === '(prefers-color-scheme: dark)',
        })),
      );
    }
    function classNameFor(anchor: Element): string {
      const handle = surface();
      mockedPopover.mockReturnValue(handle);
      openAnchoredSurface(anchor, content, { label: 'Volume', tone: 'dark' });
      expect(handle.el.dataset.tone).toBe('dark');
      return mockedPopover.mock.calls[0][2]!.className!;
    }

    it('the default tone keeps the plain surface class and sets no tone', () => {
      const handle = surface();
      mockedPopover.mockReturnValue(handle);
      openAnchoredSurface(document.createElement('button'), content, {
        label: 'Help',
        tone: 'default',
      });
      expect(mockedPopover.mock.calls[0][2]!.className).toBe(
        'kui-anchored-surface',
      );
      expect(handle.el.dataset.tone).toBeUndefined();
    });

    it.each([
      ['light', false, 'dark'],
      ['only light', true, 'dark'],
      ['normal', true, 'dark'],
      ['dark', false, 'light'],
      ['only dark', false, 'light'],
      ['light dark', false, 'dark'],
      ['light dark', true, 'light'],
    ] as const)(
      'an anchor in color-scheme "%s" (prefers dark: %s) opens the dark tone in the %s scheme',
      (colorScheme, prefersDark, expected) => {
        preferDark(prefersDark);
        expect(classNameFor(anchorWithScheme(colorScheme))).toBe(
          `kui-anchored-surface kui-anchored-surface--scheme-${expected}`,
        );
      },
    );

    // KF-49W7J2: while open, the dark tone follows a live scheme switch.
    describe('live scheme switch', () => {
      /** Computed color-scheme per element, mutable as a theme switches. */
      const schemes = new Map<Element, string>();
      let mediaListeners: Array<() => void>;
      let removed: Array<() => void>;
      let prefersDark: boolean;

      beforeEach(() => {
        schemes.clear();
        mediaListeners = [];
        removed = [];
        prefersDark = false;
        vi.stubGlobal(
          'matchMedia',
          vi.fn((query: string) => ({
            get matches() {
              return prefersDark && query === '(prefers-color-scheme: dark)';
            },
            addEventListener: (_type: string, listener: () => void) =>
              mediaListeners.push(listener),
            removeEventListener: (_type: string, listener: () => void) =>
              removed.push(listener),
          })),
        );
        const real = window.getComputedStyle.bind(window);
        vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
          // color-scheme inherits: the nearest ancestor's (or composed
          // host's) stubbed value, else "normal".
          for (let node: Element | null = element; node;) {
            const value = schemes.get(node);
            if (value !== undefined)
              return { colorScheme: value } as CSSStyleDeclaration;
            const root = node.getRootNode();
            node =
              node.parentElement ??
              (root instanceof ShadowRoot ? root.host : null);
          }
          return {
            ...real(element),
            colorScheme: 'normal',
          } as CSSStyleDeclaration;
        });
      });

      function openDark(anchor: Element) {
        const handle = surface();
        mockedPopover.mockReturnValue(handle);
        openAnchoredSurface(anchor, content, { label: 'Volume', tone: 'dark' });
        handle.el.className = mockedPopover.mock.calls.at(-1)![2]!.className!;
        return handle;
      }

      const settle = () =>
        new Promise((done) => globalThis.setTimeout(done, 0));

      it('flips the open surface when an ancestor theme class changes the scheme', async () => {
        const theme = document.createElement('section');
        const anchor = document.createElement('button');
        theme.append(anchor);
        document.body.append(theme);
        schemes.set(theme, 'light');
        const handle = openDark(anchor);
        expect(handle.el.className).toContain('--scheme-dark');
        schemes.set(theme, 'dark');
        theme.className = 'theme-dark';
        await settle();
        expect(handle.el.className).toBe(
          'kui-anchored-surface kui-anchored-surface--scheme-light',
        );
        // An attribute change that does not move the scheme leaves it alone.
        theme.dataset.other = 'x';
        await settle();
        expect(handle.el.className).toContain('--scheme-light');
      });

      it('follows an OS preference change for a `light dark` page', () => {
        const anchor = document.createElement('button');
        document.body.append(anchor);
        schemes.set(document.documentElement, 'light dark');
        const handle = openDark(anchor);
        expect(handle.el.className).toContain('--scheme-dark');
        prefersDark = true;
        mediaListeners.forEach((listener) => listener());
        expect(handle.el.className).toContain('--scheme-light');
      });

      it('watches through a shadow host and stops when the surface closes', async () => {
        const host = document.createElement('div');
        document.body.append(host);
        const anchor = document.createElement('button');
        host.attachShadow({ mode: 'open' }).append(anchor);
        schemes.set(host, 'light');
        const handle = openDark(anchor);
        schemes.set(host, 'dark');
        host.setAttribute('data-theme', 'dark');
        await settle();
        expect(handle.el.className).toContain('--scheme-light');
        handle.close();
        await settle();
        expect(removed).toEqual(mediaListeners);
        schemes.set(host, 'light');
        host.setAttribute('data-theme', 'light');
        await settle();
        expect(handle.el.className).toContain('--scheme-light');
      });

      it('ignores a switch once the scheme source is disconnected', async () => {
        const anchor = document.createElement('button');
        document.body.append(anchor);
        schemes.set(document.documentElement, 'light');
        const handle = openDark(anchor);
        anchor.remove();
        prefersDark = true;
        schemes.set(document.documentElement, 'dark');
        mediaListeners.forEach((listener) => listener());
        expect(handle.el.className).toContain('--scheme-dark');
      });

      it('openAnchoredSurfaceAt reads the scheme from its context, falling back to its modal scope', () => {
        const region = document.createElement('section');
        const target = document.createElement('div');
        region.append(target);
        document.body.append(region);
        schemes.set(document.body, 'light');
        schemes.set(region, 'dark');
        const at = (context?: Element) => {
          const handle = surface();
          mockedPopover.mockReturnValue(handle);
          openAnchoredSurfaceAt({ x: 1, y: 2, context }, content, {
            label: 'Volume',
            tone: 'dark',
          });
          return mockedPopover.mock.calls.at(-1)![2]!.className!;
        };
        // The forced-dark region under the pointer, not the light page.
        expect(at(target)).toContain('--scheme-light');
        // A detached context (a re-rendered target) and no context use the
        // temporary anchor's scope: the light page.
        expect(at(document.createElement('div'))).toContain('--scheme-dark');
        expect(at()).toContain('--scheme-dark');
      });
    });
  });
});
