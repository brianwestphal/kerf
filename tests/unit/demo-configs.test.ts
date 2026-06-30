/**
 * Guard for the animated demo-capture configs under
 * `site/scripts/demo-captures/*.json` (driven by domotion-svg to produce the
 * `site/public/demos/*.svg` previews).
 *
 * KF-272 / KF-273 / KF-274: the demos originally stitched their frames with
 * `crossfade` transitions. Because each frame is a full re-capture of the app,
 * a crossfade cross-dissolves the ENTIRE frame on every state change — two whole
 * UI states double-exposed — which reads as an unnatural full-screen "flash"
 * even when only a few elements actually changed. The fix is a hard cut on every
 * frame: `"transition": { "type": "cut" }`, which domotion emits as an instant
 * step-end opacity flip (no interpolation smear, no dip-to-blank).
 *
 * CRUCIAL: a *missing* `transition` does NOT give a hard cut — domotion defaults
 * an absent transition to a 300 ms `crossfade` (`frame.transition?.type ??
 * "crossfade"` in its animator). So this guard requires every frame to set
 * `type: "cut"` EXPLICITLY; merely checking for the absence of the literal
 * `"crossfade"` string would let the silent-default flash slip through (it did —
 * the first KF-274 attempt removed the transition key and the crossfade came
 * back). This keeps the "no full-screen flash on data change" intent enforceable.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

// vitest is invoked from the repo root, so cwd is the project directory.
const CONFIG_DIR = join(cwd(), 'site', 'scripts', 'demo-captures');
const SVG_DIR = join(cwd(), 'site', 'public', 'demos');

const configFiles = readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.json'));
const svgFiles = readdirSync(SVG_DIR).filter((f) => f.endsWith('.svg'));

interface DemoFrame {
  transition?: { type?: string };
}
interface DemoConfig {
  output?: string;
  frames?: DemoFrame[];
}

describe('demo-capture configs', () => {
  it('finds the demo configs', () => {
    // Sanity: the directory should not be empty, or the guard below is vacuous.
    expect(configFiles.length).toBeGreaterThan(0);
  });

  for (const file of configFiles) {
    describe(file, () => {
      const raw = readFileSync(join(CONFIG_DIR, file), 'utf8');

      it('is valid JSON with a frames array', () => {
        const cfg = JSON.parse(raw) as DemoConfig;
        expect(Array.isArray(cfg.frames)).toBe(true);
        expect(cfg.frames!.length).toBeGreaterThan(0);
        expect(cfg.output).toMatch(/^site\/public\/demos\/.+\.svg$/);
      });

      it('sets an explicit non-crossfade transition on every frame (KF-274: no full-screen dissolve flash)', () => {
        const cfg = JSON.parse(raw) as DemoConfig;
        // Every frame must declare an explicit transition that is NOT a
        // crossfade. A missing transition is NOT a hard cut — domotion silently
        // defaults it to a 300 ms crossfade, the very flash this guard exists to
        // prevent. `cut` (hard cut) and `magic-move` (match-cut bridge, used by
        // the kanban demo for cross-column card slides — KF-271) are both allowed:
        // neither cross-dissolves the whole frame.
        const allowed = new Set(['cut', 'magic-move']);
        const offenders = (cfg.frames ?? [])
          .map((frame, i) => ({ i, type: frame.transition?.type }))
          .filter((f) => !allowed.has(f.type ?? ''));
        expect(offenders).toEqual([]);
      });
    });
  }

  // KF-280: guard the committed SVGs against the "last frame fades to black"
  // regression. domotion emits `step-end` on every cut frame's opacity track,
  // but SVGO (optimize:true) reorders the declarations so the `animation`
  // shorthand resets timing-function to `ease`, which makes the last frame
  // interpolate opacity 1->0 over its whole duration (a fade-out). The capture
  // pipeline re-folds `step-end` via fix-cut-timing.mjs; this asserts it stuck.
  describe('rendered SVGs', () => {
    it('finds the committed demo SVGs', () => {
      expect(svgFiles.length).toBeGreaterThan(0);
    });

    for (const file of svgFiles) {
      it(`${file}: every fv-N opacity track keeps step-end (no last-frame fade)`, () => {
        const svg = readFileSync(join(SVG_DIR, file), 'utf8');
        // Any `animation:fv-N <t>s …` that does not carry `step-end` would
        // interpolate (fade) instead of hard-cutting.
        const offenders = [...svg.matchAll(/animation:(fv-\d+) [0-9.]+s([^;}]*)/g)]
          .filter((m) => !m[2].includes('step-end'))
          .map((m) => m[1]);
        expect(offenders).toEqual([]);
      });
    }
  });
});
