import assert from 'node:assert/strict';
import test from 'node:test';

import { dropTransparentGradients } from './capture.mjs';

const gradient = (id, stops) =>
  `<linearGradient id="${id}">${stops.map((color) => `<stop offset="0" stop-color="${color}"/>`).join('')}</linearGradient>`;

test('removes a fully transparent gradient and the shape it paints', () => {
  const svg = `<svg><defs>${gradient('bg0', ['rgba(0,0,0,0)', 'rgba(0, 0, 0, 0)'])}</defs><rect fill="rgba(0,0,98,0.05)"/><rect x="0" fill="url(#bg0)"/><text>is:draft</text></svg>`;
  const result = dropTransparentGradients(svg);
  assert.doesNotMatch(result, /bg0/);
  assert.match(result, /<rect fill="rgba\(0,0,98,0.05\)"\/>/);
  assert.match(result, /is:draft/);
});

test('keeps a gradient with any visible stop', () => {
  const svg = `<svg><defs>${gradient('bg0', ['rgba(0,0,0,0)', 'rgba(10,132,255,0.4)'])}</defs><rect fill="url(#bg0)"/></svg>`;
  assert.equal(dropTransparentGradients(svg), svg);
});
