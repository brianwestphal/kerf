import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  assertLocalDemoTool,
  demoInstallEnvironment,
  installDemoDependencies,
  runDemoCommand,
} from '../scripts/build-examples.mjs';

test('demo install clears Vite production state and inherited npm omit configuration', () => {
  const environment = demoInstallEnvironment({
    NODE_ENV: 'production',
    npm_config_omit: 'dev',
    NPM_CONFIG_OMIT: 'dev',
    npm_config_production: 'true',
    NPM_CONFIG_PRODUCTION: 'true',
    PATH: '/example/bin',
  });

  assert.equal(environment.NODE_ENV, undefined);
  assert.equal(environment.npm_config_omit, undefined);
  assert.equal(environment.NPM_CONFIG_OMIT, undefined);
  assert.equal(environment.npm_config_production, undefined);
  assert.equal(environment.NPM_CONFIG_PRODUCTION, undefined);
  assert.equal(environment.PATH, '/example/bin');
});

test('demo command reports the failing phase, exit status, and command', () => {
  assert.throws(
    () => runDemoCommand(
      'installing fixture dependencies',
      process.execPath,
      ['-e', 'process.exit(17)'],
      { cwd: process.cwd(), env: process.env },
    ),
    /installing fixture dependencies failed \(exit 17\).*process\.exit\(17\)/,
  );
});

test('demo tool assertion rejects ancestor-only resolution', (context) => {
  const fixture = mkdtempSync(join(tmpdir(), 'kerf-demo-tool-'));
  context.after(() => rmSync(fixture, { recursive: true, force: true }));
  assert.throws(
    () => assertLocalDemoTool(fixture, 'vite'),
    /refusing an ancestor node_modules fallback/,
  );

  const localPackage = join(fixture, 'node_modules', 'vite');
  mkdirSync(localPackage, { recursive: true });
  writeFileSync(join(localPackage, 'package.json'), JSON.stringify({ version: '6.4.2' }));
  const localBin = join(fixture, 'node_modules', '.bin');
  mkdirSync(localBin);
  writeFileSync(join(localBin, 'vite'), '');
  assert.equal(assertLocalDemoTool(fixture, 'vite'), '6.4.2');
});

test('demo install includes local dev tools despite inherited production lifecycle state', (context) => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'kerf-demo-install-'));
  context.after(() => rmSync(fixtureRoot, { recursive: true, force: true }));
  const demoRoot = join(fixtureRoot, 'demo');
  mkdirSync(demoRoot, { recursive: true });

  for (const [name, version] of [['vite', '6.4.2'], ['typescript', '5.9.3']]) {
    const packageRoot = join(fixtureRoot, name);
    mkdirSync(packageRoot);
    const binName = name === 'typescript' ? 'tsc' : name;
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({
      name,
      version,
      bin: { [binName]: `bin/${binName}.js` },
    }));
    mkdirSync(join(packageRoot, 'bin'));
    writeFileSync(join(packageRoot, 'bin', `${binName}.js`), '');
  }
  writeFileSync(join(demoRoot, 'package.json'), JSON.stringify({
    name: 'demo-install-fixture',
    version: '0.0.0',
    devDependencies: {
      typescript: 'file:../typescript',
      vite: 'file:../vite',
    },
  }));

  const npmExecPath = process.env.npm_execpath;
  const npmCommand = npmExecPath === undefined ? 'npm' : process.execPath;
  const npmArgs = npmExecPath === undefined ? [] : [npmExecPath];
  runDemoCommand(
    'preparing demo install regression lockfile',
    npmCommand,
    [...npmArgs, 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: demoRoot, env: demoInstallEnvironment() },
  );

  // An ancestor package proves that the post-install assertion accepts only
  // the demo-local tools, never Node's normal upward resolution fallback.
  const ancestorVite = join(fixtureRoot, 'node_modules', 'vite');
  mkdirSync(ancestorVite, { recursive: true });
  writeFileSync(join(ancestorVite, 'package.json'), JSON.stringify({ name: 'vite', version: '99.0.0' }));

  const installed = installDemoDependencies(demoRoot, {
    ...process.env,
    NODE_ENV: 'production',
    npm_config_omit: 'dev',
    npm_config_production: 'true',
  });
  assert.deepEqual(installed, { viteVersion: '6.4.2', typescriptVersion: '5.9.3' });
  assert.equal(existsSync(join(demoRoot, 'node_modules', 'vite', 'package.json')), true);
});
