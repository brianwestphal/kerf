import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeUiProject,
  formatUiAnalysisSarif,
  formatUiAnalysisText,
} from '../../analyzer/index.mjs';

async function fixture({ suppressSpacing = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-'));
  await mkdir(join(root, 'src'));
  await writeFile(
    join(root, '.kerf-ui-profile.json'),
    JSON.stringify({
      schemaVersion: 1,
      scope: 'workspace',
      exceptions: suppressSpacing
        ? [
            {
              id: 'legacy-spacing',
              rules: ['KUI-L006'],
              target: 'src/app.css',
              rationale: 'Legacy spacing is isolated until the next redesign.',
            },
          ]
        : [],
    }),
  );
  await writeFile(
    join(root, 'src/app.css'),
    `.kui-toolbar__private { color: red; }
.app { --kui-does-not-exist: red; padding: 7px; }
.kui-state-banner { width: 320px; }
.scroll-a, .scroll-b { overflow: auto; }
.inset-a, .inset-b { padding: 8px; }
`,
  );
  await writeFile(
    join(root, 'src/app.tsx'),
    `import './app.css';
import { StateBanner } from '@kerfjs/ui/state-banner';
export const App = ({ dynamic }: { dynamic: string }) => (
  <div class="scroll-a inset-a">
    <div class="scroll-b inset-b">
      <StateBanner className="kui-state-banner kui-value-table" title="Ready" />
      <div className={dynamic} />
    </div>
  </div>
);
`,
  );
  return root;
}

describe('Kerf UI static analyzer', () => {
  const packageProfile = resolve(
    import.meta.dirname,
    '../../ai/application-ui-profile.defaults.json',
  );

  it('separates definite failures from review findings with ownership evidence', async () => {
    const report = await analyzeUiProject({
      root: await fixture(),
      profile: packageProfile,
    });
    const codes = report.diagnostics.map(({ ruleId }) => ruleId);

    expect(codes).toEqual(
      expect.arrayContaining([
        'KUI-L001',
        'KUI-L002',
        'KUI-L003',
        'KUI-L004',
        'KUI-L005',
        'KUI-L006',
        'KUI-L007',
        'KUI-L008',
      ]),
    );
    expect(report.summary.errors).toBeGreaterThanOrEqual(4);
    expect(report.summary.review).toBeGreaterThanOrEqual(4);
    expect(report.root).toBe('.');
    expect(JSON.stringify(report)).not.toContain(tmpdir());
    expect(
      report.diagnostics.find(({ ruleId }) => ruleId === 'KUI-L003')?.chain,
    ).toEqual(
      expect.arrayContaining([
        '@kerfjs/ui:state-banner',
        '@kerfjs/ui:value-table',
      ]),
    );
  });

  it('applies only exact profile exceptions and stays deterministic', async () => {
    const root = await fixture({ suppressSpacing: true });
    const first = await analyzeUiProject({ root, profile: packageProfile });
    const second = await analyzeUiProject({ root, profile: packageProfile });

    expect(first).toEqual(second);
    expect(first.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ ruleId: 'KUI-L006' })]),
    );
    expect(first.summary.suppressed).toBe(1);
  });

  it('emits portable text and SARIF contracts', async () => {
    const report = await analyzeUiProject({
      root: await fixture(),
      profile: packageProfile,
    });
    const text = formatUiAnalysisText(report);
    const sarif = formatUiAnalysisSarif(report);

    expect(text).toContain('KUI-L001');
    expect(text).toContain('Kerf UI analysis:');
    expect(sarif).toMatchObject({
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: '@kerfjs/ui analyzer' } },
          results: expect.arrayContaining([
            expect.objectContaining({ ruleId: 'KUI-L001', level: 'error' }),
          ]),
        },
      ],
    });
  });

  it('reports CSS parser edges without throwing and does not invent TSX failures', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-edge-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/broken.css'), '.broken { padding: ;');
    await writeFile(
      join(root, 'src/dynamic.tsx'),
      'export const Dynamic = ({ c }: { c: string }) => <div class={c} />;',
    );

    const report = await analyzeUiProject({ root });
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'KUI-L009', severity: 'error' }),
        expect.objectContaining({ ruleId: 'KUI-L008', severity: 'review' }),
      ]),
    );
    expect(
      report.diagnostics.filter(({ ruleId }) => ruleId === 'KUI-L001'),
    ).toHaveLength(0);
  });

  it('keeps the known-good monorepo fixture within a zero-false-positive budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-clean-'));
    await mkdir(join(root, 'packages/app/src'), { recursive: true });
    await writeFile(
      join(root, 'packages/app/src/app.css'),
      '.app-shell { padding: var(--kui-layout-item-padding); }',
    );
    await writeFile(
      join(root, 'packages/app/src/app.tsx'),
      `import { StateBanner } from '@kerfjs/ui/state-banner';
export const App = () => <StateBanner title="Ready" />;`,
    );

    const report = await analyzeUiProject({ root });
    expect(report.summary).toMatchObject({ errors: 0, review: 0 });
    expect(report.files).toEqual([
      'packages/app/src/app.css',
      'packages/app/src/app.tsx',
    ]);
  });

  it('excludes nested Claude worktrees from recursive source discovery', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-worktrees-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'tools/.claude/worktrees/generated/src'), {
      recursive: true,
    });
    await mkdir(join(root, 'tools/worktrees'), { recursive: true });
    await writeFile(
      join(root, 'src/app.css'),
      '.app { padding: var(--kui-layout-item-padding); }',
    );
    await writeFile(
      join(root, 'tools/.claude/worktrees/generated/src/copied.css'),
      '.copied { color: var(--kui-not-public); padding: 7px; }',
    );
    await writeFile(
      join(root, 'tools/worktrees/kept.css'),
      '.kept { padding: var(--kui-layout-item-padding); }',
    );

    const report = await analyzeUiProject({ root });

    expect(report.files).toEqual(['src/app.css', 'tools/worktrees/kept.css']);
    expect(report.diagnostics).toEqual([]);
    const explicitlyTargeted = await analyzeUiProject({
      root,
      paths: ['tools/.claude/worktrees/generated/src/copied.css'],
    });
    expect(explicitlyTargeted.files).toEqual([]);
    expect(explicitlyTargeted.diagnostics).toEqual([]);
  });

  it('accepts an individual source path and enforces the five-step spacing scale', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-file-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/app.css'), '.app { gap: 12px; }');

    const report = await analyzeUiProject({
      root,
      paths: ['src/app.css'],
      profile: packageProfile,
    });

    expect(report.files).toEqual(['src/app.css']);
    expect(report.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: 'KUI-L006',
        evidence: expect.objectContaining({ pixels: 12 }),
      }),
    ]);
  });

  it('surfaces invalid profile configuration as a failing portable diagnostic', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-profile-'));
    const profile = join(root, 'invalid-profile.json');
    await writeFile(profile, '{');

    const report = await analyzeUiProject({ root, profile });

    expect(report.summary.errors).toBe(1);
    expect(report.profile.diagnostics).toEqual([
      expect.objectContaining({
        code: 'KUI-P019',
        source: 'invalid-profile.json',
      }),
    ]);
    expect(formatUiAnalysisText(report)).toContain('error KUI-P019');
    const sarif = formatUiAnalysisSarif(report) as {
      runs: Array<{ results: unknown[] }>;
    };
    expect(sarif.runs[0].results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'KUI-P019', level: 'error' }),
      ]),
    );
  });

  it('isolates imported styles and directory policy across monorepo siblings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-scopes-'));
    await mkdir(join(root, 'packages/a/src'), { recursive: true });
    await mkdir(join(root, 'packages/b/src'), { recursive: true });
    await mkdir(join(root, 'shared'));
    await writeFile(
      join(root, 'packages/a/.kerf-ui-profile.json'),
      JSON.stringify({
        schemaVersion: 1,
        scope: 'directory',
        exceptions: [
          {
            id: 'package-a-spacing',
            rules: ['KUI-L006'],
            target: 'shared/shared.css',
            rationale: 'Package A retains its measured legacy inset.',
          },
        ],
      }),
    );
    await writeFile(
      join(root, 'packages/a/src/app.css'),
      '.same-name { overflow: auto; }',
    );
    await writeFile(
      join(root, 'shared/shared.css'),
      '.shared-policy { padding: 7px; }',
    );
    await writeFile(
      join(root, 'packages/a/src/app.tsx'),
      "import './app.css'; import '../../../shared/shared.css'; export const A = () => <div class=\"same-name shared-policy\" />;",
    );
    await writeFile(
      join(root, 'packages/b/src/app.css'),
      '@import url(./child.css); .same-name { color: red; }',
    );
    await writeFile(
      join(root, 'packages/b/src/child.css'),
      '.child { overflow: auto; }',
    );
    await writeFile(
      join(root, 'packages/b/src/app.tsx'),
      'import \'./app.css\'; import \'../../../shared/shared.css\'; export const B = () => <div class="same-name shared-policy"><div class="child" /></div>;',
    );

    const packageA = await analyzeUiProject({
      root,
      paths: ['packages/a/src/app.tsx'],
    });
    expect(
      packageA.diagnostics.filter(({ ruleId }) => ruleId === 'KUI-L006'),
    ).toHaveLength(0);
    expect(packageA.summary.suppressed).toBe(1);

    const report = await analyzeUiProject({
      root,
      paths: ['packages/a/src/app.tsx', 'packages/b/src/app.tsx'],
    });

    expect(
      report.diagnostics.filter(({ ruleId }) => ruleId === 'KUI-L006'),
    ).toEqual([
      expect.objectContaining({
        location: expect.objectContaining({ file: 'shared/shared.css' }),
        evidence: expect.objectContaining({
          consumers: {
            active: ['packages/b/src'],
            suppressed: ['packages/a/src'],
          },
        }),
      }),
    ]);
    expect(
      report.diagnostics.filter(({ ruleId }) => ruleId === 'KUI-L007'),
    ).toHaveLength(0);
    expect(report.summary.suppressed).toBe(0);
    expect(report.files).toContain('packages/b/src/child.css');
    expect(report.profile.files).toContain('packages/a/.kerf-ui-profile.json');
  });
});
