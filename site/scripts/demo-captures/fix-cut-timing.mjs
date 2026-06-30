#!/usr/bin/env node
/**
 * Restore `step-end` timing on cut-frame visibility animations after SVGO.
 *
 * domotion emits, for a hard-cut frame's opacity track:
 *
 *     .f-N { animation: fv-N <t>s infinite; animation-timing-function: step-end; }
 *
 * The explicit `animation-timing-function: step-end` comes AFTER the `animation`
 * shorthand on purpose — the shorthand resets timing-function to its initial
 * `ease`, and the override puts it back. But `optimize: true` runs the output
 * through SVGO, whose CSS minifier reorders / re-shapes these declarations (the
 * exact shape varies per demo — a split `.f-N{animation-timing-function:step-end}`
 * rule for some, an inline-but-clobbered-by-a-later-shorthand form for others),
 * and in every shape the LAST `animation:fv-N …` shorthand ends up WITHOUT
 * step-end, resetting timing-function to `ease`.
 *
 * For interior frames this is invisible (their opacity 1->0 keyframe span is a
 * 0.001% sliver — instant under any timing). But the LAST frame's visible window
 * runs from its start to 100% with opacity 1 at the start and 0 at `to`, so under
 * `ease` it INTERPOLATES — the whole final frame fades to black over its entire
 * duration ("they fade out while the user is trying to absorb what they just
 * saw"). A hard cut must hold, then snap.
 *
 * Fix: fold `step-end` into EVERY `fv-N` (frame-visibility) shorthand, so the
 * shorthand can't reset timing-function. This is correct because every demo
 * frame is a hard cut (enforced by tests/unit/demo-configs.test.ts — all frames
 * must declare `type: "cut"`); a cut's visibility track is supposed to snap, not
 * fade. Intra-frame motion tracks (translateX/scale/…) use different keyframe
 * names (not `fv-N`), so they are untouched and keep their own easing.
 * Idempotent.
 *
 * If a non-cut demo is ever added, the all-cut test fails first — revisit this
 * assumption before relaxing that test.
 *
 * Usage: node fix-cut-timing.mjs <file1.svg> [file2.svg ...]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('fix-cut-timing: no SVG files given');
  process.exit(1);
}

for (const file of files) {
  const svg = readFileSync(file, 'utf8');

  let folded = 0;
  const fixed = svg.replace(
    /animation:(fv-\d+) ([0-9.]+)s infinite/g,
    (full, name, secs) => {
      // Already step-end (idempotent) — leave it.
      if (full.includes('step-end')) return full;
      folded += 1;
      return `animation:${name} ${secs}s step-end infinite`;
    },
  );

  writeFileSync(file, fixed);
  console.log(`fix-cut-timing: ${file} — folded step-end into ${folded} cut visibility track(s)`);
}
