// Keep the disposable Bun candidate's gates aligned with canonical npm CI.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { format, resolveConfig } from 'prettier';
import YAML from 'yaml';

const upload =
  'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a';

export function qualificationWorkflow(source) {
  const canonical = YAML.parse(source);
  const jobs = structuredClone(canonical.jobs);
  for (const [name, job] of Object.entries(jobs)) {
    const recordVariation =
      `bun pm ls --all > "$BUN_QUALIFICATION_EVIDENCE/${name}-final-packages.txt" && ` +
      `cp bun.lock "$BUN_QUALIFICATION_EVIDENCE/${name}-final.bun.lock" && ` +
      `cp package.json "$BUN_QUALIFICATION_EVIDENCE/${name}-final-package.json"`;
    if (job['runs-on'] === 'ubuntu-latest') job['runs-on'] = 'ubuntu-24.04';
    delete job.permissions;
    const defaults = job.defaults?.run?.['working-directory'] ?? '.';
    const setup = job.steps.findIndex((step) =>
      step.uses?.startsWith('actions/setup-node@'),
    );
    assert.ok(setup >= 0, `${name} must declare its Node runtime`);
    job.steps.splice(setup + 1, 0, {
      name: 'Install the exact candidate installer (not repository dependencies)',
      'working-directory': '.',
      run: 'npm install --global bun@1.4.4',
    });
    for (const step of job.steps) {
      if (typeof step.run !== 'string') continue;
      const cwd = step['working-directory'] ?? defaults;
      step.run = step.run.replaceAll(
        /\bnpm --prefix ([a-z0-9./-]+) ci\b/g,
        (_command, prefix) =>
          `node "$GITHUB_WORKSPACE/scripts/bun-candidate-install.mjs" ${cwd === '.' ? prefix : `${cwd}/${prefix}`}`,
      );
      step.run = step.run.replaceAll(
        /\bnpm ci\b/g,
        `node "$GITHUB_WORKSPACE/scripts/bun-candidate-install.mjs" ${cwd}`,
      );
      step.run = step.run.replaceAll(
        'npm install --no-save eslint@',
        'bun add --no-save eslint@',
      );
      if (step.run.startsWith('bun add --no-save eslint@'))
        step.run += ` && ${recordVariation}`;
      if (step.run === 'npm run test:webawesome-latest') {
        step.run =
          `bun add --no-save @awesome.me/webawesome@^3 && ${recordVariation} && ` +
          'node node_modules/vitest/vitest.mjs run tests/unit && KERF_WEBAWESOME_LATEST=1 node node_modules/playwright/cli.js test --project=chromium';
      }
      step.run = step.run.replaceAll(
        /\bnpx (?!--no-install\b)/g,
        'npx --no-install ',
      );
      if (
        step.run.includes('sudo sed -i') &&
        step.run.includes('/etc/apt/apt-mirrors.txt')
      ) {
        step.run = `if [[ -f /etc/apt/apt-mirrors.txt ]]; then ${step.run}; fi`;
      }
      if (step.run.includes('npm install')) {
        const tool = step.run === 'npm install --global bun@1.4.4';
        const consumer =
          name === 'node-floor' && step.run.includes('/pack/kerfjs-*.tgz');
        assert.ok(
          tool || consumer,
          `Unreviewed npm install remains in ${name}: ${step.run}`,
        );
      }
      assert.ok(
        !/\bnpm(?:\s+--prefix\s+\S+)?\s+ci\b/.test(step.run),
        `${name} retained npm repository installation`,
      );
    }
    job.steps.push({
      name: 'Retain exact candidate locks and input manifests',
      if: 'always()',
      uses: upload,
      with: {
        name: 'candidate-${{ github.job }}-${{ strategy.job-index }}-${{ github.sha }}',
        path: '${{ env.BUN_QUALIFICATION_EVIDENCE }}',
        'if-no-files-found': 'warn',
      },
    });
  }
  jobs['seventh-tree'] = {
    'runs-on': 'ubuntu-24.04',
    steps: [
      { uses: canonical.jobs.test.steps[0].uses },
      {
        uses: canonical.jobs.test.steps[1].uses,
        with: { 'node-version': '${{ env.NODE_VERSION }}' },
      },
      { run: 'npm install --global bun@1.4.4' },
      {
        run: 'node scripts/bun-candidate-install.mjs . && npm run build && node scripts/bun-candidate-install.mjs examples/reactivity-demo',
      },
      { run: 'npm run build', 'working-directory': 'examples/reactivity-demo' },
      {
        if: 'always()',
        uses: upload,
        with: {
          name: 'candidate-seventh-tree-${{ github.sha }}',
          path: '${{ env.BUN_QUALIFICATION_EVIDENCE }}',
        },
      },
    ],
  };
  jobs['release-artifacts'] = {
    'runs-on': 'ubuntu-24.04',
    steps: [
      { uses: canonical.jobs.test.steps[0].uses },
      {
        uses: canonical.jobs.test.steps[1].uses,
        with: { 'node-version': '${{ env.NODE_VERSION }}' },
      },
      { run: 'npm install --global bun@1.4.4' },
      {
        run: 'node scripts/bun-candidate-install.mjs . && npm run build && node scripts/bun-candidate-install.mjs ui && npm --prefix ui run build',
      },
      {
        run: 'node node_modules/vitest/vitest.mjs run tests/unit/release-package.test.ts tests/unit/release-common.test.ts tests/unit/release-changelog.test.ts tests/unit/release-beta-plan.test.ts tests/unit/release-order.test.ts tests/integration/release-beta-auto.test.ts',
      },
      { run: 'node scripts/bun-release-artifact-probe.mjs' },
      {
        if: 'always()',
        uses: upload,
        with: {
          name: 'candidate-release-artifacts-${{ github.sha }}',
          path: '${{ env.BUN_QUALIFICATION_EVIDENCE }}',
        },
      },
    ],
  };
  jobs['wasi-resolution'] = {
    uses: './.github/workflows/bun-wasi-resolution.yml',
  };
  return {
    name: 'Bun candidate qualification',
    on: { workflow_dispatch: null },
    permissions: { contents: 'read' },
    env: {
      NODE_VERSION: '22',
      BUN_QUALIFICATION_EVIDENCE: '/tmp/kerf-bun-qualification',
      BUN_INSTALL_CACHE_DIR: '/tmp/kerf-bun-cache',
      BUN_QUALIFICATION_CI_SHA256: createHash('sha256')
        .update(source)
        .digest('hex'),
    },
    jobs,
  };
}

