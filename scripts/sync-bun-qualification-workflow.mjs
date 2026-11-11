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
  // KF-1XBJDT: candidate installation must preserve canonical measurement phases.
  const editor = canonical.jobs['editor-browser'];
  const functional = editor.steps.find((step) => step.id === 'editor_browser');
  const performance = editor.steps.find(
    (step) => step.id === 'library_performance',
  );
  assert.ok(
    functional?.run.includes(
      '--test-list-invert=tests/library-performance.exclude',
    ) && functional.run.includes('--workers=3'),
    'Editor functional phase must exclude only the performance manifest at three workers',
  );
  assert.ok(
    performance?.run.includes('tests/browser/library-performance.spec.ts') &&
      performance.run.includes('--workers=1') &&
      performance.run.includes('--retries=0'),
    'Editor performance phase must retain the single-worker zero-retry spec',
  );

  for (const [name, job] of Object.entries(jobs)) {
    // KF-1EH00H: `bun pm ls` reads the lock, which a `--no-save` add leaves
    // behind, so it is kept as the lock's view; the physical graph and the
    // version Node actually resolves come from the installed tree itself.
    const recordVariation = (expect) =>
      `bun pm ls --all > "$BUN_QUALIFICATION_EVIDENCE/${name}-final-lock-view.txt" && ` +
      `node "$GITHUB_WORKSPACE/scripts/bun-installed-inventory.mjs" . "$BUN_QUALIFICATION_EVIDENCE/${name}-final-installed.json" --expect ${expect} && ` +
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
        step.run += ` && ${recordVariation('eslint@${{ matrix.eslint }}')}`;
      if (step.run === 'npm run test:webawesome-latest') {
        step.run =
          `bun add --no-save @awesome.me/webawesome@^3 && ${recordVariation('@awesome.me/webawesome@^3')} && ` +
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
        id: 'candidate-build',
        run: 'node scripts/bun-candidate-install.mjs . && npm run build && node scripts/bun-candidate-install.mjs ui && npm --prefix ui run build',
      },
      {
        run: 'PATH="$GITHUB_WORKSPACE/node_modules/.bin:$PATH" HUSKY=0 node node_modules/vitest/vitest.mjs run tests/unit/release-package.test.ts tests/unit/release-common.test.ts tests/unit/release-changelog.test.ts tests/unit/release-beta-plan.test.ts tests/unit/release-order.test.ts tests/integration/release-beta-auto.test.ts',
      },
      {
        if: "${{ !cancelled() && steps.candidate-build.outcome == 'success' }}",
        run: 'node scripts/bun-release-artifact-probe.mjs',
      },
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
  jobs['browser-apt'] = {
    if: "${{ inputs.scope == 'browser-apt' }}",
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': 20,
    steps: [
      { uses: canonical.jobs.test.steps[0].uses },
      {
        uses: canonical.jobs.test.steps[1].uses,
        with: { 'node-version': '${{ env.NODE_VERSION }}' },
      },
      { run: 'npm install --global bun@1.4.4' },
      { run: 'node scripts/bun-candidate-install.mjs .' },
      {
        name: 'Configure and record HTTPS Ubuntu dependencies',
        'timeout-minutes': 2,
        run: 'sudo "$(command -v node)" "$GITHUB_WORKSPACE/scripts/configure-browser-apt.mjs" > "$BUN_QUALIFICATION_EVIDENCE/browser-apt-sources.json"\ncat "$BUN_QUALIFICATION_EVIDENCE/browser-apt-sources.json"\napt-config dump Acquire::Retries Acquire::http::Timeout Acquire::https::Timeout > "$BUN_QUALIFICATION_EVIDENCE/browser-apt-effective.conf"\ncat "$BUN_QUALIFICATION_EVIDENCE/browser-apt-effective.conf"',
      },
      {
        run: 'npx --no-install playwright install --with-deps chromium firefox webkit',
        'timeout-minutes': 15,
      },
      {
        name: 'Launch and render with all three installed browsers',
        'timeout-minutes': 3,
        run: `node --input-type=module <<'JS'
import { chromium, firefox, webkit } from 'playwright';
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<h1>APT smoke</h1>');
    if (await page.locator('h1').textContent() !== 'APT smoke') throw new Error(name + ': rendering failed');
    console.log(name + ': launch and page rendering passed');
  } finally { await browser.close(); }
}
JS`,
      },
      {
        if: 'always()',
        uses: upload,
        with: {
          name: 'browser-apt-${{ github.sha }}',
          path: '${{ env.BUN_QUALIFICATION_EVIDENCE }}',
        },
      },
    ],
  };
  for (const [scope, script] of [
    ['pure-wasi', 'bun-pure-wasi-probe.mjs'],
    ['local-peer', 'bun-local-peer-probe.mjs'],
    ['stable-plan', 'stable-release-plan-probe.mjs'],
    ['bundled-dependency', 'bun-bundled-resolution-probe.mjs'],
  ]) {
    jobs[scope] = {
      if: `\${{ inputs.scope == '${scope}' }}`,
      'runs-on': 'ubuntu-24.04',
      'timeout-minutes': 40,
      steps: [
        { uses: canonical.jobs.test.steps[0].uses },
        {
          uses: canonical.jobs.test.steps[1].uses,
          with: { 'node-version': '22.23.4' },
        },
        { run: 'npm install --global bun@1.4.4' },
        {
          name: 'Assert and record the diagnostic toolchain',
          run: `mkdir -p "$BUN_QUALIFICATION_EVIDENCE"
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const run = (file, args) => execFileSync(file, args, { encoding: 'utf8' }).trim();
const toolchain = { node: process.version, npm: run('npm', ['--version']), bun: run('bun', ['--version']), bunRevision: run('bun', ['--revision']), sourceSha: run('git', ['rev-parse', 'HEAD']), platform: process.platform, arch: process.arch };
writeFileSync(process.env.BUN_QUALIFICATION_EVIDENCE + '/toolchain.json', JSON.stringify(toolchain, null, 2));
assert.equal(toolchain.node, 'v22.23.4');
assert.equal(toolchain.npm, '10.9.9');
assert.equal(toolchain.bun, '1.4.4');
assert.equal(toolchain.sourceSha, process.env.GITHUB_SHA);
assert.equal(toolchain.platform, 'linux');
assert.equal(toolchain.arch, 'x64');
JS`,
        },
        { run: `node scripts/${script} .` },
        {
          if: 'always()',
          uses: upload,
          with: {
            name: `${scope}-\${{ github.sha }}`,
            path: '${{ env.BUN_QUALIFICATION_EVIDENCE }}',
          },
        },
      ],
    };
  }
  jobs['library-performance'] = {
    if: "${{ inputs.scope == 'library-performance' }}",
    uses: './.github/workflows/library-performance.yml',
    with: { 'source-sha': '${{ inputs.source-sha }}' },
  };
  for (const [name, job] of Object.entries(jobs)) {
    if (
      [
        'browser-apt',
        'pure-wasi',
        'local-peer',
        'stable-plan',
        'bundled-dependency',
        'library-performance',
      ].includes(name)
    )
      continue;
    // KF-1EH00H: the dependency-variation lanes rerun on their own.
    const scope =
      name === 'release-artifacts'
        ? "inputs.scope == 'full' || inputs.scope == 'release-artifacts'"
        : name === 'eslint-plugin' || name === 'ui-webawesome-latest'
          ? "inputs.scope == 'full' || inputs.scope == 'dependency-variations'"
          : "inputs.scope == 'full'";
    let prior = job.if;
    if (typeof prior === 'string') {
      prior = prior.trim();
      if (prior.startsWith('${{') && prior.endsWith('}}'))
        prior = prior.slice(3, -2).trim();
    }
    job.if =
      prior === undefined
        ? `\${{ ${scope} }}`
        : `\${{ (${prior}) && (${scope}) }}`;
  }
  return {
    name: 'Bun candidate qualification',
    on: {
      workflow_dispatch: {
        inputs: {
          'source-sha': {
            description:
              'Exact 40-character source SHA for the isolated npm performance control',
            type: 'string',
            required: false,
          },
          scope: {
            description:
              'Qualification scope (full retains every canonical lane)',
            type: 'choice',
            options: [
              'full',
              'release-artifacts',
              'dependency-variations',
              'browser-apt',
              'pure-wasi',
              'local-peer',
              'stable-plan',
              'bundled-dependency',
              'library-performance',
            ],
            default: 'full',
          },
        },
      },
    },
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
    '# Generated from ci.yml by scripts/sync-bun-qualification-workflow.mjs.\n# Manual qualification only; production installation and publishing remain npm.\n' +
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
