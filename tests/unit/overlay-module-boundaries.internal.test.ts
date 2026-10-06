import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import {
  choice as publicChoice,
  confirm as publicConfirm,
  form as publicForm,
  overlay as publicOverlay,
  popover as publicPopover,
  prompt as publicPrompt,
  tooltip as publicTooltip,
} from '../../src/overlay.js';
import { choice } from '../../src/overlay-choice.js';
import { confirm } from '../../src/overlay-confirm.js';
import { overlay } from '../../src/overlay-core.js';
import { form } from '../../src/overlay-form.js';
import { popover } from '../../src/overlay-popover.js';
import { prompt } from '../../src/overlay-prompt.js';
import { tooltip } from '../../src/overlay-tooltip.js';

const source = (file: string): string =>
  readFileSync(resolve(cwd(), 'src', file), 'utf8');

describe('overlay module boundaries', () => {
  it('the public composition entry preserves the implementation exports', () => {
    expect(publicOverlay).toBe(overlay);
    expect(publicConfirm).toBe(confirm);
    expect(publicPrompt).toBe(prompt);
    expect(publicForm).toBe(form);
    expect(publicChoice).toBe(choice);
    expect(publicPopover).toBe(popover);
    expect(publicTooltip).toBe(tooltip);
  });

  it('focused implementations depend on the core, never the public composition entry', () => {
    for (const file of [
      'overlay-confirm.ts',
      'overlay-prompt.ts',
      'overlay-form.ts',
      'overlay-choice.ts',
      'overlay-popover.ts',
      'overlay-tooltip.ts',
    ]) {
      const contents = source(file);
      expect(contents).toContain("from './overlay-core.js'");
      expect(contents).not.toMatch(/from ['"]\.\/overlay\.js['"]/);
    }
  });

  it('anchored surfaces do not introduce a core import cycle', () => {
    expect(source('overlay-core.ts')).not.toMatch(
      /from ['"]\.\/overlay-(?:popover|tooltip)\.js['"]/,
    );
  });

  it('the public entry and dialog aggregator contain exports only', () => {
    expect(source('overlay.ts')).not.toMatch(/^import /m);
    expect(source('overlay-dialogs.ts')).not.toMatch(/^import /m);
  });
});
