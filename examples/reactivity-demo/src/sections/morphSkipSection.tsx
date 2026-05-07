/**
 * §5 — Tier 3: morph-skip for library-owned subtrees.
 *
 * Stand-in for a third-party widget (xterm-style) that owns its own children
 * and would be corrupted if morphdom recursed inside it. The mount div is
 * marked `data-morph-skip`; `onBeforeElUpdated` returns `false` for it, so
 * morphdom never touches what's inside.
 */

import { delegate, mount, signal } from 'kerf';

export function mountMorphSkip(root: HTMLElement): void {
  const tick = signal(0);
  setInterval(() => { tick.value += 1; }, 1000);

  // Persistent widget DOM, mutated directly. Lives inside the
  // data-morph-skip mount; morphdom never traverses it.
  const widgetHost = document.createElement('div');
  widgetHost.id = 'morph-skip-widget';
  widgetHost.className = 'demo-skip-widget';

  let internalTicks = 0;
  const internalLabel = document.createElement('strong');
  const internalDot = document.createElement('span');
  internalDot.className = 'demo-skip-dot';
  widgetHost.append('Library-owned widget · internal ticks: ', internalLabel, ' ', internalDot);

  function updateWidget(): void {
    internalTicks += 1;
    internalLabel.textContent = String(internalTicks);
    internalDot.style.transform = `translateX(${(internalTicks * 4) % 80}px)`;
  }
  setInterval(updateWidget, 100);
  updateWidget();

  mount(root, () => (
    <div className="demo-card">
      <h2>5. Morph-skip <span className="demo-tag">data-morph-skip • Tier 3 lifecycle</span></h2>

      <p className="demo-tick-line">
        Outer tick (forces parent re-render every second): <strong>{tick.value}</strong>
      </p>

      <div id="morph-skip-mount" className="demo-skip-mount" data-morph-skip>
      </div>

      <div className="demo-row">
        <button type="button" data-action="bump" className="demo-btn">bump outer state</button>
      </div>

      <p className="demo-note">
        The animated dot inside the bordered widget is a stand-in for an
        xterm-style library that owns its own children. The mount div has
        <code> data-morph-skip</code>, so morphdom's <code>onBeforeElUpdated </code>
        returns <code>false</code> and the inside is never traversed.
      </p>
    </div>
  ));

  const mountEl = root.querySelector<HTMLElement>('#morph-skip-mount');
  if (mountEl !== null) mountEl.appendChild(widgetHost);

  delegate(root, 'click', '[data-action="bump"]', () => { tick.value += 100; });
}
