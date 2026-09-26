import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { evaluateUi } from '../../evaluator/index.mjs';

const fixtures = resolve('tests/fixtures/ui-evaluator');
const packageProfile = resolve('ai/application-ui-profile.defaults.json');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'kerf-ui-evaluator-'));
let server: Server;
let origin: string;

beforeAll(async () => {
  const good = await readFile(join(fixtures, 'good/index.html'));
  const bad = await readFile(join(fixtures, 'bad/index.html'));
  const geometry = await readFile(join(fixtures, 'geometry/index.html'));
  server = createServer((request, response) => {
    if (request.url === '/hang') {
      setTimeout(() => response.end(good), 500);
      return;
    }
    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(
      request.url === '/bad'
        ? bad
        : request.url === '/geometry'
          ? geometry
          : good,
    );
  });
  await new Promise<void>((resolveListening) =>
    server.listen(0, '127.0.0.1', resolveListening),
  );
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port.');
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolveClosed, reject) =>
    server.close((error) => (error ? reject(error) : resolveClosed())),
  );
  await rm(temporaryRoot, { recursive: true, force: true });
});

const oneContext = [
  {
    id: 'narrow-light',
    width: 390,
    height: 844,
    zoom: 1,
    colorScheme: 'light' as const,
    reducedMotion: 'no-preference' as const,
  },
];

