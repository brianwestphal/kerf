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
    `.kui-toolbar__private { color: var(--kui-does-not-exist); }
.kui-state-banner .kui-state-banner__private { color: red; }
wa-dialog::part(body) { color: red; }
.app { --kui-private-setting: red; padding: 7px; }
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
        'KUI-L010',
        'KUI-L011',
        'KUI-L012',
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

  it('supports staged adoption and cataloged shadow-part extension points', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-parts-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'component-catalog-v2.json'),
      JSON.stringify({
        schemaVersion: 2,
        package: '@acme/ui',
        entries: [
          {
            key: '@acme/ui:widget',
            package: '@acme/ui',
            id: 'widget',
            name: 'Widget',
            boundaries: {
              rootClass: 'acme-widget',
              publicClasses: ['acme-widget'],
              publicTokens: [],
              publicParts: ['label'],
            },
            cssValueProps: [
              {
                path: 'gap',
                grammar: 'length',
                helpers: ['rem'],
                shorthands: ['tight'],
                canonicalShorthands: ['tight'],
                exceptionalShorthands: [],
                rawPolicy: 'forbid',
                examples: ['gap="tight"'],
              },
            ],
          },
        ],
      }),
    );
    await writeFile(
      join(root, '.kerf-ui-profile.json'),
      JSON.stringify({
        schemaVersion: 1,
        scope: 'workspace',
        catalogs: [
          {
            package: '@acme/ui',
            composition: {
              path: './component-catalog-v2.json',
              schemaVersion: 2,
            },
          },
        ],
      }),
    );
    await writeFile(
      join(root, 'src/app.css'),
      '.acme-widget::part(label) { color: green; }\n.other-widget::part(label) { color: red; }\n.acme-widget::part(private) { color: red; }',
    );
    await writeFile(
      join(root, 'src/app.jsx'),
      `import { Widget } from '@acme/ui'; export const App = () => <Widget gap="13px" />;`,
    );

    const report = await analyzeUiProject({ root, adoption: true });

    expect(report.diagnostics).toEqual([
      expect.objectContaining({
        ruleId: 'KUI-L011',
        severity: 'review',
        evidence: expect.objectContaining({ part: 'label' }),
      }),
      expect.objectContaining({
        ruleId: 'KUI-L011',
        severity: 'review',
        evidence: expect.objectContaining({ part: 'private' }),
      }),
      expect.objectContaining({
        ruleId: 'KUI-L013',
        severity: 'error',
        evidence: expect.objectContaining({ component: '@acme/ui:widget' }),
      }),
    ]);
    expect(report.summary).toMatchObject({ errors: 1, review: 2 });
  });

  it('enforces cataloged CSS value grammars in JavaScript, TSX, and nested values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-values-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/values.js'),
      `import { List, flex, plus, rem, px } from '@kerfjs/ui';
List({ gap: '11px' });
List({ gap: flex(1) });
List({ gap: plus(rem(1), px(2)) });
List({ gap: 'xl' });
`,
    );
    await writeFile(
      join(root, 'src/values.tsx'),
      `import { ListItem, Select } from '@kerfjs/ui';
export const Values = () => <><ListItem style="color: red" /><Select choices={[{ label: 'A', value: 'a', color: '#fff' }]} /></>;
`,
    );
    await writeFile(
      join(root, 'src/dynamic.tsx'),
      `import { ListItem } from '@kerfjs/ui'; const declarations = getStyle(); export const Dynamic = () => <ListItem style={declarations} />;`,
    );

    const report = await analyzeUiProject({ root, profile: packageProfile });
    expect(report.diagnostics.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining([
        'KUI-L013',
        'KUI-L014',
        'KUI-L015',
        'KUI-L016',
        'KUI-L017',
      ]),
    );
    expect(
      report.diagnostics.find(({ ruleId }) => ruleId === 'KUI-L014')?.message,
    ).toContain('`rem()`');
    expect(report.files).toEqual([
      'src/dynamic.tsx',
      'src/values.js',
      'src/values.tsx',
    ]);
    expect(
      report.diagnostics.filter(({ ruleId }) => ruleId === 'KUI-L016'),
    ).toHaveLength(2);
  });

  it('resolves same-named catalog entries to the importable Kerf component', async () => {
    // The composition catalog names both the Kerf Select and the Web Awesome
    // wa-select "Select" (likewise Skeleton / wa-skeleton, Badge / wa-badge).
    // Only the Kerf entries carry CSS-value contracts, so a name-keyed lookup
    // that let the Web Awesome entry win silently skipped them.
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-collide-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/barrel.tsx'),
      `import { Select, colorVar } from '@kerfjs/ui';
