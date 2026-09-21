import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type AuditedAction = {
  sha: string;
  version: string;
  runtime: 'node24' | 'composite';
  source: string;
};

// Verified against each immutable commit's official action.yml. Keeping the
// runtime here makes Node-runtime migrations an explicit part of every pin
// update instead of a warning discovered only after a workflow starts.
const AUDITED_ACTIONS = {
  'actions/cache': {
    sha: '55cc8345863c7cc4c66a329aec7e433d2d1c52a9',
    version: 'v6.1.0',
    runtime: 'node24',
    source: 'https://github.com/actions/cache/releases/tag/v6.1.0',
  },
  'actions/checkout': {
    sha: '3d3c42e5aac5ba805825da76410c181273ba90b1',
    version: 'v7.0.1',
    runtime: 'node24',
    source: 'https://github.com/actions/checkout/releases/tag/v7.0.1',
  },
  'actions/configure-pages': {
    sha: '45bfe0192ca1faeb007ade9deae92b16b8254a0d',
    version: 'v6.0.0',
    runtime: 'node24',
    source: 'https://github.com/actions/configure-pages/releases/tag/v6.0.0',
  },
  'actions/deploy-pages': {
    sha: '368f82528645a54fb793d4d04e342629a3f51346',
    version: 'v5.0.1',
    runtime: 'node24',
    source: 'https://github.com/actions/deploy-pages/releases/tag/v5.0.1',
  },
  'actions/download-artifact': {
    sha: '3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c',
    version: 'v8.0.1',
    runtime: 'node24',
    source: 'https://github.com/actions/download-artifact/releases/tag/v8.0.1',
  },
  'actions/setup-node': {
    sha: '820762786026740c76f36085b0efc47a31fe5020',
    version: 'v7.0.0',
    runtime: 'node24',
    source: 'https://github.com/actions/setup-node/releases/tag/v7.0.0',
  },
  'actions/upload-artifact': {
    sha: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
    version: 'v7.0.1',
    runtime: 'node24',
    source: 'https://github.com/actions/upload-artifact/releases/tag/v7.0.1',
  },
  'actions/upload-pages-artifact': {
    sha: 'fc324d3547104276b827a68afc52ff2a11cc49c9',
    version: 'v5.0.0',
    runtime: 'composite',
    source:
      'https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0',
  },
  'softprops/action-gh-release': {
    sha: 'efb35369e0ad2afab669f228072c1b0d510eae64',
    version: 'v3.0.3',
    runtime: 'node24',
    source:
      'https://github.com/softprops/action-gh-release/releases/tag/v3.0.3',
  },
} satisfies Record<string, AuditedAction>;

const workflowDirectory = resolve(
  import.meta.dirname,
  '../../.github/workflows',
);
const workflowFiles = readdirSync(workflowDirectory)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort();

describe('GitHub Actions inventory', () => {
  it('pins every external action to an audited non-deprecated runtime', () => {
    const seen = new Set<string>();

    for (const file of workflowFiles) {
      const source = readFileSync(join(workflowDirectory, file), 'utf8');
      const actionLines = source
        .split('\n')
        .filter((line) => /^\s*(?:-\s*)?uses:\s+/.test(line));

      for (const line of actionLines) {
        const match = line.match(
          /^\s*(?:-\s*)?uses:\s+([^@\s]+)@([0-9a-f]{40})\s+#\s+(v\d+\.\d+\.\d+)\s*$/,
        );
        expect(
          match,
          `${file}: expected a full SHA and release comment: ${line.trim()}`,
        ).not.toBeNull();

        const [, name, sha, version] = match!;
        const audited = AUDITED_ACTIONS[name as keyof typeof AUDITED_ACTIONS];
        expect(
          audited,
          `${file}: ${name} is missing from AUDITED_ACTIONS`,
        ).toBeDefined();
        expect({ sha, version }, `${file}: ${name}`).toEqual({
          sha: audited.sha,
          version: audited.version,
        });
        expect(audited.runtime, `${name}: ${audited.source}`).not.toMatch(
          /^node(?:12|16|20)$/,
        );
        seen.add(name);
      }
    }

    expect([...seen].sort()).toEqual(Object.keys(AUDITED_ACTIONS).sort());
  });
});