describe('browser evaluator against running downstream fixtures', () => {
  it('passes the known-good app in every engine/context and removes passing screenshots', async () => {
    const outputDirectory = join(temporaryRoot, 'good');
    const report = await evaluateUi({
      url: `${origin}/good`,
      workspaceRoot: resolve('.'),
      startDirectory: resolve('.'),
      packageProfile,
      browsers: ['chromium', 'firefox', 'webkit'],
      outputDirectory,
      recordedAt: '2026-09-21T00:00:00.000Z',
      retention: 'on-failure',
    });
    expect(report.summary, JSON.stringify(report.diagnostics, null, 2)).toEqual(
      { errors: 0, warnings: 0, passed: true },
    );
    expect(report.contexts).toHaveLength(18);
    for (const browser of ['chromium', 'firefox', 'webkit'])
      expect(
        report.contexts.filter((context) => context.browser === browser),
      ).toHaveLength(6);
    expect(report.artifacts.files).toEqual([]);
    expect(
      JSON.parse(await readFile(join(outputDirectory, 'report.json'), 'utf8')),
    ).toEqual(report);
  }, 60_000);

  for (const browser of ['chromium', 'firefox', 'webkit'] as const) {
    it(`reports the deterministic failure set in ${browser}`, async () => {
      const outputDirectory = join(temporaryRoot, browser);
      const report = await evaluateUi({
        url: `${origin}/bad`,
        workspaceRoot: resolve('.'),
        startDirectory: resolve('.'),
        packageProfile,
        browsers: [browser],
        contexts: oneContext,
        outputDirectory,
        recordedAt: '2026-09-21T00:00:00.000Z',
        retention: 'always',
      });
      const codes = new Set(report.diagnostics.map(({ code }) => code));
      for (const code of [
        'KUI-B010',
        'KUI-B011',
        'KUI-B012',
        'KUI-B020',
        'KUI-B021',
        'KUI-B022',
        'KUI-B023',
        'KUI-B030',
        'KUI-B040',
        'KUI-B050',
        'KUI-B060',
        'KUI-B070',
        'KUI-B080',
      ] as const)
        expect(codes.has(code), `${browser} missing ${code}`).toBe(true);
      expect(
        report.diagnostics.some(
          ({ code, selector }) =>
            code === 'KUI-B021' && selector === 'button.duplicate',
        ),
      ).toBe(true);
      const evidence = report.contexts[0].evidence as {
        focusSequence: Array<{ identity: string; selector: string }>;
      };
      expect(
        evidence.focusSequence.filter(
          ({ selector }) => selector === 'button.duplicate',
        ),
      ).toHaveLength(2);
      expect(report.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'KUI-B022', selector: '#switch' }),
          expect.objectContaining({
            code: 'KUI-B030',
            selector: '#aria-hidden-name',
          }),
          expect.objectContaining({
            code: 'KUI-B011',
            selector: 'button.offscreen',
          }),
          expect.objectContaining({
            code: 'KUI-B040',
            selector: 'button.alpha-contrast',
          }),
          // A ::before that ignores pointer events is decoration, not a hit
          // layer, so the fitted 36px box is still the whole target.
          expect.objectContaining({
            code: 'KUI-B050',
            selector: '#decorative-layer',
            evidence: expect.objectContaining({
              box: { width: 36, height: 36 },
            }),
          }),
        ]),
      );
      const decorative = report.diagnostics.find(
        ({ code, selector }) =>
          code === 'KUI-B050' && selector === '#decorative-layer',
      )?.evidence as { width: number; height: number };
      expect(decorative.width).toBeLessThan(38);
      expect(decorative.height).toBeLessThan(38);
      // Compact density lowers only the height floor (to the 36px row):
      // 44x36 still fails outside a compact row, and a compact target shorter
      // than the row still fails.
      const target = (selector: string) =>
        report.diagnostics.find(
          (item) => item.code === 'KUI-B050' && item.selector === selector,
        );
      expect(target('#standard-44x36')?.evidence).toMatchObject({
        required: { width: 44, height: 44 },
      });
      expect(target('#compact-44x30')?.evidence).toMatchObject({
        required: { width: 44, height: 36 },
      });
      expect(report.artifacts.files).toHaveLength(1);
      expect(report.artifacts.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
      await expect(
        stat(join(outputDirectory, report.artifacts.files[0].path)),
      ).resolves.toBeTruthy();
    }, 30_000);
  }

  it('removes stale evaluator screenshots for never and passing on-failure retention', async () => {
    for (const retention of ['never', 'on-failure'] as const) {
      const outputDirectory = join(temporaryRoot, `retention-${retention}`);
      await mkdir(outputDirectory, { recursive: true });
      const stale = join(outputDirectory, 'firefox-stale-context.png');
      await writeFile(stale, 'stale');
      const report = await evaluateUi({
        url: `${origin}/good`,
        workspaceRoot: resolve('.'),
        startDirectory: resolve('.'),
        packageProfile,
        browsers: ['chromium'],
        contexts: oneContext,
        outputDirectory,
        retention,
      });
      expect(report.summary.passed).toBe(true);
      await expect(stat(stale)).rejects.toMatchObject({ code: 'ENOENT' });
    }
  });

  it('applies only exact browser-rule exceptions for the evaluated directory', async () => {
    const workspaceRoot = join(temporaryRoot, 'exception-workspace');
    const startDirectory = join(workspaceRoot, 'app');
    await mkdir(startDirectory, { recursive: true });
    await writeFile(
      join(startDirectory, '.kerf-ui-profile.json'),
      JSON.stringify({
        schemaVersion: 1,
        scope: 'directory',
        exceptions: [
          {
            id: 'accepted-overflow',
            rules: ['KUI-B010'],
            target: 'app',
            rationale:
              'This fixture verifies exact runtime exception matching.',
          },
        ],
      }),
    );
    const report = await evaluateUi({
      url: `${origin}/bad`,
      workspaceRoot,
      startDirectory,
      packageProfile,
      browsers: ['chromium'],
      contexts: oneContext,
      outputDirectory: join(workspaceRoot, 'evidence'),
      retention: 'never',
    });
    expect(report.diagnostics.some(({ code }) => code === 'KUI-B010')).toBe(
      false,
    );
    expect(report.diagnostics.some(({ code }) => code === 'KUI-B011')).toBe(
      true,
    );
  });

  it('uses explicit catalog rootClass rather than publicClasses order for geometry', async () => {
    const workspaceRoot = join(temporaryRoot, 'geometry-workspace');
    await mkdir(workspaceRoot, { recursive: true });
    const catalog = JSON.parse(
      await readFile(
        resolve('docs/examples/component-catalog-extension-v2.json'),
        'utf8',
      ),
    );
    catalog.entries[0].boundaries = {
      rootClass: 'acme-inspector',
      publicClasses: ['decoy-root', 'acme-inspector'],
      publicTokens: [],
    };
    catalog.entries[0].layout.geometry.margin = 'none';
    await writeFile(
      join(workspaceRoot, 'catalog.json'),
      JSON.stringify(catalog),
    );
    const profilePath = join(workspaceRoot, 'profile.json');
    await writeFile(
      profilePath,
      JSON.stringify({
        schemaVersion: 1,
        scope: 'package',
        catalogs: [
          {
            package: '@acme/ui',
            composition: { path: 'catalog.json', schemaVersion: 2 },
          },
        ],
      }),
    );
    const report = await evaluateUi({
      url: `${origin}/geometry`,
      workspaceRoot,
      startDirectory: workspaceRoot,
      packageProfile: profilePath,
      browsers: ['chromium'],
      contexts: oneContext,
      outputDirectory: join(workspaceRoot, 'evidence'),
      retention: 'never',
    });
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'KUI-B080',
          selector: 'main.acme-inspector',
          evidence: expect.objectContaining({
            className: 'acme-inspector',
          }),
        }),
      ]),
    );
  });

  it('turns navigation timeouts into repair-oriented report diagnostics', async () => {
    const report = await evaluateUi({
      url: `${origin}/hang`,
      workspaceRoot: resolve('.'),
      startDirectory: resolve('.'),
      packageProfile,
      browsers: ['chromium'],
      contexts: oneContext,
      outputDirectory: join(temporaryRoot, 'timeout'),
      timeoutMs: 100,
      settleMs: 0,
      retention: 'never',
    });
    expect(report.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'KUI-B001', severity: 'error' }),
      ]),
    );
  });

  it('turns browser launch failures into one stable diagnostic per context', async () => {
    const report = await evaluateUi({
      url: origin,
      workspaceRoot: resolve('.'),
      startDirectory: resolve('.'),
      packageProfile,
      browsers: ['chromium'],
      contexts: oneContext,
      outputDirectory: join(temporaryRoot, 'launch-failure'),
      recordedAt: '2026-09-21T00:00:00.000Z',
      playwright: {
        chromium: {
          launch: async () => {
            throw new Error('fixture launch denied');
          },
        },
      },
    });
    expect(report.contexts).toHaveLength(1);
    expect(report.diagnostics).toEqual([
      expect.objectContaining({
        code: 'KUI-B001',
        context: 'chromium:narrow-light',
        message: expect.stringContaining('fixture launch denied'),
      }),
    ]);
  });

  it('cancels an in-flight browser launch without writing a partial report', async () => {
    const controller = new AbortController();
    let announceLaunch!: () => void;
    const launched = new Promise<void>((resolveLaunch) => {
      announceLaunch = resolveLaunch;
    });
    const outputDirectory = join(temporaryRoot, 'cancelled');
    const reportPath = join(outputDirectory, 'report.json');
    const evaluation = evaluateUi({
      url: origin,
      workspaceRoot: resolve('.'),
      startDirectory: resolve('.'),
      packageProfile,
      browsers: ['chromium'],
      contexts: oneContext,
      outputDirectory,
      reportPath,
      signal: controller.signal,
      playwright: {
        chromium: {
          launch: () => {
            announceLaunch();
            return new Promise(() => {});
          },
        },
      },
    });
    await launched;
    controller.abort();
    await expect(evaluation).rejects.toMatchObject({ name: 'AbortError' });
    await expect(stat(reportPath)).rejects.toThrow();
  });
});
