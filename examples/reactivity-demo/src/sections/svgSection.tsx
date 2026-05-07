/**
 * §6 — SVG inside mount() renders correctly + animates.
 *
 * Root-`<svg>` JSX strings parse correctly under the HTML5 parser's foreign-
 * content mode, and morphdom inherits that. This section drives the SVG
 * attributes via signals to prove the diff/update path works on SVG.
 *
 * The `toElement` helper that ships alongside this primitive covers the
 * orphan-fragment case for direct callers — not exercised here because the
 * orphan fragment doesn't paint standalone.
 */

import { delegate, mount, signal } from 'kerf';

export function mountSvgRender(root: HTMLElement): void {
  const angle = signal(45);
  const radius = signal(40);

  mount(root, () => (
    <div className="demo-card">
      <h2>6. SVG inside mount <span className="demo-tag">root-svg • animated re-render</span></h2>

      <div className="demo-row">
        <label className="demo-label">
          rotation:
          <input type="range" min="0" max="360" value={String(angle.value)} data-action="set-angle" className="demo-slider" />
          <span className="demo-angle-value">{angle.value}°</span>
        </label>
        <label className="demo-label">
          radius:
          <input type="range" min="10" max="55" value={String(radius.value)} data-action="set-radius" className="demo-slider" />
          <span className="demo-angle-value">{radius.value}</span>
        </label>
      </div>

      <div className="demo-svg-cell">
        <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 120 120" className="demo-svg">
          <g transform={`rotate(${angle.value} 60 60)`}>
            <circle cx="60" cy="60" r={radius.value} fill="#9bd1e5" stroke="#1a76b8" strokeWidth="2" />
            <path
              d={`M 60 ${60 - radius.value} L ${60 + radius.value} 60 L 60 ${60 + radius.value} L ${60 - radius.value} 60 Z`}
              fill="#fde68a"
              stroke="#92400e"
              strokeWidth="2"
              opacity="0.85"
            />
            <text x="60" y="64" textAnchor="middle" fontFamily="sans-serif" fontSize="13" fill="#1a76b8">{angle.value}°</text>
          </g>
        </svg>
      </div>

      <p className="demo-note">
        Drag the sliders. The SVG is re-rendered through <code>mount</code> on
        every input event. The <code>&lt;circle&gt;</code> and
        <code> &lt;path&gt; </code> attributes update in place via morphdom.
      </p>
    </div>
  ));

  delegate(root, 'input', '[data-action="set-angle"]', (_e, target) => {
    angle.value = Number((target as HTMLInputElement).value);
  });
  delegate(root, 'input', '[data-action="set-radius"]', (_e, target) => {
    radius.value = Number((target as HTMLInputElement).value);
  });
}
