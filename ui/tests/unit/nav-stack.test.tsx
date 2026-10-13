import { raw } from 'kerfjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NavStack,
  type NavStackView,
  type NavStackViewToolbar,
} from '../../src/components/navigation/nav-stack/nav-stack.js';
import { wireNavStack } from '../../src/components/navigation/nav-stack/wiring/wire-nav-stack.js';

const view = (
  key: string,
  title?: string,
  toolbar?: unknown,
  bottomToolbar?: unknown,
): NavStackView => ({
  key,
  content: raw(`<p class="body">${key}</p>`),
  toolbar: {
    title,
    trailing: toolbar as NavStackViewToolbar['trailing'],
  },
  bottomToolbar: bottomToolbar
    ? {
        label: 'View Actions',
        leading: bottomToolbar as NavStackView['content'],
      }
    : undefined,
});

const tick = () => new Promise((resolve) => window.setTimeout(resolve, 0));
const delay = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

function mountStack(
  views: NavStackView[],
  props: Partial<Parameters<typeof NavStack>[0]> = {},
): HTMLElement {
  document.body.innerHTML = String(
    NavStack({ id: 'nav', label: 'Flow', views, ...props }),
  );
  return document.body.querySelector<HTMLElement>(
    '[data-component="nav-stack"]',
  )!;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('NavStack markup', () => {
  it('defaults to automatic separators and accepts the hidden override', () => {
    const views = [
      { ...view('home', 'Home'), pane: { appearance: 'sunken' as const } },
    ];
    const automatic = mountStack(views, { bottomToolbar: { label: 'Status' } });
    expect(automatic.dataset.separator).toBe('auto');
    expect(automatic.querySelector('[data-nav-stack-bottom]')).not.toBeNull();
    const hidden = mountStack(views, {
      separator: 'hidden',
      chromeDividers: 'always',
    });
    expect(hidden.dataset.separator).toBe('hidden');
    expect(hidden.dataset.chromeDividers).toBe('always');
  });

  it('marks a selected view for sunken scroll painting', () => {
    const html = String(
      NavStack({
        id: 'nav',
        label: 'Flow',
        views: [{ ...view('home', 'Home'), pane: { appearance: 'sunken' } }],
      }),
    );
    expect(html).toContain('data-appearance="sunken"');
  });
  it('renders a single view with no back control', () => {
    const html = String(
      NavStack({ id: 'nav', label: 'Flow', views: [view('home', 'Home')] }),
    );
    expect(html).toContain('data-component="nav-stack"');
    expect(html).toContain('data-depth="1"');
    expect(html).not.toContain('data-nav-back');
    expect(html).toContain('data-nav-active="true"');
    expect(html).toContain(
      '<span class="kui-toolbar-text" data-component="toolbar-text" data-size="xlarge" data-fill="true"><span class="kui-toolbar-text__text">Home</span></span>',
    );
  });

  it('shows the back control and the top title once the stack has depth', () => {
    const html = String(
      NavStack({
        id: 'nav',
        label: 'Flow',
        views: [view('home', 'Home'), view('detail', 'Detail')],
      }),
    );
    expect(html).toContain('data-nav-back');
    expect(html).toContain('aria-label="Back"');
    expect(html).toContain(
      '<div class="kui-toolbar__center"><span class="kui-toolbar-text" data-component="toolbar-text" data-size="large"><span class="kui-toolbar-text__text">Detail</span></span></div>',
    );
    // Non-top views are hidden but kept mounted.
    expect(html).toContain(
      'data-nav-key="home" data-nav-active="false" aria-hidden="true"',
    );
  });

  it('supports a custom back label, per-view actions, a bottom toolbar, and className', () => {
    const html = String(
      NavStack({
        id: 'nav',
        label: 'Flow',
        backLabel: 'Go back',
        className: 'tall',
        views: [
          view('home'),
          view('detail', 'Detail', raw('<button>Edit</button>')),
        ],
        bottomToolbar: { label: 'Tabs', leading: raw('<nav>tabs</nav>') },
      }),
    );
    expect(html).toContain('aria-label="Go back"');
    expect(html).toContain('kui-nav-stack tall');
    expect(html).toContain(
      '<div class="kui-toolbar__trailing"><button>Edit</button></div>',
    );
    expect(html).toContain('data-nav-stack-bottom');
  });

  it('renders its chrome as a real Toolbar with today’s defaults', () => {
    const root = mountStack([view('home', 'Home'), view('detail', 'Detail')]);
    const chrome = root.querySelector('[data-nav-stack-chrome]')!;
    const toolbar = chrome.querySelector<HTMLElement>(
      ':scope > [data-component="toolbar"]',
    )!;
    // A plain Toolbar: NavStack configures it rather than restyling it.
    expect(toolbar.className).toBe('kui-toolbar');
    expect(toolbar.hasAttribute('divider-sides')).toBe(false);
    expect(toolbar.hasAttribute('aria-label')).toBe(false);
    // With a back control, the title centers on a balanced bar.
    expect(toolbar.dataset.centerAlign).toBe('balanced');
    expect(toolbar.dataset.responsive).toBe('none');
    expect(toolbar.dataset.hasCenter).toBe('true');
    expect(toolbar.dataset.safeAreaBlockStart).toBe('true');
    expect(toolbar.dataset.safeAreaInlineStart).toBe('true');
    expect(toolbar.dataset.safeAreaInlineEnd).toBe('true');
    expect(toolbar.dataset.safeAreaBlockEnd).toBeUndefined();

    // The back control leads; the title is the center zone's only child.
    const leading = toolbar.querySelector('.kui-toolbar__leading')!;
    const [group] = Array.from(leading.children) as HTMLElement[];
    expect(leading.children).toHaveLength(1);
    const center = toolbar.querySelector('.kui-toolbar__center')!;
    const [title] = Array.from(center.children) as HTMLElement[];
    expect(center.children).toHaveLength(1);
    expect(title.dataset.fill).toBeUndefined();
    expect(group.dataset.component).toBe('toolbar-control-group');
    expect(group.dataset.appearance).toBe('contained');
    expect(group.dataset.shape).toBe('pill');
    expect(group.dataset.single).toBe('true');
    const back = group.querySelector<HTMLButtonElement>('[data-nav-back]')!;
    expect(back.getAttribute('aria-label')).toBe('Back');
    expect(back.querySelector('[data-lucide="chevron-left"]')).not.toBeNull();
    expect(title.dataset.component).toBe('toolbar-text');
    expect(title.dataset.size).toBe('large');
    expect(title.hasAttribute('role')).toBe(false);
  });

  it('leads with a left-aligned title at the root and centers it once it can pop', () => {
    const toolbarOf = (root: HTMLElement) =>
      root.querySelector<HTMLElement>(
        '[data-nav-stack-chrome] > [data-component="toolbar"]',
      )!;
    // Root: no back control, so the title fills the leading zone.
    const rootToolbar = toolbarOf(
      mountStack([view('home', 'Home')], {
        toolbarConfig: { centerAlign: 'stretch' },
      }),
    );
    expect(rootToolbar.dataset.centerAlign).toBe('stretch');
    // The root title is the page heading, so it takes the xlarge size; a
    // title beside a back control steps down to large.
    expect(
      rootToolbar.querySelector<HTMLElement>('.kui-toolbar-text')!.dataset.size,
    ).toBe('xlarge');
    expect(
      rootToolbar.querySelector(
        '.kui-toolbar__leading > .kui-toolbar-text[data-fill="true"]',
      ),
    ).not.toBeNull();
    // Depth: the title centers and the bar balances, overriding a configured
    // alignment that applies only to view-owned center content.
    const pushed = toolbarOf(
      mountStack([view('home', 'Home'), view('detail', 'Detail')], {
        toolbarConfig: { centerAlign: 'stretch' },
      }),
    );
    expect(pushed.dataset.centerAlign).toBe('balanced');
    expect(
      pushed.querySelector<HTMLElement>('.kui-toolbar-text')!.dataset.size,
    ).toBe('large');
    expect(
      pushed.querySelector('.kui-toolbar__center > .kui-toolbar-text')
        ?.textContent,
    ).toBe('Detail');
    expect(
      pushed.querySelector('.kui-toolbar__leading .kui-toolbar-text'),
    ).toBe(null);
  });

  it('forwards the toolbar configuration, title size, and heading level', () => {
    const root = mountStack([view('home', 'Home')], {
      toolbarConfig: {
        label: 'Home toolbar',
        dividerSides: 'b',
        centerAlign: 'stretch',
        responsive: 'stack',
        responsiveAt: 'compact',
        safeAreaEdges: ['block-start'],
        titleSize: 'xlarge',
        headingLevel: 1,
      },
    });
    const toolbar = root.querySelector<HTMLElement>(
      '[data-nav-stack-chrome] > [data-component="toolbar"]',
    )!;
    expect(toolbar.getAttribute('aria-label')).toBe('Home toolbar');
    expect(toolbar.getAttribute('divider-sides')).toBe('b');
    expect(toolbar.dataset.centerAlign).toBe('stretch');
    expect(toolbar.dataset.responsive).toBe('stack');
    expect(toolbar.dataset.responsiveAt).toBe('compact');
    expect(toolbar.dataset.safeAreaBlockStart).toBe('true');
    expect(toolbar.dataset.safeAreaInlineStart).toBeUndefined();
    const title = toolbar.querySelector<HTMLElement>(
      '.kui-toolbar-text[data-fill="true"]',
    )!;
    expect(title.dataset.size).toBe('xlarge');
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('1');
  });

  it('places per-view leading and center content in the toolbar zones', () => {
    const root = mountStack([
      view('home', 'Home'),
      {
        ...view('detail', 'Detail', raw('<button>Edit</button>')),
        toolbar: {
          title: 'Detail',
          leading: raw('<div class="lead-group">Lead</div>'),
          center: raw('<div class="center-group">Center</div>'),
          trailing: raw('<button>Edit</button>'),
        },
      },
    ]);
    const toolbar = root.querySelector<HTMLElement>(
      '[data-nav-stack-chrome] > [data-component="toolbar"]',
    )!;
    expect(toolbar.dataset.hasCenter).toBe('true');
    const leading = Array.from(
      toolbar.querySelector('.kui-toolbar__leading')!.children,
    ).map((child) => child.className);
    expect(leading).toEqual([
      'kui-toolbar-control-group',
      'lead-group',
      'kui-toolbar-text',
    ]);
    expect(
      toolbar.querySelector('.kui-toolbar__center .center-group'),
    ).not.toBeNull();
  });

  it('keeps each view header in its Pane and a panel toggle last', () => {
    const root = mountStack(
      [
        {
          ...view('home', 'Collection'),
          header: raw('<h2>Collection header</h2>'),
        },
        {
          ...view('detail', 'Ticket', raw('<button>Actions</button>')),
          header: raw('<h2>Ticket Header</h2>'),
        },
      ],
      { panelToggle: raw('<button data-toggle>Toggle</button>') },
    );
    const chrome = root.querySelector('[data-nav-stack-chrome]')!;
    expect(chrome.querySelector('[data-nav-stack-header]')).toBeNull();
    expect(
      root.querySelector(
        '.kui-nav-stack__view[data-nav-active="true"] [data-nav-stack-header]',
      )?.textContent,
    ).toBe('Ticket Header');
    expect(
      Array.from(chrome.querySelectorAll('.kui-toolbar__trailing button')).map(
        (button) => button.textContent,
      ),
    ).toEqual(['Actions', 'Toggle']);
    expect(root.querySelectorAll('[data-nav-stack-header]')).toHaveLength(2);
  });

  it('forwards each view’s toolbar, Pane, header and footer list configuration', () => {
    const root = mountStack(
      [
        {
          key: 'home',
          content: raw('<p>Home content</p>'),
          toolbar: {
            title: 'Home',
            label: 'Home actions',
            centerAlign: 'stretch',
            headingLevel: 2,
            trailing: raw('<button>Save</button>'),
          },
          header: raw('<p>Filters</p>'),
          headerList: { gap: 'm', textInsets: 'rl' },
          footer: raw('<p>Status</p>'),
          footerList: { gap: 'xs', textInsets: 'rl' },
          pane: {
            contentElement: 'main',
            contentLabel: 'Home content',
            appearance: 'sunken',
            deepInset: true,
            chromeDividers: 'always',
            scrollClearance: 'block-end',
            headerPresentation: 'overlay',
          },
          bottomToolbar: {
            label: 'Bottom actions',
            centerAlign: 'stretch',
            leading: raw('<button>Refresh</button>'),
          },
        },
      ],
      { toolbarConfig: { centerAlign: 'center', headingLevel: 1 } },
    );
    const toolbar = root.querySelector<HTMLElement>(
      '[data-nav-stack-chrome] > [data-component="toolbar"]',
    )!;
    expect(toolbar.getAttribute('aria-label')).toBe('Home actions');
    expect(toolbar.dataset.centerAlign).toBe('stretch');
    expect(toolbar.querySelector('[aria-level="2"]')?.textContent).toBe('Home');
    expect(
      toolbar.querySelector('.kui-toolbar__trailing button')?.textContent,
    ).toBe('Save');
    const pane = root.querySelector<HTMLElement>(
      '.kui-nav-stack__view > [data-component="pane"]',
    )!;
    expect(pane.dataset.appearance).toBe('sunken');
    expect(pane.dataset.deepInset).toBe('true');
    expect(pane.dataset.chromeDividers).toBe('always');
    expect(pane.dataset.scrollClearance).toBe('block-end');
    expect(pane.dataset.headerPresentation).toBe('overlay');
    expect(
      pane.querySelector('main[aria-label="Home content"]')?.textContent,
    ).toBe('Home content');
    expect(
      pane
        .querySelector('[data-nav-stack-header] [data-component="list"]')
        ?.getAttribute('data-gap'),
    ).toBe('true');
    expect(
      pane
        .querySelector('[data-nav-stack-footer] [data-component="list"]')
        ?.getAttribute('data-gap'),
    ).toBe('true');
    const bottom = root.querySelector<HTMLElement>(
      '[data-nav-stack-bottom] [data-component="toolbar"]',
    )!;
    expect(bottom.getAttribute('aria-label')).toBe('Bottom actions');
    expect(bottom.dataset.centerAlign).toBe('stretch');
    expect(bottom.querySelector('button')?.textContent).toBe('Refresh');
  });

  it('accepts a custom back icon and visible back text', () => {
    const root = mountStack([view('home', 'Home'), view('detail', 'Detail')], {
      backLabel: 'Unused',
      backIcon: raw('<svg class="custom-back"></svg>'),
      backText: 'Home',
    });
    const back = root.querySelector<HTMLButtonElement>('[data-nav-back]')!;
    expect(back.hasAttribute('aria-label')).toBe(false);
    expect(back.textContent).toBe('Home');
    expect(back.querySelector('.custom-back')).not.toBeNull();
    expect(back.querySelector('[data-lucide]')).toBeNull();
    expect(
      back.closest<HTMLElement>('[data-component="toolbar-control-group"]')!
        .dataset.content,
    ).toBe('mixed');
  });

  it('prefers the active view bottom toolbar over the persistent fallback', () => {
    const html = String(
      NavStack({
        id: 'nav',
        label: 'Flow',
        views: [
          view('home', 'Home'),
          view('detail', 'Detail', undefined, raw('<nav>detail tools</nav>')),
        ],
        bottomToolbar: {
          label: 'Fallback tools',
          leading: raw('<nav>fallback tools</nav>'),
        },
      }),
    );
    expect(html).toContain('<nav>detail tools</nav>');
    expect(html).not.toContain('fallback tools');
  });

  it('renders an empty stack without a top view', () => {
    const html = String(NavStack({ id: 'nav', label: 'Flow', views: [] }));
    expect(html).toContain('data-depth="0"');
    expect(html).not.toContain('data-nav-back');
    expect(html).not.toContain('kui-nav-stack__actions');
    expect(html).toContain(
      '<span class="kui-toolbar-text" data-component="toolbar-text" data-size="xlarge" data-fill="true"><span class="kui-toolbar-text__text"></span></span>',
    );
  });

  it('omits the chrome when hideToolbar is set', () => {
    const html = String(
      NavStack({
        id: 'nav',
        label: 'Flow',
        hideToolbar: true,
        views: [view('home', 'Home')],
      }),
    );
    expect(html).not.toContain('data-nav-stack-chrome');
    expect(html).toContain('data-nav-stack-viewport');
  });
});

describe('wireNavStack', () => {
  it('returns a no-op disposer when no nav-stack is present', () => {
    const root = document.createElement('div');
    const dispose = wireNavStack(root);
    expect(() => dispose()).not.toThrow();
  });

  it('invokes onBack when the back control is used', () => {
    const root = mountStack([view('home', 'Home'), view('detail', 'Detail')]);
    const onBack = vi.fn();
    const dispose = wireNavStack(root, { onBack });
    root.querySelector<HTMLButtonElement>('[data-nav-back]')!.click();
    expect(onBack).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('slides a pushed view in (animated path)', async () => {
    const root = mountStack([view('home', 'Home')]);
    const dispose = wireNavStack(root, { duration: 10 });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const prev = viewport.querySelector<HTMLElement>('.kui-nav-stack__view')!;
    prev.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);
    await tick();
    await delay(30);
    // The transient entering class is cleared once the animation frame runs.
    expect(next.classList.contains('kui-nav-stack__view--entering')).toBe(
      false,
    );
    expect(viewport.querySelectorAll('.kui-nav-stack__view')).toHaveLength(2);
    dispose();
  });

  it('cross-fades snapshots of the top and bottom chrome across a push', async () => {
    const root = mountStack([view('home', 'Home')], {
      bottomToolbar: {
        label: 'Root status',
        leading: raw('<nav>Root status</nav>'),
      },
    });
    const dispose = wireNavStack(root, { duration: 10 });
    root.querySelector('.kui-toolbar-text__text')!.textContent = 'Detail';
    root.querySelector('[data-nav-stack-bottom]')!.innerHTML =
      '<nav>Detail status</nav>';
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '.kui-nav-stack__view',
    )!.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);

    await tick();
    expect(root.dataset.navChromeTransition).toBe('true');
    expect(root.querySelectorAll('[data-nav-chrome-copy]')).toHaveLength(2);
    expect(root.textContent).toContain('Root status');
    expect(root.textContent).toContain('Detail status');
    expect(
      root.style.getPropertyValue('--kui-nav-stack-transition-duration'),
    ).toBe('10ms');

    await delay(30);
    expect(root.dataset.navChromeTransition).toBeUndefined();
    expect(root.querySelectorAll('[data-nav-chrome-copy]')).toHaveLength(0);
    dispose();
    expect(
      root.style.getPropertyValue('--kui-nav-stack-transition-duration'),
    ).toBe('');
  });

  it('removes in-flight chrome copies and restores an existing duration on dispose', async () => {
    const root = mountStack([view('home', 'Home')], {
      bottomToolbar: {
        label: 'Root status',
        leading: raw('<nav>Root status</nav>'),
      },
    });
    root.style.setProperty('--kui-nav-stack-transition-duration', '77ms');
    const dispose = wireNavStack(root, { duration: 10 });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '.kui-nav-stack__view',
    )!.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);

    await tick();
    expect(root.querySelectorAll('[data-nav-chrome-copy]')).toHaveLength(2);
    dispose();
    expect(root.querySelectorAll('[data-nav-chrome-copy]')).toHaveLength(0);
    expect(root.dataset.navChromeTransition).toBeUndefined();
    expect(
      root.style.getPropertyValue('--kui-nav-stack-transition-duration'),
    ).toBe('77ms');
  });

  it('keeps snapshots clean and cancels interrupted push/pop and dispose frames', async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let frameId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.set(++frameId, callback);
      return frameId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      callbacks.delete(id);
    });
    const root = mountStack([view('home', 'Home')], {
      bottomToolbar: {
        label: 'Home status',
        leading: raw('<nav>Home status</nav>'),
      },
    });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.firstElementChild as HTMLElement;
    const dispose = wireNavStack(root, { duration: 200 });
    const push = async (key: string) => {
      home.dataset.navActive = 'false';
      const next = document.createElement('article');
      next.className = 'kui-nav-stack__view';
      next.dataset.navKey = key;
      root.querySelector('.kui-toolbar-text__text')!.textContent = key;
      viewport.append(next);
      await tick();
      return next;
    };
    const detail = await push('detail');
    expect(home.dataset.navRevealed).toBe('true');
    expect(callbacks.size).toBe(2);
    detail.remove();
    home.dataset.navActive = 'true';
    await tick();
    expect(detail.classList.contains('kui-nav-stack__view--entering')).toBe(
      false,
    );
    expect(home.dataset.navRevealed).toBeUndefined();
    expect(root.querySelectorAll('[data-nav-chrome-copy]')).toHaveLength(2);
    expect(
      [...root.querySelectorAll('[data-nav-chrome-copy]')].every(
        (copy) => !copy.classList.contains('kui-nav-stack__chrome--entering'),
      ),
    ).toBe(true);
    // A controlled render can reuse the still-connected exit node for a
    // same-key push: no child-list addition occurs, only active attributes.
    delete detail.dataset.navExiting;
    detail.className = 'kui-nav-stack__view';
    detail.dataset.navActive = 'true';
    home.dataset.navActive = 'false';
    await tick();
    expect(detail.classList.contains('kui-nav-stack__view--entering')).toBe(
      true,
    );
    expect(callbacks.size).toBe(2);
    // Pop callbacks must not run after the next push replaces their transition.
    const next = await push('next');
    expect(detail.isConnected).toBe(true);
    expect(callbacks.size).toBe(2);
    expect(next.classList.contains('kui-nav-stack__view--entering')).toBe(true);
    dispose();
    expect(callbacks.size).toBe(0);
    expect(next.classList.contains('kui-nav-stack__view--entering')).toBe(
      false,
    );
    expect(
      root.querySelectorAll('[data-nav-chrome-copy], [data-nav-revealed]'),
    ).toHaveLength(0);
    await delay(220);
    expect(viewport.children).toHaveLength(3);
  });

  it('keeps nested stack transition nodes outside its cleanup ownership', async () => {
    const root = mountStack([view('home', 'Home')]);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.firstElementChild!;
    const nested = document.createElement('section');
    nested.innerHTML = String(
      NavStack({
        id: 'nested',
        label: 'Nested',
        views: [view('child', 'Child')],
      }),
    );
    home.append(nested);
    const nestedStack = nested.firstElementChild!;
    const copy = document.createElement('div');
    copy.dataset.navChromeCopy = '';
    nestedStack.append(copy);
    const child = nested.querySelector<HTMLElement>('.kui-nav-stack__view')!;
    child.dataset.navExiting = 'true';
    const dispose = wireNavStack(root, { duration: 0 });
    const detail = document.createElement('article');
    detail.className = 'kui-nav-stack__view';
    detail.dataset.navKey = 'detail';
    viewport.append(detail);
    await tick();
    expect(copy.isConnected).toBe(true);
    expect(child.isConnected).toBe(true);
    dispose();
    expect(copy.isConnected).toBe(true);
    expect(child.isConnected).toBe(true);
  });

  it('finalizes a pushed view instantly when animation is disabled', async () => {
    const root = mountStack([view('home', 'Home')]);
    const dispose = wireNavStack(root, { duration: 0 });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '.kui-nav-stack__view',
    )!.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);
    await tick();
    // With animation off, the transient entering class is removed synchronously (no rAF).
    expect(next.classList.contains('kui-nav-stack__view--entering')).toBe(
      false,
    );
    expect(viewport.querySelectorAll('.kui-nav-stack__view')).toHaveLength(2);
    dispose();
  });

  it('re-attaches and slides out a popped view, then removes it (animated path)', async () => {
    const root = mountStack([view('home', 'Home'), view('detail', 'Detail')]);
    const dispose = wireNavStack(root, { duration: 10 });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const top = viewport.querySelector<HTMLElement>('[data-nav-key="detail"]')!;
    const home = viewport.querySelector<HTMLElement>('[data-nav-key="home"]')!;
    home.dataset.navActive = 'true';
    home.setAttribute('aria-hidden', 'false');
    top.remove();
    await tick();
    // The removed top is brought back to animate out.
    const exiting = viewport.querySelector('[data-nav-exiting="true"]');
    expect(exiting).not.toBeNull();
    await delay(30);
    expect(viewport.querySelector('[data-nav-exiting="true"]')).toBeNull();
    dispose();
  });

  it('finalizes instantly under reduced motion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) => ({ matches: query.includes('reduce') }) as MediaQueryList,
    );
    const root = mountStack([view('home', 'Home'), view('detail', 'Detail')]);
    const dispose = wireNavStack(root);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '[data-nav-key="home"]',
    )!.dataset.navActive = 'true';
    viewport.querySelector<HTMLElement>('[data-nav-key="detail"]')!.remove();
    await tick();
    expect(viewport.querySelector('[data-nav-exiting="true"]')).toBeNull();
    expect(viewport.querySelectorAll('.kui-nav-stack__view')).toHaveLength(1);
    dispose();
  });

  it('moves focus into pushes and restores exact controls across nested pops', async () => {
    const root = mountStack([view('home', 'Home')]);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.querySelector<HTMLElement>('[data-nav-key="home"]')!;
    home.innerHTML = '<button id="open-detail">Open detail</button>';
    const opener = home.querySelector<HTMLButtonElement>('#open-detail')!;
    opener.focus();
    const dispose = wireNavStack(root, { duration: 0 });

    home.dataset.navActive = 'false';
    home.setAttribute('aria-hidden', 'true');
    const detail = document.createElement('article');
    detail.className = 'kui-nav-stack__view';
    detail.dataset.navKey = 'detail';
    detail.dataset.navActive = 'true';
    detail.innerHTML =
      '<button id="detail-default" data-nav-focus>Detail default</button><button id="open-leaf">Open leaf</button>';
    viewport.append(detail);
    await tick();
    const detailDefault = detail.querySelector('#detail-default');
    const detailOpener = detail.querySelector<HTMLButtonElement>('#open-leaf')!;
    expect(document.activeElement).toBe(detailDefault);

    detailOpener.focus();
    detail.dataset.navActive = 'false';
    detail.setAttribute('aria-hidden', 'true');
    const leaf = document.createElement('article');
    leaf.className = 'kui-nav-stack__view';
    leaf.dataset.navKey = 'leaf';
    leaf.dataset.navActive = 'true';
    leaf.innerHTML = '<button id="leaf-default">Leaf default</button>';
    viewport.append(leaf);
    await tick();
    expect(document.activeElement).toBe(leaf.querySelector('#leaf-default'));

    detail.dataset.navActive = 'true';
    detail.setAttribute('aria-hidden', 'false');
    leaf.remove();
    await tick();
    expect(document.activeElement).toBe(detailOpener);

    home.dataset.navActive = 'true';
    home.setAttribute('aria-hidden', 'false');
    detail.remove();
    await tick();
    expect(document.activeElement).toBe(opener);
    dispose();
  });

  it('falls back to the revealed view preference when remembered focus disappeared', async () => {
    const root = mountStack([view('home', 'Home')]);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.querySelector<HTMLElement>('[data-nav-key="home"]')!;
    home.innerHTML =
      '<button id="open-detail">Open detail</button><h2 tabindex="-1" data-nav-focus>Home heading</h2>';
    const opener = home.querySelector<HTMLButtonElement>('#open-detail')!;
    opener.focus();
    const dispose = wireNavStack(root, { duration: 0 });

    home.dataset.navActive = 'false';
    home.setAttribute('aria-hidden', 'true');
    const detail = document.createElement('article');
    detail.className = 'kui-nav-stack__view';
    detail.dataset.navKey = 'detail';
    detail.dataset.navActive = 'true';
    detail.innerHTML = '<button>Detail default</button>';
    viewport.append(detail);
    await tick();
    opener.remove();

    home.dataset.navActive = 'true';
    home.setAttribute('aria-hidden', 'false');
    detail.remove();
    await tick();
    expect(document.activeElement).toBe(home.querySelector('[data-nav-focus]'));
    dispose();
  });

  it('skips unavailable preferred and ordinary targets when focusing a push', async () => {
    const root = mountStack([view('home', 'Home')]);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '[data-nav-key="home"]',
    )!.dataset.navActive = 'false';
    const dispose = wireNavStack(root, { duration: 0 });
    const detail = document.createElement('article');
    detail.className = 'kui-nav-stack__view';
    detail.dataset.navKey = 'detail';
    detail.dataset.navActive = 'true';
    detail.innerHTML =
      '<button data-nav-focus disabled>Disabled preference</button><div inert><button>Inert control</button></div><button hidden>Hidden control</button><button id="available">Available control</button>';
    viewport.append(detail);
    await tick();
    expect(document.activeElement).toBe(detail.querySelector('#available'));
    dispose();
  });

  it('focuses and cleans up a view fallback after an empty-then-refill sequence', async () => {
    const root = mountStack([view('home', 'Home')]);
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.querySelector<HTMLElement>('[data-nav-key="home"]')!;
    const dispose = wireNavStack(root, { duration: 0 });
    home.remove();
    await tick();

    const replacement = document.createElement('article');
    replacement.className = 'kui-nav-stack__view';
    replacement.dataset.navKey = 'replacement';
    replacement.dataset.navActive = 'true';
    replacement.textContent = 'No controls';
    viewport.append(replacement);
    await tick();
    expect(document.activeElement).toBe(replacement);
    expect(replacement.tabIndex).toBe(-1);

    replacement.dataset.navActive = 'false';
    replacement.setAttribute('aria-hidden', 'true');
    const second = document.createElement('article');
    second.className = 'kui-nav-stack__view';
    second.dataset.navKey = 'second';
    second.dataset.navActive = 'true';
    second.setAttribute('tabindex', '-2');
    second.textContent = 'Still no controls';
    viewport.append(second);
    await tick();
    expect(document.activeElement).toBe(second);
    expect(second.tabIndex).toBe(-1);

    second.dataset.navActive = 'false';
    second.setAttribute('aria-hidden', 'true');
    const third = document.createElement('article');
    third.className = 'kui-nav-stack__view';
    third.dataset.navKey = 'third';
    third.dataset.navActive = 'true';
    third.innerHTML = '<button>Third control</button>';
    viewport.append(third);
    await tick();
    second.dataset.navActive = 'true';
    second.setAttribute('aria-hidden', 'false');
    third.remove();
    await tick();
    expect(document.activeElement).toBe(second);

    dispose();
    expect(replacement.hasAttribute('tabindex')).toBe(false);
    expect(second.getAttribute('tabindex')).toBe('-2');
  });

  it('stops animating after dispose', async () => {
    const root = mountStack([view('home', 'Home')]);
    const dispose = wireNavStack(root, { duration: 10 });
    dispose();
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);
    await tick();
    expect(next.classList.contains('kui-nav-stack__view--entering')).toBe(
      false,
    );
    expect(document.activeElement).not.toBe(next);
  });
});

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) {
    this.observed.add(target);
  }
  unobserve(target: Element) {
    this.observed.delete(target);
  }
  disconnect() {
    this.observed.clear();
  }
  report(target: Element, blockSize?: number) {
    this.callback(
      [
        (blockSize === undefined
          ? { target }
          : {
              target,
              borderBoxSize: [{ blockSize, inlineSize: 320 }],
            }) as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }
}

/** A stack whose live chrome reports the given border-box height. */
function overlayStack(
  props: Partial<Parameters<typeof NavStack>[0]> = {},
  height = 52,
) {
  const root = mountStack([view('home', 'Home')], {
    chromePresentation: 'overlay',
    ...props,
  });
  const chrome = root.querySelector<HTMLElement>('[data-nav-stack-chrome]');
  if (chrome)
    chrome.getBoundingClientRect = () => ({ height }) as unknown as DOMRect;
  return { root, chrome };
}

const chromeSize = (root: HTMLElement) =>
  root.style.getPropertyValue('--_kui-nav-stack-chrome-block-size');

describe('NavStack overlay chrome', () => {
  const originalResizeObserver = window.ResizeObserver;
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    window.ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('marks overlay chrome only when the top toolbar is shown, and docks by default', () => {
    const render = (props: Partial<Parameters<typeof NavStack>[0]>) =>
      String(
        NavStack({
          id: 'nav',
          label: 'Flow',
          views: [view('a', 'A')],
          ...props,
        }),
      );
    expect(render({})).not.toContain('data-chrome-presentation');
    expect(render({ chromePresentation: 'docked' })).not.toContain(
      'data-chrome-presentation',
    );
    expect(render({ chromePresentation: 'overlay' })).toContain(
      'data-chrome-presentation="overlay"',
    );
    expect(
      render({ chromePresentation: 'overlay', hideToolbar: true }),
    ).not.toContain('data-chrome-presentation');
  });

  it('publishes the live chrome block size and follows it as the chrome resizes', () => {
    const { root, chrome } = overlayStack();
    const dispose = wireNavStack(root, { duration: 0 });
    expect(chromeSize(root)).toBe('52px');
    expect(root.getAttribute('data-chrome-overlay')).toBe('measured');
    const observer = FakeResizeObserver.instances[0]!;
    expect(observer.observed.has(chrome!)).toBe(true);

    // A wrapped title or larger text grows the chrome; the border box wins.
    observer.report(chrome!, 96.5);
    expect(chromeSize(root)).toBe('96.5px');
    // Without a border-box entry the rect is read instead.
    observer.report(chrome!);
    expect(chromeSize(root)).toBe('52px');

    dispose();
    expect(chromeSize(root)).toBe('');
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(observer.observed.size).toBe(0);
  });

  it('leaves a docked stack and a toolbar-less overlay stack unmeasured', () => {
    const docked = mountStack([view('home', 'Home')]);
    const disposeDocked = wireNavStack(docked);
    expect(docked.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(chromeSize(docked)).toBe('');
    disposeDocked();

    const { root } = overlayStack({ hideToolbar: true });
    const dispose = wireNavStack(root);
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(FakeResizeObserver.instances[1]!.observed.size).toBe(0);
    dispose();
  });

  it('restores the published size and gate a re-render strips, before paint', async () => {
    const { root } = overlayStack();
    const dispose = wireNavStack(root);
    root.removeAttribute('style');
    root.removeAttribute('data-chrome-overlay');
    await tick();
    expect(chromeSize(root)).toBe('52px');
    expect(root.getAttribute('data-chrome-overlay')).toBe('measured');
    dispose();
    expect(chromeSize(root)).toBe('');
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
  });

  it('walks docked → overlay → replaced chrome → removed → restored → docked without a stale size', async () => {
    const root = mountStack([view('home', 'Home')]);
    const dispose = wireNavStack(root, { duration: 0 });
    const observer = FakeResizeObserver.instances[0]!;
    const first = root.querySelector<HTMLElement>('[data-nav-stack-chrome]')!;
    first.getBoundingClientRect = () => ({ height: 44 }) as unknown as DOMRect;
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);

    // Docked → overlay: a first chrome is measured at once.
    root.setAttribute('data-chrome-presentation', 'overlay');
    await tick();
    expect(chromeSize(root)).toBe('44px');
    expect(observer.observed.has(first)).toBe(true);

    // A re-render replaces the chrome: the last size holds until the
    // observer reports the replacement after layout.
    const replacement = first.cloneNode(true) as HTMLElement;
    first.replaceWith(replacement);
    await tick();
    expect(observer.observed.has(first)).toBe(false);
    expect(observer.observed.has(replacement)).toBe(true);
    expect(chromeSize(root)).toBe('44px');
    observer.report(replacement, 60);
    expect(chromeSize(root)).toBe('60px');

    // A late report for the chrome no longer measured changes nothing.
    observer.report(first, 10);
    expect(chromeSize(root)).toBe('60px');

    // The toolbar goes away: nothing is laid over the views.
    replacement.remove();
    await tick();
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(chromeSize(root)).toBe('');
    expect(observer.observed.size).toBe(0);

    // It comes back: measured afresh, never with the stale size.
    const restored = replacement.cloneNode(true) as HTMLElement;
    restored.getBoundingClientRect = () =>
      ({ height: 48 }) as unknown as DOMRect;
    root.prepend(restored);
    await tick();
    expect(chromeSize(root)).toBe('48px');

    // Overlay → docked releases the gate.
    root.removeAttribute('data-chrome-presentation');
    await tick();
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(chromeSize(root)).toBe('');
    dispose();
  });

  it('never measures a cross-fading chrome copy across a push', async () => {
    const { root, chrome } = overlayStack();
    const dispose = wireNavStack(root, { duration: 10 });
    const observer = FakeResizeObserver.instances[0]!;
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '.kui-nav-stack__view',
    )!.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);
    await tick();
    const copy = root.querySelector<HTMLElement>('[data-nav-chrome-copy]');
    expect(copy).not.toBeNull();
    expect(observer.observed.has(chrome!)).toBe(true);
    expect(observer.observed.has(copy!)).toBe(false);
    expect(chromeSize(root)).toBe('52px');
    dispose();
  });

  it("publishes the active scroller's classic scrollbar width and follows it across pushes", async () => {
    const { root } = overlayStack();
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.querySelector<HTMLElement>('.kui-nav-stack__view')!;
    const scrollbar = (element: HTMLElement, width: number) => {
      Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(element, 'clientWidth', {
        configurable: true,
        get: () => 320 - width,
      });
    };
    const size = () =>
      root.style.getPropertyValue('--_kui-nav-stack-scrollbar-inline-size');
    scrollbar(home, 15);
    const dispose = wireNavStack(root, { duration: 0 });
    const observer = FakeResizeObserver.instances[0]!;
    // A plain view is its own scroller.
    expect(observer.observed.has(home)).toBe(true);
    expect(size()).toBe('15px');
    // Content that stops overflowing drops the scrollbar.
    scrollbar(home, 0);
    observer.report(home);
    expect(size()).toBe('');

    // Push a view whose sole Pane's content scrolls beneath the chrome.
    home.dataset.navActive = 'false';
    const pushed = document.createElement('article');
    pushed.className = 'kui-nav-stack__view';
    pushed.dataset.navKey = 'detail';
    pushed.dataset.navActive = 'true';
    pushed.innerHTML =
      '<section class="kui-pane"><div class="kui-pane__content"></div></section>';
    const content = pushed.querySelector<HTMLElement>('.kui-pane__content')!;
    scrollbar(content, 12);
    viewport.append(pushed);
    await tick();
    expect(observer.observed.has(home)).toBe(false);
    expect(observer.observed.has(content)).toBe(true);
    expect(size()).toBe('12px');

    // A Pane header starts its content below the chrome: nothing to clear.
    const header = document.createElement('div');
    header.className = 'kui-pane__header';
    content.before(header);
    pushed.dataset.navKey = 'detail-2';
    await tick();
    expect(observer.observed.has(content)).toBe(false);
    expect(size()).toBe('');

    // A nested layout owns its own chrome and scroller.
    pushed.innerHTML = '<section data-component="nav-stack"></section>';
    pushed.dataset.navKey = 'nested';
    await tick();
    expect(size()).toBe('');

    // An empty view is its own scroller again.
    pushed.innerHTML = '';
    scrollbar(pushed, 9);
    pushed.dataset.navKey = 'empty';
    await tick();
    expect(size()).toBe('9px');
    dispose();
    expect(size()).toBe('');
  });

  it('measures at once where ResizeObserver is missing', async () => {
    window.ResizeObserver = undefined as unknown as typeof ResizeObserver;
    const { root, chrome } = overlayStack();
    const dispose = wireNavStack(root);
    expect(chromeSize(root)).toBe('52px');
    const replacement = chrome!.cloneNode(true) as HTMLElement;
    replacement.getBoundingClientRect = () =>
      ({ height: 70 }) as unknown as DOMRect;
    chrome!.replaceWith(replacement);
    await tick();
    expect(chromeSize(root)).toBe('70px');
    dispose();
  });
});

