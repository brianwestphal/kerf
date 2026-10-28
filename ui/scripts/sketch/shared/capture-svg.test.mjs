import assert from 'node:assert/strict';
import test from 'node:test';

import { restoreDotPaths } from './capture-svg.mjs';

test('turns a degenerate round-capped dot into a short segment', () => {
  const dot =
    '<path d="M3 5z" fill="none" stroke="rgb(29, 29, 31)" stroke-width="2px" stroke-linecap="round"/>';
  assert.equal(
    restoreDotPaths(dot),
    '<path d="M3 5h.01" fill="none" stroke="rgb(29, 29, 31)" stroke-width="2px" stroke-linecap="round"/>',
  );
});

test('leaves real paths and butt-capped degenerate paths alone', () => {
  const line = '<path d="M8 5h13" stroke-linecap="round"/>';
  const butt = '<path d="M3 5z" stroke-linecap="butt"/>';
  assert.equal(restoreDotPaths(line), line);
  assert.equal(restoreDotPaths(butt), butt);
});