async function main() {
  const root = resolve(import.meta.dirname, '..');
  const path = resolve(root, '.github/workflows/bun-qualification.yml');
  const source = readFileSync(
    resolve(root, '.github/workflows/ci.yml'),
    'utf8',
  );
  const raw =
    '# Generated from ci.yml by scripts/sync-bun-qualification-workflow.mjs.\n# Manual candidate only; production npm CI and release workflows are unchanged.\n' +
    YAML.stringify(qualificationWorkflow(source), { lineWidth: 0 });
  const releases = new Map(
    [
      ...source.matchAll(/uses:\s+(\S+@[0-9a-f]{40})\s+#\s+(v\d+\.\d+\.\d+)/g),
    ].map(([, action, release]) => [action, release]),
  );
  const annotated = raw.replace(
    /^(\s*(?:-\s*)?uses:\s+)(\S+@[0-9a-f]{40})$/gm,
    (_line, prefix, action) => {
      const release = releases.get(action);
      assert.ok(release, `No audited canonical release comment for ${action}`);
      return `${prefix}${action} # ${release}`;
    },
  );
  const expected = await format(annotated, {
    ...(await resolveConfig(path)),
    filepath: path,
  });
  if (process.argv.includes('--check')) {
    assert.equal(
      readFileSync(path, 'utf8'),
      expected,
      'Bun qualification workflow drifted from canonical CI',
    );
    console.log('Bun qualification workflow matches canonical CI');
  } else {
    writeFileSync(path, expected);
    console.log('Generated full Bun qualification workflow');
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
