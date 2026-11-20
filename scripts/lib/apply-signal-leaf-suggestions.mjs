import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

import plugin from '../../eslint-plugin/index.js';

/** Produce the packed consumer's bound.tsx from the edits ESLint offers in an editor. */
export function applySignalLeafSuggestions(cwd) {
  const filename = join(cwd, 'signal-leaf.tsx');
  const source = readFileSync(filename, 'utf8');
  const messages = new Linter({ cwd }).verify(
    source,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { projectService: true, tsconfigRootDir: cwd },
        },
        plugins: { kerfjs: plugin },
        rules: { 'kerfjs/prefer-signal-leaf': 'warn' },
      },
    ],
    { filename },
  );
  assert.equal(messages.length, 2, JSON.stringify(messages));
  let edited = source;
  for (const message of messages.reverse()) {
    assert.equal(message.messageId, 'leaf');
    assert.equal(message.fix, undefined);
    const {
      range: [start, end],
      text,
    } = message.suggestions[0].fix;
    edited = edited.slice(0, start) + text + edited.slice(end);
  }
  writeFileSync(join(cwd, 'bound.tsx'), edited);
}
