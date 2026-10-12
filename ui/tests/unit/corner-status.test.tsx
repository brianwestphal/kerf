import { afterEach, describe, expect, it, vi } from 'vitest';

import { CornerStatus } from '../../src/components/feedback/corner-status/corner-status.js';
import { wireCornerStatus } from '../../src/components/feedback/corner-status/wiring/wire-corner-status.js';
import { StateBanner } from '../../src/components/feedback/state-banner/state-banner.js';

const banner = () => StateBanner({ title: 'Loading…', tone: 'neutral' });

describe('CornerStatus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders a bottom-end manual popover host by default', () => {
    const html = String(CornerStatus({ children: banner() }));
    expect(html).toContain(
      'class="kui-corner-status" data-component="corner-status" data-placement="bottom-end" data-presentation="overlay" popover="manual"',
    );
    const host = html.slice(0, html.indexOf('>') + 1);
    expect(host).not.toContain('role=');
    expect(host).not.toContain('aria-live');
    expect(html).toContain('role="status" aria-live="polite"');
  });

  it('renders placement, id, slot, and an embedded host without a popover', () => {
    const html = String(
      CornerStatus({
        id: 'loading',
        children: banner(),
        placement: 'top-start',
        presentation: 'embedded',
        className: 'app',
        slot: 'status',
      }),
    );
    expect(html).toContain('id="loading" class="kui-corner-status app"');
    expect(html).toContain('data-placement="top-start"');
    expect(html).toContain('data-presentation="embedded"');
    expect(html).toContain('slot="status"');
    expect(html).not.toContain('popover');
  });
});

describe('wireCornerStatus', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  function stubPopover() {
    const open = new WeakSet<Element>();
    const show = vi.fn(function (this: HTMLElement) {
      open.add(this);
    });
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const original = proto.showPopover;
    proto.showPopover = show;
    const matches = Element.prototype.matches;
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (
      this: Element,
      selector: string,
    ) {
      if (selector === ':popover-open') return open.has(this);
      return matches.call(this, selector);
    });
    return {
      show,
      restore: () => {
        proto.showPopover = original;
      },
    };
  }

  it('opens existing and inserted overlay hosts once, and stops after disposal', async () => {
    const { show, restore } = stubPopover();
    try {
      document.body.innerHTML = `<main>${String(CornerStatus({ children: banner() }))}${String(CornerStatus({ children: banner(), presentation: 'embedded' }))}</main>`;
      const dispose = wireCornerStatus(document);
      expect(show).toHaveBeenCalledTimes(1);

      // Re-scan an already-open host without reopening it.
      const wrapper = document.createElement('section');
      wrapper.innerHTML = String(CornerStatus({ children: banner() }));
      document.body.append(wrapper);
      document.body.append(document.body.querySelector('main')!);
      await Promise.resolve();
      expect(show).toHaveBeenCalledTimes(2);

      const direct = document.createElement('div');
      direct.innerHTML = String(CornerStatus({ children: banner() }));
      const host = direct.firstElementChild!;
      document.body.append(host);
      document.body.append(document.createTextNode('text'));
      await Promise.resolve();
      expect(show).toHaveBeenCalledTimes(3);

      dispose();
      document.body.insertAdjacentHTML(
        'beforeend',
        String(CornerStatus({ children: banner() })),
      );
      await Promise.resolve();
      expect(show).toHaveBeenCalledTimes(3);
    } finally {
      restore();
    }
  });

  it('wires an element root and leaves hosts alone without the Popover API', async () => {
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const original = proto.showPopover;
    proto.showPopover = undefined;
    try {
      const root = document.createElement('div');
      document.body.append(root);
      const dispose = wireCornerStatus(root);
      root.innerHTML = String(CornerStatus({ children: banner() }));
      await Promise.resolve();
      expect(root.querySelector('.kui-corner-status')).not.toBeNull();
      dispose();
    } finally {
      proto.showPopover = original;
    }
  });

  it('skips a host that is not connected', () => {
    const { show, restore } = stubPopover();
    try {
      const detached = document.createElement('div');
      detached.innerHTML = String(CornerStatus({ children: banner() }));
      const dispose = wireCornerStatus(detached);
      expect(show).not.toHaveBeenCalled();
      dispose();
    } finally {
      restore();
    }
  });
});
