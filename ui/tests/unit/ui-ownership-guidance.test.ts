import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) =>
  readFileSync(resolve(import.meta.dirname, '../..', path), 'utf8');

describe('UI ownership guidance', () => {
  it('states the complete configuration-over-styling boundary for AI consumers', () => {
    const skill = read('ai/skill.md');

    expect(skill).toMatch(
      /applications and\s+component packages built on Kerf UI/,
    );
    expect(skill).toMatch(/raw\s+HTML or Web Awesome elements/);
    expect(skill).toMatch(
      /permission stops at every nested Kerf or application component boundary/,
    );
    expect(skill).toContain('Thin compositions usually need no CSS');
    expect(skill).toMatch(
      /never use a composition stylesheet to normalize or override its\s+children/,
    );
  });

  it('documents the Doctor policy that enforces application component ownership', () => {
    const guidance = read('docs/ui-doctor.md');

    expect(guidance).toContain('"ownership": "component"');
    expect(guidance).toContain('"implicitComponentOwnership": true');
    expect(guidance).toContain('"ownershipContext": "any-package"');
    expect(guidance).toContain('Doctor permits that own CSS');
    expect(guidance).toMatch(
      /reports any\s+selector that crosses into a child component/,
    );
  });
});
