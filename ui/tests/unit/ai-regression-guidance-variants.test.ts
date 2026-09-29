import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCannedRepairLoopFixture } from '../../ai-regressions/fixtures/v3-canned-repair-loop.mjs';
import {
  AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
  AI_REGRESSION_V2_CONTEXT_SNAPSHOTS,
  buildAiRegressionContext,
} from '../../scripts/lib/ai-regression-context.mjs';
import {
  collectAiRegressionContextReferences,
  loadAiRegressionGuidanceVariantsV3,
  resolveAiRegressionVariantGuidanceV3,
  selectAiRegressionReferencePages,
} from '../../scripts/lib/ai-regression-guidance-variants-v3.mjs';
import {
  calculateAiRegressionRunV3Metrics,
  loadAiRegressionV3Context,
  validateAiRegressionMeasuredCohortV3,
  validateAiRegressionRunV3,
} from '../../scripts/lib/ai-regression-run-v3.mjs';

const root = resolve(import.meta.dirname, '../..');
const VARIANT = 'markdown-reference-guidance-only';
const readJson = async (path: string) =>
  JSON.parse(await readFile(resolve(root, path), 'utf8'));
describe(
  'suite-v3 markdown component reference guidance variant',
  {
    timeout: 60_000,
  },
  () => {
    it('selects pages from each case’s own application references, never from the scoring oracle', async () => {
      const [conditions, variants, corpus] = await Promise.all([
        readJson('ai-regressions/conditions-v3.json'),
        loadAiRegressionGuidanceVariantsV3(root),
        readJson('ai-regressions/corpus-v3.json'),
      ]);
      const variant = variants.find(({ id }) => id === VARIANT)!;
      const pages = async (caseId: string) =>
        (
          await resolveAiRegressionVariantGuidanceV3(
            root,
            conditions,
            variant,
            corpus.cases.find(({ id }: { id: string }) => id === caseId),
          )
        ).sourcePaths.filter((path) => path.startsWith('ai/components/'));
      const navigation = await resolveAiRegressionVariantGuidanceV3(
        root,
        conditions,
        variant,
        corpus.cases[0],
      );
      expect(navigation.sourcePaths).not.toContain('ai/component-catalog.json');
      expect(navigation.sourcePaths).toContain('ai/components/README.md');
      expect(
        navigation.sourcePaths.filter(
          (path) => !path.startsWith('ai/components/'),
        ),
      ).toEqual(
        conditions.guidance.sourcePaths.filter(
          (path: string) => path !== 'ai/component-catalog.json',
        ),
      );
      const list = await pages('add-list-selection-actions');
      const form = await pages('add-form-draft-status');
      expect(list).toEqual([
        'ai/components/README.md',
        'ai/components/layout.md',
        'ai/components/pane.md',
        'ai/components/toolbar.md',
        'ai/components/toolbar-control-group.md',
        'ai/components/toolbar-text.md',
        'ai/components/row.md',
        'ai/components/list-item.md',
        'ai/components/state-banner.md',
        'ai/components/empty-state.md',
        'ai/components/loading-spinner.md',
      ]);
      // Web Awesome registrations and tags select wa-* pages; the shared theme
      // CSS import does not select PopupMenu.
      expect(form).toEqual(
        expect.arrayContaining([
          'ai/components/select.md',
          'ai/components/spacer.md',
          'ai/components/wa-button.md',
          'ai/components/wa-input.md',
          'ai/components/wa-textarea.md',
        ]),
      );
      expect(form).not.toContain('ai/components/popup-menu.md');
    });

    it('parses import, named-import, alias, and Web Awesome references', () => {
      const references = collectAiRegressionContextReferences([
        "import '@kerfjs/ui/layout.css';\n" +
          "import { Row as R, type RowProps } from '@kerfjs/ui/row';\n" +
          "import { signal } from 'kerfjs';\n" +
          "import '@awesome.me/webawesome/dist/components/switch/switch.js';\n" +
          'const view = <wa-tag>New</wa-tag>;',
      ]);
      expect([...references.names]).toEqual(['Row', 'RowProps']);
      expect(references.names.has('signal')).toBe(false);
      expect([...references.tags].sort()).toEqual(['wa-switch', 'wa-tag']);
      const pages = selectAiRegressionReferencePages(
        {
          entries: [
            {
              id: 'layout',
              kind: 'composition',
              delivery: { manualCssImport: '@kerfjs/ui/layout.css' },
            },
            {
              id: 'row',
              kind: 'component',
              publicExports: ['Row'],
              delivery: {},
            },
            {
              id: 'grid',
              kind: 'component',
              publicExports: ['Grid'],
              delivery: {},
            },
            { id: 'wa-tag', kind: 'element', delivery: {} },
            { id: 'recipe-app-shell', kind: 'recipe', publicExports: ['Row'] },
            {
              id: 'workbench',
              kind: 'component',
              publicExports: [],
              delivery: {},
              wiring: [
                {
                  export: 'wireWorkbench',
                  import: '@kerfjs/ui/wire-workbench',
                },
              ],
            },
          ],
        },
        references,
      );
      expect(pages).toEqual(['layout', 'row', 'wa-tag']);
    });

    it('keeps variants out of the v3 policy file and every frozen context unchanged', async () => {
      // The default all-policies prepare output is pinned by
      // tests/integration/ai-regressions-v3.test.ts; variants stay opt-in.
      const variants = await loadAiRegressionGuidanceVariantsV3(root);
      const conditionsFile = await readJson(
        'ai-regressions/conditions-v3.json',
      );
      expect(
        conditionsFile.conditions.map(({ id }: { id: string }) => id),
      ).toEqual([
        'guidance-only',
        'guidance-static',
        'guidance-static-browser',
      ]);
      expect(variants.map(({ id }) => id)).toEqual([VARIANT]);
      const [conditionsV3, compatibility] = await Promise.all([
        readJson('ai-regressions/conditions-v3.json'),
        readJson('ai-regressions/compatibility-v3.json'),
      ]);
      expect(conditionsV3.guidance.sourcePaths).toContain(
        'ai/component-catalog.json',
      );
      expect(
        (await buildAiRegressionContext(root, conditionsV3.guidance)).sha256,
      ).toBe(compatibility.artifactDigests.guidanceContext);
      for (const [snapshots, expected] of [
        [
          AI_REGRESSION_V1_CONTEXT_SNAPSHOTS,
          'f3cd2e13c1fb516a1f69f108825b487ac9ad65e64ac67ef31200c3278e783816',
        ],
        [
          AI_REGRESSION_V2_CONTEXT_SNAPSHOTS,
          'b3c7e4cf215ac83afc9f014df81f0547cc629b504657da9bc19eeed34061eb98',
        ],
      ] as const) {
        const snapshot = await readJson(
          snapshots.get('revised-recipes-catalog')!,
        );
        expect(snapshot.sha256).toBe(expected);
        expect(createHash('sha256').update(snapshot.text).digest('hex')).toBe(
          expected,
        );
      }
    });

    it('inherits guidance-only feedback rules and pairs attempt-one inputs only within the variant', async () => {
      const context = await loadAiRegressionV3Context(root);
      const fixture = createCannedRepairLoopFixture();
      const [guidanceOnly, repaired] = fixture.run.results;
      const variantCell = {
        ...JSON.parse(JSON.stringify(guidanceOnly)),
        condition: VARIANT,
        sessionId: 'variant-session',
        initialModelInputSha256: 'e'.repeat(64),
      };
      variantCell.attempts[0].sessionId = 'variant-session';
      fixture.run.results.push(variantCell);
      fixture.run.summary = calculateAiRegressionRunV3Metrics(
        fixture.run.results,
      );
      expect(
        validateAiRegressionRunV3(
          fixture.run,
          context.conditions,
          context.compatibility,
        ),
      ).toEqual([]);

      const repairedVariant = {
        ...JSON.parse(JSON.stringify(repaired)),
        condition: VARIANT,
        sessionId: 'variant-repair-session',
      };
      for (const attempt of repairedVariant.attempts)
        attempt.sessionId = 'variant-repair-session';
      fixture.run.results.push(repairedVariant);
      fixture.run.summary = calculateAiRegressionRunV3Metrics(
        fixture.run.results,
      );
      expect(
        validateAiRegressionRunV3(
          fixture.run,
          context.conditions,
          context.compatibility,
        ),
      ).toEqual(
        expect.arrayContaining([
          expect.stringContaining('cannot have repair attempts'),
          expect.stringContaining('exposes feedback outside its policy'),
          expect.stringContaining('attempt-1 model inputs differ by condition'),
        ]),
      );
    });

    it('keeps a variant optional in a measured cohort but requires its full matrix once measured', async () => {
      const context = await loadAiRegressionV3Context(root);
      const cells = (conditions: string[]) =>
        context.corpus.cases.flatMap(({ id }: { id: string }) =>
          conditions.flatMap((condition) =>
            [1, 2, 3].map((replicate) => ({
              caseId: id,
              condition,
              replicate,
            })),
          ),
        );
      const policies = context.conditions.conditions.map(
        ({ id }: { id: string }) => id,
      );
      const makeRun = (modelVersion: string, conditions: string[]) => ({
        executor: { provider: 'fixture', model: 'model', modelVersion },
        results: cells(conditions),
      });
      const validate = (runs: unknown[]) =>
        validateAiRegressionMeasuredCohortV3(
          runs,
          context.corpus,
          context.conditions,
        );
      expect(
        validate([makeRun('one', policies), makeRun('two', policies)]),
      ).toEqual([]);
      const withVariant = [
        makeRun('one', [...policies, VARIANT]),
        makeRun('two', [...policies, VARIANT]),
      ];
      expect(validate(withVariant)).toEqual([]);
      withVariant[1].results.pop();
      expect(validate(withVariant)).toEqual([
        expect.stringContaining(
          `${VARIANT} requires balanced replicates 1,2,3`,
        ),
      ]);
      const unknown = [makeRun('one', policies), makeRun('two', policies)];
      unknown[0].results.push({
        caseId: 'extend-application-navigation',
        condition: 'not-a-variant',
        replicate: 1,
      });
      expect(validate(unknown)).toEqual([
        expect.stringContaining('outside the frozen corpus matrix'),
      ]);
    });
  },
);
