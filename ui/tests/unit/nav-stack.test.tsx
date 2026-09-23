import { raw } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NavStack, type NavStackView } from '../../src/nav-stack.js';
import { wireNavStack } from '../../src/wire-nav-stack.js';

const view = (
  key: string,
  title?: string,
  toolbar?: unknown,
  bottomToolbar?: unknown,
): NavStackView => ({
  key,
  title,
  content: raw(`<p class="body">${key}</p>`),
  toolbar: toolbar as NavStackView['toolbar'],
  bottomToolbar: bottomToolbar as NavStackView['bottomToolbar'],
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
  it('renders a single view with no back control', () => {
    const html = String(
      NavStack({ id: 'nav', label: 'Flow', views: [view('home', 'Home')] }),
    );
    expect(html).toContain('data-component="nav-stack"');
    expect(html).toContain('data-depth="1"');
    expect(html).not.toContain('data-nav-back');
    expect(html).toContain('data-nav-active="true"');
    expect(html).toContain(
      'kui-nav-stack__title" data-component="toolbar-text" data-size="large"><span class="kui-toolbar-text__text">Home</span></span>',
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
      'kui-nav-stack__title" data-component="toolbar-text" data-size="large"><span class="kui-toolbar-text__text">Detail</span></span>',
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
        bottomToolbar: raw('<nav>tabs</nav>'),
      }),
    );
    expect(html).toContain('aria-label="Go back"');
    expect(html).toContain('kui-nav-stack tall');
    expect(html).toContain('kui-nav-stack__actions');
    expect(html).toContain('data-nav-stack-bottom');
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
        bottomToolbar: raw('<nav>fallback tools</nav>'),
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
      'kui-nav-stack__title" data-component="toolbar-text" data-size="large"><span class="kui-toolbar-text__text"></span></span>',
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
      bottomToolbar: raw('<nav>Root status</nav>'),
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
      bottomToolbar: raw('<nav>Root status</nav>'),
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
  });
});
