import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { choice, confirm, form, overlay, prompt } from '../../src/overlay.js';

// happy-dom has no `visualViewport`, so each test installs a controllable fake
// (an EventTarget carrying the three fields kerf reads) and a layout height.
class FakeViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
  scale = 1;
  listeners = 0;
  override addEventListener(
    ...args: Parameters<EventTarget['addEventListener']>
  ): void {
    this.listeners++;
    super.addEventListener(...args);
  }
  override removeEventListener(
    ...args: Parameters<EventTarget['removeEventListener']>
  ): void {
    this.listeners--;
    super.removeEventListener(...args);
  }
  /** Simulate the keyboard (or a pinch zoom) changing the visual viewport. */
  set(
    next: Partial<Pick<FakeViewport, 'height' | 'offsetTop' | 'scale'>>,
    type = 'resize',
  ): void {
    Object.assign(this, next);
    this.dispatchEvent(new Event(type));
  }
}

const INSET = '--kerf-keyboard-inset';
const inset = (el: HTMLElement): string => el.style.getPropertyValue(INSET);

let viewport: FakeViewport;

beforeEach(() => {
  document.body.innerHTML = '';
  viewport = new FakeViewport();
  vi.stubGlobal('visualViewport', viewport);
  vi.stubGlobal('innerHeight', 800);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("overlay() — presentation: 'bottom-sheet'", () => {
  it("the default ('modal') adds no attribute, property, or viewport listener", () => {
    viewport.height = 500; // a keyboard is up — still nothing published
    const h = overlay(raw('<button>go</button>'));
    const explicit = overlay(raw('<button>go</button>'), {
      presentation: 'modal',
    });
    for (const el of [h.el, explicit.el]) {
      expect(el.hasAttribute('data-presentation')).toBe(false);
      expect(inset(el)).toBe('');
    }
    expect(viewport.listeners).toBe(0);
    explicit.close();
    h.close();
  });

  it('marks the plain wrapper and publishes a keyboard that is already up on open', () => {
    viewport.height = 480;
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    expect(h.el.tagName).toBe('DIV');
    expect(h.el.getAttribute('data-presentation')).toBe('bottom-sheet');
    expect(h.el.getAttribute('role')).toBe('dialog');
    expect(inset(h.el)).toBe('320px');
    h.close();
  });

  it('follows a keyboard appearing, moving, and hiding mid-dialog', () => {
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    expect(inset(h.el)).toBe(''); // no keyboard yet
    viewport.set({ height: 500 }); // keyboard appears
    expect(inset(h.el)).toBe('300px');
    viewport.set({ offsetTop: 40 }, 'scroll'); // visual viewport panned up
    expect(inset(h.el)).toBe('260px');
    viewport.set({ height: 500.4, offsetTop: 0 }); // rounding
    expect(inset(h.el)).toBe('300px');
    viewport.set({ height: 800 }); // keyboard hides
    expect(inset(h.el)).toBe('');
    h.close();
  });

  it('publishes nothing while pinch-zoomed, then resumes when the zoom resets', () => {
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    viewport.set({ height: 400, scale: 2 });
    expect(inset(h.el)).toBe('');
    viewport.set({ scale: 1 });
    expect(inset(h.el)).toBe('400px');
    h.close();
  });

  it('close() removes the viewport listeners and the property; later viewport changes are ignored', async () => {
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    viewport.set({ height: 500 });
    expect(viewport.listeners).toBe(2);
    h.close('ok');
    expect(viewport.listeners).toBe(0);
    expect(inset(h.el)).toBe('');
    viewport.set({ height: 300 });
    expect(inset(h.el)).toBe('');
    await expect(h.result).resolves.toBe('ok');
  });

  it('a user dismissal (Escape) also tears the viewport watch down', () => {
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(h.el.isConnected).toBe(false);
    expect(viewport.listeners).toBe(0);
  });

  it('open → close → reopen starts fresh each time (one watch per open sheet)', () => {
    viewport.height = 600;
    const first = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    expect(inset(first.el)).toBe('200px');
    first.close();
    viewport.height = 800; // keyboard hid while closed
    const second = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    expect(second.el).not.toBe(first.el);
    expect(inset(second.el)).toBe('');
    expect(viewport.listeners).toBe(2);
    viewport.set({ height: 450 });
    expect(inset(second.el)).toBe('350px');
    expect(inset(first.el)).toBe('');
    second.close();
    expect(viewport.listeners).toBe(0);
  });

  it('stacked sheets publish independently; an out-of-order close leaves the other watching', () => {
    const lower = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    const upper = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    const centered = overlay(raw('<button>x</button>'));
    viewport.set({ height: 520 });
    expect(inset(lower.el)).toBe('280px');
    expect(inset(upper.el)).toBe('280px');
    expect(inset(centered.el)).toBe('');
    lower.close();
    expect(viewport.listeners).toBe(2);
    viewport.set({ height: 600 });
    expect(inset(upper.el)).toBe('200px');
    expect(inset(lower.el)).toBe('');
    centered.close();
    upper.close();
    expect(viewport.listeners).toBe(0);
  });

  it('an engine without visualViewport still marks the sheet and opens normally', () => {
    vi.stubGlobal('visualViewport', undefined);
    const h = overlay(raw('<input />'), { presentation: 'bottom-sheet' });
    expect(h.el.getAttribute('data-presentation')).toBe('bottom-sheet');
    expect(inset(h.el)).toBe('');
    expect(() => h.close()).not.toThrow();
  });

  it('applies to a non-modal (trap: false) overlay as well', () => {
    viewport.height = 700;
    const h = overlay(raw('<p>note</p>'), {
      presentation: 'bottom-sheet',
      trap: false,
      dismiss: false,
    });
    expect(h.el.getAttribute('data-presentation')).toBe('bottom-sheet');
    expect(inset(h.el)).toBe('100px');
    h.close();
    expect(viewport.listeners).toBe(0);
  });

  describe('native: true', () => {
    it('marks the <dialog> host and publishes before showModal() runs', () => {
      viewport.height = 500;
      let atShow = '';
      const original = HTMLDialogElement.prototype.showModal;
      vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
        function (this: HTMLDialogElement) {
          atShow = this.style.getPropertyValue(INSET);
          original.call(this);
        },
      );
      const h = overlay(raw('<input />'), {
        native: true,
        presentation: 'bottom-sheet',
      });
      expect(h.el.tagName).toBe('DIALOG');
      expect((h.el as HTMLDialogElement).open).toBe(true);
      expect(h.el.getAttribute('data-presentation')).toBe('bottom-sheet');
      expect(atShow).toBe('300px');
      viewport.set({ height: 800 });
      expect(inset(h.el)).toBe('');
      h.close();
      expect((h.el as HTMLDialogElement).open).toBe(false);
      expect(viewport.listeners).toBe(0);
    });

    it('the native cancel (Escape) path tears the watch down', () => {
      const h = overlay(raw('<input />'), {
        native: true,
        presentation: 'bottom-sheet',
      });
      h.el.dispatchEvent(new Event('cancel', { cancelable: true }));
      expect(h.el.isConnected).toBe(false);
      expect(viewport.listeners).toBe(0);
    });

    it('a throwing showModal() rolls the viewport watch back with everything else', () => {
      vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(
        () => {
          throw new Error('showModal failed');
        },
      );
      viewport.height = 500;
      expect(() =>
        overlay(raw('<input />'), {
          native: true,
          presentation: 'bottom-sheet',
        }),
      ).toThrow('showModal failed');
      expect(viewport.listeners).toBe(0);
      expect(document.querySelector('[data-presentation]')).toBeNull();
    });
  });

  it('a throwing first render installs no viewport watch', () => {
    expect(() =>
      overlay(
        () => {
          throw new Error('render failed');
        },
        { presentation: 'bottom-sheet' },
      ),
    ).toThrow('render failed');
    expect(viewport.listeners).toBe(0);
  });
});

describe('promise dialogs thread presentation', () => {
  const sheet = (): HTMLElement =>
    document.querySelector('[data-presentation="bottom-sheet"]') as HTMLElement;
  const click = (selector: string): void =>
    (document.querySelector(selector) as HTMLElement).click();

  it('confirm()', async () => {
    viewport.height = 600;
    const result = confirm('Delete?', { presentation: 'bottom-sheet' });
    expect(sheet().classList.contains('kerf-overlay')).toBe(true);
    expect(inset(sheet())).toBe('200px');
    click('[data-confirm="ok"]');
    await expect(result).resolves.toBe(true);
    expect(viewport.listeners).toBe(0);
  });

  it('prompt() with native: true', async () => {
    const result = prompt('Name?', {
      presentation: 'bottom-sheet',
      native: true,
      defaultValue: 'Ada',
    });
    expect(sheet().tagName).toBe('DIALOG');
    viewport.set({ height: 450 });
    expect(inset(sheet())).toBe('350px');
    click('[data-prompt="ok"]');
    await expect(result).resolves.toBe('Ada');
    expect(viewport.listeners).toBe(0);
  });

  it('form()', async () => {
    const result = form([{ name: 'title', defaultValue: 'Hi' }], {
      presentation: 'bottom-sheet',
    });
    expect(sheet()).not.toBeNull();
    click('[data-form="cancel"]');
    await expect(result).resolves.toBeNull();
    expect(viewport.listeners).toBe(0);
  });

  it('choice()', async () => {
    const result = choice('Save?', [{ value: 'save', label: 'Save' }], {
      presentation: 'bottom-sheet',
    });
    expect(sheet()).not.toBeNull();
    click('[data-choice="0"]');
    await expect(result).resolves.toBe('save');
    expect(viewport.listeners).toBe(0);
  });

  it('a dialog without presentation stays unmarked', async () => {
    const result = confirm('Delete?');
    expect(sheet()).toBeNull();
    expect(viewport.listeners).toBe(0);
    click('[data-confirm="cancel"]');
    await expect(result).resolves.toBe(false);
  });
});