/** A stack whose live bottom toolbar reports the given border-box height. */
function overlayBottomStack(
  props: Partial<Parameters<typeof NavStack>[0]> = {},
  height = 49,
) {
  const root = mountStack([view('home', 'Home')], {
    bottomToolbarPresentation: 'overlay',
    bottomToolbar: { label: 'Actions' },
    ...props,
  });
  const bottom = root.querySelector<HTMLElement>('[data-nav-stack-bottom]');
  if (bottom)
    bottom.getBoundingClientRect = () => ({ height }) as unknown as DOMRect;
  return { root, bottom };
}

const bottomSize = (root: HTMLElement) =>
  root.style.getPropertyValue('--_kui-nav-stack-bottom-block-size');

describe('NavStack overlay bottom toolbar', () => {
  const originalResizeObserver = window.ResizeObserver;
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    window.ResizeObserver =
      FakeResizeObserver as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('marks an overlay bottom toolbar independently of the top chrome, and docks by default', () => {
    const render = (props: Partial<Parameters<typeof NavStack>[0]>) =>
      String(
        NavStack({
          id: 'nav',
          label: 'Flow',
          views: [view('a', 'A')],
          bottomToolbar: { label: 'Actions' },
          ...props,
        }),
      );
    expect(render({})).not.toContain('data-bottom-toolbar-presentation');
    expect(render({ bottomToolbarPresentation: 'docked' })).not.toContain(
      'data-bottom-toolbar-presentation',
    );
    const bottomOnly = render({ bottomToolbarPresentation: 'overlay' });
    expect(bottomOnly).toContain('data-bottom-toolbar-presentation="overlay"');
    // `chromePresentation` stays the top chrome's alone.
    expect(bottomOnly).not.toContain('data-chrome-presentation');
    expect(render({ chromePresentation: 'overlay' })).not.toContain(
      'data-bottom-toolbar-presentation',
    );
  });

  it('publishes the live bottom toolbar block size, follows it, and leaves the top chrome docked', () => {
    const { root, bottom } = overlayBottomStack();
    const dispose = wireNavStack(root, { duration: 0 });
    expect(bottomSize(root)).toBe('49px');
    expect(root.getAttribute('data-bottom-toolbar-overlay')).toBe('measured');
    expect(root.hasAttribute('data-chrome-overlay')).toBe(false);
    expect(chromeSize(root)).toBe('');
    const observer = FakeResizeObserver.instances[0]!;
    expect(observer.observed.has(bottom!)).toBe(true);

    // A taller toolbar (larger text, a safe area) grows; the border box wins.
    observer.report(bottom!, 83);
    expect(bottomSize(root)).toBe('83px');
    observer.report(bottom!);
    expect(bottomSize(root)).toBe('49px');

    dispose();
    expect(bottomSize(root)).toBe('');
    expect(root.hasAttribute('data-bottom-toolbar-overlay')).toBe(false);
    expect(observer.observed.size).toBe(0);
  });

  it('measures both edges independently when both are overlaid', () => {
    const { root, bottom } = overlayBottomStack({
      chromePresentation: 'overlay',
    });
    const chrome = root.querySelector<HTMLElement>('[data-nav-stack-chrome]')!;
    const dispose = wireNavStack(root, { duration: 0 });
    const observer = FakeResizeObserver.instances[0]!;
    observer.report(chrome, 52);
    expect(chromeSize(root)).toBe('52px');
    expect(bottomSize(root)).toBe('49px');
    observer.report(bottom!, 60);
    expect(chromeSize(root)).toBe('52px');
    expect(bottomSize(root)).toBe('60px');
    dispose();
    expect(chromeSize(root)).toBe('');
    expect(bottomSize(root)).toBe('');
  });

  it('leaves a stack with no bottom toolbar unmeasured', () => {
    const root = mountStack([view('home', 'Home')], {
      bottomToolbarPresentation: 'overlay',
    });
    const dispose = wireNavStack(root);
    expect(root.hasAttribute('data-bottom-toolbar-overlay')).toBe(false);
    expect(bottomSize(root)).toBe('');
    expect(FakeResizeObserver.instances[0]!.observed.size).toBe(0);
    dispose();
  });

  it('restores the published size and gate a re-render strips, before paint', async () => {
    const { root } = overlayBottomStack();
    const dispose = wireNavStack(root);
    root.removeAttribute('style');
    root.removeAttribute('data-bottom-toolbar-overlay');
    await tick();
    expect(bottomSize(root)).toBe('49px');
    expect(root.getAttribute('data-bottom-toolbar-overlay')).toBe('measured');
    dispose();
  });

  it('walks docked → overlay → replaced → removed → restored → docked without a stale size', async () => {
    const root = mountStack([view('home', 'Home')], {
      bottomToolbar: { label: 'Actions' },
    });
    const dispose = wireNavStack(root, { duration: 0 });
    const observer = FakeResizeObserver.instances[0]!;
    const first = root.querySelector<HTMLElement>('[data-nav-stack-bottom]')!;
    first.getBoundingClientRect = () => ({ height: 44 }) as unknown as DOMRect;
    expect(root.hasAttribute('data-bottom-toolbar-overlay')).toBe(false);

    root.setAttribute('data-bottom-toolbar-presentation', 'overlay');
    await tick();
    expect(bottomSize(root)).toBe('44px');

    // A view with its own bottom toolbar replaces it: the last size holds
    // until the observer reports the replacement.
    const replacement = first.cloneNode(true) as HTMLElement;
    first.replaceWith(replacement);
    await tick();
    expect(observer.observed.has(first)).toBe(false);
    expect(observer.observed.has(replacement)).toBe(true);
    expect(bottomSize(root)).toBe('44px');
    observer.report(replacement, 88);
    expect(bottomSize(root)).toBe('88px');
    observer.report(first, 10);
    expect(bottomSize(root)).toBe('88px');

    // A view with no bottom toolbar: nothing lies over the views' bottom.
    replacement.remove();
    await tick();
    expect(root.hasAttribute('data-bottom-toolbar-overlay')).toBe(false);
    expect(bottomSize(root)).toBe('');
    expect(observer.observed.size).toBe(0);

    const restored = replacement.cloneNode(true) as HTMLElement;
    restored.getBoundingClientRect = () =>
      ({ height: 50 }) as unknown as DOMRect;
    root.append(restored);
    await tick();
    expect(bottomSize(root)).toBe('50px');

    root.removeAttribute('data-bottom-toolbar-presentation');
    await tick();
    expect(root.hasAttribute('data-bottom-toolbar-overlay')).toBe(false);
    expect(bottomSize(root)).toBe('');
    dispose();
  });

  it('never measures a cross-fading bottom toolbar copy across a push', async () => {
    const { root, bottom } = overlayBottomStack();
    const dispose = wireNavStack(root, { duration: 10 });
    const observer = FakeResizeObserver.instances[0]!;
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    viewport.querySelector<HTMLElement>(
      '.kui-nav-stack__view',
    )!.dataset.navActive = 'false';
    const next = document.createElement('article');
    next.className = 'kui-nav-stack__view';
    next.dataset.navKey = 'detail';
    next.dataset.navActive = 'true';
    viewport.append(next);
    await tick();
    const copy = root.querySelector<HTMLElement>(
      '[data-nav-stack-bottom][data-nav-chrome-copy]',
    );
    expect(copy).not.toBeNull();
    expect(observer.observed.has(bottom!)).toBe(true);
    expect(observer.observed.has(copy!)).toBe(false);
    expect(bottomSize(root)).toBe('49px');
    dispose();
  });

  it('publishes the scrollbar width per edge: a Pane footer keeps its content clear of the toolbar', async () => {
    const { root } = overlayBottomStack({ chromePresentation: 'overlay' });
    const viewport = root.querySelector('[data-nav-stack-viewport]')!;
    const home = viewport.querySelector<HTMLElement>('.kui-nav-stack__view')!;
    home.dataset.navActive = 'false';
    const scrollbar = (element: HTMLElement, width: number) => {
      Object.defineProperty(element, 'offsetWidth', {
        configurable: true,
        get: () => 320,
      });
      Object.defineProperty(element, 'clientWidth', {
        configurable: true,
        get: () => 320 - width,
      });
    };
    const top = () =>
      root.style.getPropertyValue('--_kui-nav-stack-scrollbar-inline-size');
    const bottom = () =>
      root.style.getPropertyValue(
        '--_kui-nav-stack-bottom-scrollbar-inline-size',
      );
    const pushed = document.createElement('article');
    pushed.className = 'kui-nav-stack__view';
    pushed.dataset.navKey = 'detail';
    pushed.dataset.navActive = 'true';
    pushed.innerHTML =
      '<section class="kui-pane"><div class="kui-pane__content"></div></section>';
    const content = pushed.querySelector<HTMLElement>('.kui-pane__content')!;
    scrollbar(content, 12);
    viewport.append(pushed);
    const dispose = wireNavStack(root, { duration: 0 });
    const observer = FakeResizeObserver.instances[0]!;
    // A header-less, footer-less Pane's content scrolls beneath both edges.
    expect(observer.observed.has(content)).toBe(true);
    expect(top()).toBe('12px');
    expect(bottom()).toBe('12px');

    // A footer ends the content above the toolbar; the top still covers it.
    const footer = document.createElement('div');
    footer.className = 'kui-pane__footer';
    content.after(footer);
    pushed.dataset.navKey = 'detail-footer';
    await tick();
    expect(top()).toBe('12px');
    expect(bottom()).toBe('');
    expect(observer.observed.has(content)).toBe(true);

    // A header too: neither edge lies over the scroller.
    const header = document.createElement('div');
    header.className = 'kui-pane__header';
    content.before(header);
    pushed.dataset.navKey = 'detail-both';
    await tick();
    expect(top()).toBe('');
    expect(bottom()).toBe('');
    expect(observer.observed.has(content)).toBe(false);
    dispose();
  });
});
