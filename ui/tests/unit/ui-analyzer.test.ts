import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  analyzeUiProject,
  formatUiAnalysisSarif,
  formatUiAnalysisText,
} from '../../analyzer/index.mjs';
import {
  contrastRatio,
  DEFAULT_ON_LOUD,
  literalSchemeColors,
  loudPairContrast,
} from '../../analyzer/loud-pairs.mjs';

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
  });

  it('reaches a fill from an unconditional scope, never from a narrower at-rule', async () => {
    // An unconditional on-loud applies inside @media, so the pair is measured.
    expect(
      await analyzeCss(`
.billing { --wa-color-warning-on-loud: #000; }
@media (prefers-color-scheme: dark) {
  .billing { --wa-color-warning-fill-loud: #f5a524; }
}
`),
    ).toEqual([]);
    // An on-loud under @media cannot be proven to apply to an unconditional fill.
    // (pop has no literal theme default, so an unpaired fill stays a finding.)
    const findings = await analyzeCss(`
@media (prefers-color-scheme: dark) {
  .billing { --wa-color-pop-on-loud: #000; }
}
.billing { --wa-color-pop-fill-loud: #0af; }
@supports (color: red) {
  .billing { --wa-color-pop-fill-loud: #0af; }
}
`);
    expect(findings.map(({ evidence }) => evidence.selectors)).toEqual([
      ['.billing'],
      ['@supports (color: red) .billing'],
    ]);
  });

  it('checks each selector of a selector list independently', async () => {
    expect(
      await analyzeCss(`
.theme-b, .theme-a { --wa-color-pop-fill-loud: #0af; }
.theme-a,
.theme-b { --wa-color-pop-on-loud: #000; }
`),
    ).toEqual([]);
    const findings = await analyzeCss(`
.theme-a, .theme-b, .theme-c { --wa-color-pop-fill-loud: #0af; }
.theme-a { --wa-color-pop-on-loud: #000; }
`);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.selectors).toEqual(['.theme-b', '.theme-c']);
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
    // A sibling scope is not an ancestor.
    const findings = await analyzeCss(`
.shell {
  .toolbar { --wa-color-neutral-on-loud: #fff; }
  .panel { --wa-color-neutral-fill-loud: #333; }
}
`);
    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.selectors).toEqual(['.shell .panel']);
  });

  it('accepts an on-loud set in an ancestor theme scope', async () => {
    expect(
      await analyzeCss(`
:root { --wa-color-neutral-on-loud: #fff; }
.app .panel { --wa-color-neutral-fill-loud: #333; }
.shell {
  --wa-color-pop-on-loud: #000;
  .panel { --wa-color-pop-fill-loud: #0af; }
}
.frame > .tile { --wa-color-danger-fill-loud: #b00020; }
.frame { --wa-color-danger-on-loud: #fff; }
`),
    ).toEqual([]);
    // A selector that merely shares a prefix is not an ancestor.
    const findings = await analyzeCss(`
.shell { --wa-color-pop-on-loud: #000; }
.shell-alt .panel { --wa-color-pop-fill-loud: #0af; }
.shell.dense { --wa-color-pop-fill-loud: #0af; }
`);
    expect(findings.map(({ evidence }) => evidence.selectors)).toEqual([
      ['.shell-alt .panel'],
      ['.shell.dense'],
    ]);
  });

  it('measures the nearest governing on-loud: same scope before an ancestor', async () => {
    // The same-scope #000 governs, not the failing ancestor #fff.
    expect(
      await analyzeCss(`
:root { --wa-color-pop-on-loud: #fff; }
.panel { --wa-color-pop-fill-loud: #0af; --wa-color-pop-on-loud: #000; }
`),
    ).toEqual([]);
    const findings = await analyzeCss(`
:root { --wa-color-pop-on-loud: #000; }
.panel { --wa-color-pop-on-loud: #fff; }
.panel .cell { --wa-color-pop-fill-loud: #0af; }
`);
    expect(findings).toEqual([
      expect.objectContaining({
        evidence: expect.objectContaining({ pairValue: '#fff' }),
      }),
    ]);
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

describe('KUI-L018 literal contrast', () => {
  async function analyze(files: Record<string, string>, paths?: string[]) {
    const root = await mkdtemp(join(tmpdir(), 'kerf-ui-analyzer-contrast-'));
    for (const [path, source] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), source);
    }
    const report = await analyzeUiProject({ root, paths });
    return report.diagnostics
      .filter(({ ruleId }) => ruleId === 'KUI-L018')
      .map((item) => ({
        file: item.location.file,
        line: item.location.line,
        message: item.message,
        evidence: item.evidence as Record<string, unknown>,
      }));
  }

  it('flags a literal pair that is present but below 4.5:1', async () => {
    const findings = await analyze({
      'src/theme.css':
        '.billing {\n  --wa-color-brand-fill-loud: #7fb3ff;\n  --wa-color-brand-on-loud: #fff;\n}\n',
    });
    expect(findings).toEqual([
      expect.objectContaining({
        line: 2,
        evidence: expect.objectContaining({
          tone: 'brand',
          pairValue: '#fff',
          pairLocation: expect.objectContaining({ line: 3 }),
          contrast: 2.14,
          scheme: 'light',
          selectors: ['.billing'],
        }),
      }),
    ]);
    expect(findings[0].message).toContain('2.14:1');
  });

  it('measures each color scheme of light-dark() pairs', async () => {
    expect(
      await analyze({
        'src/theme.css':
          ':root { --wa-color-danger-fill-loud: light-dark(#b00020, #ff8a8a); --wa-color-danger-on-loud: light-dark(#fff, #1a1a1a); }',
      }),
    ).toEqual([]);
    const findings = await analyze({
      'src/theme.css':
        ':root { --wa-color-danger-fill-loud: light-dark(#b00020, #ff8a8a); --wa-color-danger-on-loud: #fff; }',
    });
    expect(findings).toEqual([
      expect.objectContaining({
        evidence: expect.objectContaining({ scheme: 'dark' }),
      }),
    ]);
  });

  it('parses the literal color syntaxes it measures', async () => {
    for (const [fill, onLoud] of [
      ['#35c', 'white'],
      ['#3355ccff', 'rgb(255 255 255)'],
      ['rgb(51, 85, 204)', 'rgba(100%, 100%, 100%, 1)'],
      ['hsl(226deg 60% 50%)', 'hsla(0, 0%, 100%, 100%)'],
      ['#3355CC !important', '#FFF'],
    ])
      expect(
        await analyze({
          'src/theme.css': `.a { --wa-color-brand-fill-loud: ${fill}; --wa-color-brand-on-loud: ${onLoud}; }`,
        }),
        `${fill} on ${onLoud}`,
      ).toEqual([]);
    const failing = await analyze({
      'src/theme.css':
        '.a { --wa-color-brand-fill-loud: hsl(210 100% 75%); --wa-color-brand-on-loud: rgb(255 255 255 / 100%); }',
    });
    expect(failing).toHaveLength(1);
  });

  it('does not measure a pair it cannot prove, nor flag a present one', async () => {
    for (const [fill, onLoud] of [
      ['var(--brand)', '#fff'],
      ['#7fb3ff', 'var(--text)'],
      ['color-mix(in srgb, #7fb3ff 50%, white)', '#fff'],
      ['#7fb3ff80', '#fff'],
      ['rgb(127 179 255 / 0.5)', '#fff'],
      ['light-dark(#7fb3ff)', '#fff'],
      ['light-dark(#7fb3ff, var(--x))', '#fff'],
      ['currentColor', '#fff'],
      ['rgb(1 2)', '#fff'],
    ])
      expect(
        await analyze({
          'src/theme.css': `.a { --wa-color-brand-fill-loud: ${fill}; --wa-color-brand-on-loud: ${onLoud}; }`,
        }),
        `${fill} on ${onLoud}`,
      ).toEqual([]);
  });

  it("passes an unpaired fill that clears 4.5:1 against the theme's default on-loud", async () => {
    // success and warning default to #1d1d1f in both schemes.
    expect(
      await analyze({
        'src/theme.css':
          '.a { --wa-color-success-fill-loud: #30d158; --wa-color-warning-fill-loud: light-dark(#ffd60a, #ffcc00); }',
      }),
    ).toEqual([]);
    // brand and danger default to light-dark(#fff, #111113).
    expect(
      await analyze({
        'src/theme.css':
          '.a { --wa-color-brand-fill-loud: light-dark(#0060c0, #64d2ff); --wa-color-danger-fill-loud: light-dark(#c00010, #ff8080); }',
      }),
    ).toEqual([]);
  });

  it('keeps flagging an unpaired fill that fails, or that has no literal default', async () => {
    const findings = await analyze({
      'src/theme.css': [
        '.a { --wa-color-success-fill-loud: #0a5c2a; }',
        '.b { --wa-color-brand-fill-loud: #0060c0; }',
        '.c { --wa-color-neutral-fill-loud: #111; }',
        '.d { --wa-color-pop-fill-loud: #fff; }',
        '.e { --wa-color-warning-fill-loud: var(--app-yellow); }',
      ].join('\n'),
    });
    expect(
      findings.map(({ evidence }) => [
        evidence.tone,
        evidence.contrast,
        evidence.scheme,
      ]),
    ).toEqual([
      ['success', 2.06, 'light'],
      ['brand', 3.08, 'dark'],
      ['neutral', undefined, undefined],
      ['pop', undefined, undefined],
      ['warning', undefined, undefined],
    ]);
    expect(findings[0].message).toContain(
      "measures 2.06:1 against the theme's default --wa-color-success-on-loud",
    );
  });

  it('keeps the default on-loud table equal to the shipped Web Awesome theme', async () => {
    const theme = await readFile(
      resolve(import.meta.dirname, '../../src/webawesome.css'),
      'utf8',
    );
    const shipped = Object.fromEntries(
      [...theme.matchAll(/--wa-color-(\w+)-on-loud:\s*([^;]+);/g)]
        .filter(([, , value]) => !value.includes('var('))
        .map(([, tone, value]) => [tone, value.trim()]),
    );
    expect(shipped).toEqual(DEFAULT_ON_LOUD);
    expect(literalSchemeColors('light-dark(#fff, #111113)')).toEqual({
      light: [255, 255, 255],
      dark: [17, 17, 19],
    });
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21);
    expect(loudPairContrast('#fff', 'var(--x)')).toBeUndefined();
  });

  it('accepts an on-loud from another stylesheet the same entry imports', async () => {
    const files = {
      'src/main.ts':
        "import './theme.css';\nimport './billing.css';\nexport {};\n",
      'src/theme.css': ':root { --wa-color-brand-on-loud: #fff; }\n',
      'src/billing.css': '.billing { --wa-color-brand-fill-loud: #7540a8; }\n',
    };
    expect(await analyze(files)).toEqual([]);
    // The measured pair still has to clear AA.
    expect(
      await analyze({
        ...files,
        'src/billing.css':
          '.billing { --wa-color-brand-fill-loud: #7fb3ff; }\n',
      }),
    ).toEqual([
      expect.objectContaining({
        file: 'src/billing.css',
        evidence: expect.objectContaining({
          pairLocation: expect.objectContaining({
            file: expect.stringContaining('theme.css'),
          }),
        }),
      }),
    ]);
  });

  it('accepts an on-loud from a stylesheet reached through @import', async () => {
    expect(
      await analyze({
        'src/app.css': "@import './tokens.css';\n@import './billing.css';\n",
        'src/tokens.css': ':root { --wa-color-danger-on-loud: #fff; }\n',
        'src/billing.css':
          '.billing { --wa-color-danger-fill-loud: #b00020; }\n',
      }),
    ).toEqual([]);
  });

  it('does not borrow an on-loud from a stylesheet no entry loads with it', async () => {
    const findings = await analyze({
      'src/admin.ts': "import './admin-theme.css';\nexport {};\n",
      'src/main.ts': "import './billing.css';\nexport {};\n",
      'src/admin-theme.css': ':root { --wa-color-brand-on-loud: #fff; }\n',
      'src/billing.css': '.billing { --wa-color-brand-fill-loud: #7540a8; }\n',
      'src/orphan.css': '.orphan { --wa-color-pop-fill-loud: #0af; }\n',
      'src/unparseable.css': '.broken { --wa-color-pop-on-loud: #000;\n',
    });
    expect(findings.map(({ file }) => file)).toEqual([
      'src/billing.css',
      'src/orphan.css',
    ]);
  });
});
