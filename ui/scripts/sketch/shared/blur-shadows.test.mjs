import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sketchModule = { exports: {} };
vm.runInNewContext(
  readFileSync(new URL('./blur-shadows.js', import.meta.url), 'utf8'),
  { module: sketchModule },
  { filename: 'blur-shadows.js' },
);
const { shadowSpecs } = sketchModule.exports;

test('reads each blurred shadow rect and its filter deviation', () => {
  const svg =
    '<svg><defs><filter id="sh0" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>' +
    '<rect x="0" y="12" width="560" height="93.6" rx="12" fill="rgba(0,0,0,0.09)" filter="url(#sh0)"/>' +
    '<rect x="0" y="0" width="560" height="93.6" rx="12" fill="rgb(255,255,255)"/></svg>';
  assert.deepEqual(JSON.parse(JSON.stringify(shadowSpecs(svg))), [
    { x: 0, y: 12, width: 560, height: 93.6, deviation: 16 },
  ]);
});

test('rejects a filter it cannot reproduce natively', () => {
  const svg =
    '<svg><defs><filter id="f0"><feOffset dx="2"/></filter></defs><rect x="0" y="0" width="4" height="4" filter="url(#f0)"/></svg>';
  assert.throws(() => shadowSpecs(svg), /Unsupported capture filter: f0/);
});