export const A = () => <Select choices={[{ label: 'A', value: 'a', color: colorVar('--app-color') }]} />;
`,
    );
    await writeFile(
      join(root, 'src/subpath.tsx'),
      `import { Select } from '@kerfjs/ui/select';
import { Skeleton } from '@kerfjs/ui/skeleton';
export const B = () => <><Select choices={[{ label: 'B', value: 'b', color: '#fff' }]} /><Skeleton width="13px" /></>;
`,
    );
    await writeFile(
      join(root, 'src/namespace.ts'),
      `import * as ui from '@kerfjs/ui';
ui.Select({ choices: [{ label: 'C', value: 'c', color: ui.colorVar('--app-color') }] });
`,
    );

    const report = await analyzeUiProject({ root, profile: packageProfile });
    const found = report.diagnostics.map(({ ruleId, location, evidence }) => ({
      ruleId,
      file: location.file,
      component: (evidence as { component?: string } | undefined)?.component,
    }));
    expect(found).toEqual(
      expect.arrayContaining([
        {
          ruleId: 'KUI-L014',
          file: 'src/barrel.tsx',
          component: '@kerfjs/ui:select',
        },
        {
          ruleId: 'KUI-L013',
          file: 'src/subpath.tsx',
          component: '@kerfjs/ui:select',
        },
        {
          ruleId: 'KUI-L013',
          file: 'src/subpath.tsx',
          component: '@kerfjs/ui:skeleton',
        },
        {
          ruleId: 'KUI-L014',
          file: 'src/namespace.ts',
          component: '@kerfjs/ui:select',
        },
      ]),
    );
    expect(
      report.diagnostics.find(
        ({ ruleId, location }) =>
          ruleId === 'KUI-L014' && location.file === 'src/barrel.tsx',
      )?.message,
    ).toBe(
      '`colorVar()` has the wrong grammar for `Select.choices[].color`; use `uiColor()` or `foregroundColorVar()`.',
    );
  });

  it('never treats a helper export as the component its entry describes', async () => {
    // The selection catalog lists helpers beside the render function
    // (`Select` ships `uiColor`/`colorVar`, `List` ships `flex`/`rem`). A
    // helper called with an object whose keys match a contract path is not
    // that component and must not inherit its CSS-value contracts.
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-helpers-'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/helpers.ts'),
      `import * as ui from '@kerfjs/ui';
