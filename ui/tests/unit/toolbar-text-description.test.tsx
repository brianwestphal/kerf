import { describe, expect, it } from 'vitest';

import { ToolbarText } from '../../src/toolbar-text.js';

const html = (value: unknown) => String(value);

describe('ToolbarText description', () => {
  it('renders quiet supporting copy with its own id', () => {
    const output = html(
      ToolbarText({
        text: 'Custom commands',
        description: 'Changes save automatically.',
        descriptionId: 'hint',
      }),
    );
    expect(output).toContain('data-has-description="true"');
    expect(output).toContain(
      '<span class="kui-toolbar-text__description" id="hint">Changes save automatically.</span>',
    );
  });

  it('moves the id and heading role to the title so names exclude the description', () => {
    const output = html(
      ToolbarText({
        text: 'Custom commands',
        id: 'title',
        headingLevel: 2,
        description: 'Changes save automatically.',
      }),
    );
    expect(output).toMatch(
      /^<span class="kui-toolbar-text"[^>]*data-has-description="true"[^>]*>/,
    );
    expect(output.slice(0, output.indexOf('>'))).not.toMatch(
      /\b(id|role|aria-level)=/,
    );
    expect(output).toContain(
      '<span class="kui-toolbar-text__text" id="title" role="heading" aria-level="2">Custom commands</span>',
    );
  });

  it('keeps the id and heading role on the root without a description', () => {
    const output = html(
      ToolbarText({ text: 'Inbox', id: 'title', headingLevel: 1 }),
    );
    expect(output).toContain('id="title" role="heading" aria-level="1"');
    expect(output).toContain(
      '<span class="kui-toolbar-text__text">Inbox</span>',
    );
    expect(output).not.toContain('data-has-description');
  });

  it('drops the description while a placeholder is loading', () => {
    const output = html(
      ToolbarText({
        text: '',
        placeholder: true,
        id: 'title',
        description: 'Loading copy',
      }),
    );
    expect(output).not.toContain('kui-toolbar-text__description');
    expect(output).not.toContain('data-has-description');
    expect(output).toContain('id="title"');
  });
});
