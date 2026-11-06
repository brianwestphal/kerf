import assert from 'node:assert/strict';
import test from 'node:test';

import { dashedArcsToPaths, dashedPathArcsToPaths } from './capture.mjs';

const ring = (dash) =>
  `<circle class="arc" cx="12" cy="12" r="10.5" stroke-dasharray="${dash}" fill="none" stroke="rgb(0, 117, 219)" stroke-width="3px" stroke-linecap="round"/>`;

test('turns a dashed progress arc into an explicit arc path', () => {
  const result = dashedArcsToPaths(ring('21.771 65.973'));
  assert.match(
    result,
    /^<path d="M22\.5 12A10\.5 10\.5 0 0 1 [\d.-]+ [\d.-]+"/,
  );
  assert.match(result, /stroke="rgb\(0, 117, 219\)"/);
  assert.match(result, /stroke-linecap="round"/);
  assert.doesNotMatch(result, /dasharray|class=|cx=/);
});

test('uses the large-arc flag past half and keeps undashed circles', () => {
  assert.match(dashedArcsToPaths(ring('50 65.973')), /A10\.5 10\.5 0 1 1/);
  const track = '<circle cx="12" cy="12" r="10.5" stroke-dasharray="none"/>';
  assert.equal(dashedArcsToPaths(track), track);
  assert.match(dashedArcsToPaths(ring('70 65.973')), /^<circle cx="12"/);
});

test('folds a translucent rgba stroke into stroke-opacity', async () => {
  const { foldStrokeAlpha } = await import('./capture.mjs');
  const track =
    '<circle cx="12" stroke="rgba(0, 0, 49, 0.1)" stroke-width="3px" stroke-opacity="1"/>';
  assert.equal(
    foldStrokeAlpha(track),
    '<circle cx="12" stroke="rgb(0, 0, 49)" stroke-width="3px" stroke-opacity="0.1"/>',
  );
  const plain = '<rect stroke="rgba(0,0,28,0.18)" stroke-width="1"/>';
  assert.equal(foldStrokeAlpha(plain), plain);
});

// KF-RS788E: Gauge's fill is a 240-degree arc path dashed by pathLength.
const gaugeFill = (dash) =>
  `<path class="kui-gauge__fill" d="M13.6 71a42 42 0 1 1 72.8 0" pathLength="100" style="stroke-dasharray:${dash};marker:none" fill="none" stroke="rgb(0, 117, 219)" stroke-width="8px" stroke-dasharray="${dash}" stroke-linecap="round"/>`;

test('cuts a pathLength-dashed gauge arc at its dash length', () => {
  // 50 of 100 is half of the 240-degree sweep: straight up from the center
  // (the template's endpoints are rounded, so the top lands at y = 8.047).
  const half = dashedPathArcsToPaths(gaugeFill('50px, 100px'));
  assert.match(half, /^<path d="M13\.6 71A42 42 0 0 1 50 8\.047"/);
  assert.match(half, /stroke="rgb\(0, 117, 219\)"/);
  assert.match(half, /stroke-linecap="round"/);
  assert.doesNotMatch(half, /dasharray|pathLength|class=/);
  // Past half the sweep (120 degrees), the large-arc flag turns on only
  // beyond 180 degrees: 95% is 228 degrees.
  assert.match(
    dashedPathArcsToPaths(gaugeFill('95px, 100px')),
    /A42 42 0 1 1 /,
  );
  assert.match(
    dashedPathArcsToPaths(gaugeFill('42px, 100px')),
    /A42 42 0 0 1 /,
  );
});

test('drops an empty gauge dash and keeps a full one undashed', () => {
  assert.equal(dashedPathArcsToPaths(gaugeFill('0px, 100px')), '');
  const full = dashedPathArcsToPaths(gaugeFill('100px, 100px'));
  assert.match(full, /d="M13\.6 71a42 42 0 1 1 72\.8 0"/);
  assert.doesNotMatch(full, /dasharray|pathLength/);
  // An undashed track path is left alone.
  const track =
    '<path d="M13.6 71a42 42 0 1 1 72.8 0" pathLength="100" stroke-dasharray="none"/>';
  assert.equal(dashedPathArcsToPaths(track), track);
});
