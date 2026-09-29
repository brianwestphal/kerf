import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  htmlTemplateClassAttributes,
  staticClassNames,
} from '../../lib/html-template-classes.js';

const scan = (...strings) => htmlTemplateClassAttributes(strings);

test('reads complete static class values with their element and static part', () => {
  assert.deepEqual(
    scan('<section class="a b"><div class=\'c\'>', '</div><UL CLASS=d>'),
    [
      { quasi: 0, tag: 'section', value: 'a b' },
      { quasi: 0, tag: 'div', value: 'c' },
      { quasi: 1, tag: 'ul', value: 'd' },
    ],
  );
  assert.deepEqual(scan('<p class = "spaced" hidden>'), [
    { quasi: 0, tag: 'p', value: 'spaced' },
  ]);
});

test('marks holes in a value and keeps only the names static text completes', () => {
  const [whole] = scan('<div class=', '>');
  assert.equal(whole.value, '\0');
  assert.deepEqual(staticClassNames(whole.value), []);
  const [quoted] = scan('<div class="', '">');
  assert.deepEqual(staticClassNames(quoted.value), []);
  const [partial] = scan('<div class="kui-a kui-b-', ' kui-c">');
  assert.deepEqual(staticClassNames(partial.value), ['kui-a', 'kui-c']);
});

test('finds a class after holes earlier in the same tag', () => {
  assert.deepEqual(scan('<aside title=', ' aria-label="', '" class="x">'), [
    { quasi: 2, tag: 'aside', value: 'x' },
  ]);
});

test('skips comments, text, closing tags, doctypes, and hole-named tags and attributes', () => {
  assert.deepEqual(
    scan(
      '<!DOCTYPE html><!-- <div class="c"> -->class="t" a < b </div><',
      ' class="tag-hole"><div data-',
      '="v" class-x="n" data-class="n"><?x class="pi"?>',
    ),
    [],
  );
  assert.deepEqual(scan('<div', ' class="after-tag-hole">'), []);
  assert.deepEqual(scan('<div class="unterminated'), [
    { quasi: 0, tag: 'div', value: 'unterminated' },
  ]);
  assert.deepEqual(scan('<!-- unterminated <div class="x">'), []);
  assert.deepEqual(scan('<div "stray" =x class="y">'), [
    { quasi: 0, tag: 'div', value: 'y' },
  ]);
});
