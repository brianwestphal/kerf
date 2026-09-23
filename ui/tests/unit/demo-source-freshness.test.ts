import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { computeDemoSourceFreshness } from '../../scripts/lib/demo-source-freshness.mjs';

describe('demo source freshness', () => {
  it('changes when a focused demo route changes without a manual build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-freshness-'));
    await mkdir(join(root, 'src'));
    await mkdir(join(root, 'ux-demo', 'demos'), { recursive: true });
    await writeFile(join(root, 'src', 'row.tsx'), 'export const Row = 1;\n');
    const demo = join(root, 'ux-demo', 'demos', 'row.tsx');
    await writeFile(demo, 'export const route = "before";\n');
    const before = await computeDemoSourceFreshness(root);

    await writeFile(demo, 'export const route = "after";\n');
    const after = await computeDemoSourceFreshness(root);

    expect(after.sha256).not.toBe(before.sha256);
    expect(after.files).toContain('ux-demo/demos/row.tsx');
  });
});
