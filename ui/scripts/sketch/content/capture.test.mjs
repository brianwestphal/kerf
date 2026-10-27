import assert from 'node:assert/strict';
import test from 'node:test';

import { dashedArcsToPaths } from './capture.mjs';

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
