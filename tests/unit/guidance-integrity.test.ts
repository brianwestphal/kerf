import { Buffer } from 'node:buffer';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  changedGuidancePaths,
  snapshotGuidance,
} from '../../scripts/lib/guidance-integrity.mjs';

describe('guidance integrity snapshots', () => {
  it('detects changed, created, and deleted files', () => {
    const before = new Map([
      ['changed.md', Buffer.from('before')],
      ['created.md', null],
      ['deleted.md', Buffer.from('present')],
      ['same.md', Buffer.from('same')],
    ]);
    const after = new Map([
      ['changed.md', Buffer.from('after')],
      ['created.md', Buffer.from('created')],
      ['deleted.md', null],
      ['same.md', Buffer.from('same')],
    ]);

    expect(changedGuidancePaths(before, after)).toEqual([
      'changed.md',
      'created.md',
      'deleted.md',
    ]);
  });

  it('snapshots file bytes and represents a missing file explicitly', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-guidance-unit-'));
    await writeFile(join(root, 'present.md'), 'contents');

    const snapshot = await snapshotGuidance(root, ['present.md', 'missing.md']);

    expect(snapshot.get('present.md')?.toString()).toBe('contents');
    expect(snapshot.get('missing.md')).toBeNull();
  });
});
