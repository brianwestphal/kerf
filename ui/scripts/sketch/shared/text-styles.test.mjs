import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sketchModule = { exports: {} };
vm.runInNewContext(
  readFileSync(new URL('./text-styles.js', import.meta.url), 'utf8'),
  { module: sketchModule },
  { filename: 'text-styles.js' },
);
const { textStyles } = sketchModule.exports;

const text = (value, attrs) => `<text ${attrs}>${value}</text>`;
const system = 'font-family="system-ui, &quot;-apple-system&quot;, sans-serif"';

test('maps captured CSS weights and a monospace family to native styles', () => {
  const styles = textStyles(
    `<svg>${text('STATUS', `${system} font-weight="650"`)}${text('Live', `${system} font-weight="500"`)}${text('payments ', system)}${text('0A84FF', 'font-family="&quot;Courier New&quot;, monospace"')}</svg>`,
  );
  assert.deepEqual(JSON.parse(JSON.stringify(styles)), {
    STATUS: { weight: 8, family: 'system' },
    Live: { weight: 6, family: 'system' },
    payments: { weight: 5, family: 'system' },
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
