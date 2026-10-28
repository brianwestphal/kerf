import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Sketch's plugin loader resolves these CommonJS tasks; the ESM package can't
// require them, so each runs in a VM with a require over its siblings.
function load(name) {
  const sketchModule = { exports: {} };
  vm.runInNewContext(
    readFileSync(new URL(`./${name}.js`, import.meta.url), 'utf8'),
    { module: sketchModule, require: (path) => load(path.replace('./', '')) },
    { filename: `${name}.js` },
  );
  return sketchModule.exports;
}

const { textStyles } = load('text-styles');

const text = (value, attrs) => `<text ${attrs}>${value}</text>`;
const system = 'font-family="system-ui, &quot;-apple-system&quot;, sans-serif"';

test('maps captured CSS weights and a monospace family to native styles', () => {
  const styles = textStyles(
    `<svg>${text('STATUS', `${system} font-weight="650"`)}${text('Live', `${system} font-weight="500"`)}${text('payments ', system)}${text('0A84FF', 'font-family="&quot;Courier New&quot;, monospace"')}</svg>`,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(styles)), {
    STATUS: { weight: 8, family: 'SF Pro' },
    Live: { weight: 6, family: 'SF Pro' },
    payments: { weight: 5, family: 'SF Pro' },
    '0A84FF': { weight: 5, family: 'Courier New' },
  });
});

test('rejects one string captured with two different styles', () => {
  assert.throws(
    () =>
      textStyles(
        `<svg>${text('Board', system)}${text('Board', `${system} font-weight="650"`)}</svg>`,
      ),
    /Ambiguous source text style: Board/,
  );
});