import { List, Select, flex, uiColor } from '@kerfjs/ui';
uiColor({ choices: [{ label: 'A', value: 'a', color: '#fff' }] });
ui.colorVar({ choices: [{ label: 'B', value: 'b', color: 'red' }] });
flex({ gap: '12px', flex: 'grow' });
Select({ choices: [{ label: 'C', value: 'c', color: '#000' }] });
List({ gap: '13px' });
`,
    );

    const report = await analyzeUiProject({ root, profile: packageProfile });
    const found = report.diagnostics
      .filter(({ ruleId }) => ['KUI-L013', 'KUI-L014'].includes(ruleId))
      .map(({ ruleId, location, evidence }) => ({
        ruleId,
        line: location.line,
        component: (evidence as { component?: string } | undefined)?.component,
      }));
    expect(found).toEqual([
      { ruleId: 'KUI-L013', line: 6, component: '@kerfjs/ui:select' },
      { ruleId: 'KUI-L013', line: 7, component: '@kerfjs/ui:list' },
    ]);
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

describe('KUI-L018 loud fill / on-loud pairing', () => {
  const tones = ['neutral', 'brand', 'success', 'warning', 'danger', 'pop'];

  async function analyzeCss(css: string) {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-loud-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/theme.css'), css);
    const report = await analyzeUiProject({ root, paths: ['src/theme.css'] });
    return report.diagnostics
      .filter(({ ruleId }) => ruleId === 'KUI-L018')
      .map((item) => ({
        ...item,
        evidence: item.evidence as {
          tone: string;
          pairProperty: string;
          selectors: string[];
        },
      }));
  }

  it.each(tones)('accepts a paired %s override in one rule', async (tone) => {
    expect(
      await analyzeCss(
        `:root { --wa-color-${tone}-fill-loud: #123456; --wa-color-${tone}-on-loud: #fff; }`,
      ),
    ).toEqual([]);
  });

  it.each(tones)(
    'flags a %s fill override without its on-loud',
    async (tone) => {
      const findings = await analyzeCss(
        `.app {\n  --wa-color-${tone}-fill-loud: #123456;\n}`,
      );
      expect(findings).toEqual([
        expect.objectContaining({
          ruleId: 'KUI-L018',
          severity: 'review',
          location: expect.objectContaining({ line: 2 }),
          evidence: expect.objectContaining({
            tone,
            pairProperty: `--wa-color-${tone}-on-loud`,
            selectors: ['.app'],
          }),
        }),
      ]);
    },
  );

  it("does not let a different tone's on-loud satisfy the pair", async () => {
    const findings = await analyzeCss(
      `:root { --wa-color-brand-fill-loud: #7540a8; --wa-color-success-on-loud: #fff; }`,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence).toMatchObject({ tone: 'brand' });
  });

  it('pairs across separate rules with the same selector and at-rule scope', async () => {
    expect(
      await analyzeCss(`
:root { --wa-color-brand-fill-loud: #7540a8; }
.billing { --wa-color-danger-fill-loud: #b00020; }
:root { --wa-color-brand-on-loud: #fff; }
.billing { --wa-color-danger-on-loud: #fff; }
@media (prefers-color-scheme: dark) {
  :root { --wa-color-brand-fill-loud: #c9a3f0; }
  :root { --wa-color-brand-on-loud: #1a1a1a; }
}
`),
    ).toEqual([]);
    const other = await analyzeCss(`
:root { --wa-color-brand-on-loud: #fff; }
@media (prefers-color-scheme: dark) {
  :root { --wa-color-brand-fill-loud: #c9a3f0; }
}
.other { --wa-color-brand-on-loud: #fff; }
.billing { --wa-color-brand-fill-loud: #7540a8; }
`);
    expect(other.map(({ evidence }) => evidence.selectors)).toEqual([
      ['@media (prefers-color-scheme: dark) :root'],
      ['.billing'],
    ]);
  });

  it('checks each selector of a selector list independently', async () => {
    expect(
      await analyzeCss(`
:root, .theme-a { --wa-color-pop-fill-loud: #0af; }
.theme-a,
:root { --wa-color-pop-on-loud: #000; }
`),
    ).toEqual([]);
    const findings = await analyzeCss(`
:root, .theme-a, .theme-b { --wa-color-pop-fill-loud: #0af; }
:root { --wa-color-pop-on-loud: #000; }
`);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.selectors).toEqual(['.theme-a', '.theme-b']);
  });

  it('resolves nested rules and nested at-rules to their full scope', async () => {
    expect(
      await analyzeCss(`
.shell {
  .panel { --wa-color-warning-fill-loud: #f5a524; }
  &.dense { --wa-color-warning-fill-loud: #d08700; --wa-color-warning-on-loud: #000; }
  @media (prefers-color-scheme: dark) { --wa-color-danger-fill-loud: #ff6b6b; }
}
.shell .panel { --wa-color-warning-on-loud: #000; }
@media (prefers-color-scheme: dark) { .shell { --wa-color-danger-on-loud: #000; } }
`),
    ).toEqual([]);
    const findings = await analyzeCss(`
.shell {
  --wa-color-neutral-on-loud: #fff;
  .panel { --wa-color-neutral-fill-loud: #333; }
}
`);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.selectors).toEqual(['.shell .panel']);
  });

  it('ignores comments, whitespace, and unrelated tokens', async () => {
    expect(
      await analyzeCss(`
/* brand identity */
:root   /* scope */ ,
  .a  >  .b {
  /* --wa-color-brand-fill-loud: #000; */
  --wa-color-brand-fill-loud :   #7540a8 ;
  --wa-color-brand-fill-quiet: #eee;
  --wa-color-brand-on-quiet: #333;
}
.a > .b ,:root{--wa-color-brand-on-loud:#fff}
`),
    ).toEqual([]);
    expect(
      await analyzeCss(
        ':root { --wa-color-brand-fill-quiet: #eee; --wa-color-brand-fill-normal: #ccc; }',
      ),
    ).toEqual([]);
  });
});
