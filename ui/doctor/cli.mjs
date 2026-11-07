#!/usr/bin/env node

import console from 'node:console';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { parseCliArguments, wantsHelp } from '../scripts/lib/cli-args.mjs';
import { formatUiDoctorText, runUiDoctor, UI_DOCTOR_EXIT } from './index.mjs';

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);

async function changedPaths(root) {
  const { stdout: tracked } = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMR', 'HEAD', '--'],
    { cwd: root },
  );
  const { stdout: untracked } = await execFileAsync(
    'git',
    ['ls-files', '--others', '--exclude-standard'],
    { cwd: root },
  );
  return [
    ...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean)),
  ].sort();
}

try {
  if (wantsHelp(args)) {
    console.log(`Usage: kerf-ui-doctor [--full | --changed] [options]

Options:
  --root <path>          Workspace root (default: current directory)
  --package <name|path>  Select one workspace package
  --path <path>          Restrict changed mode (repeatable)
  --config <path>        Doctor config (default: .kerf-ui-doctor.json)
  --browser-url <url>    Explicitly enable browser evaluation
  --browser <list>       Comma-separated chromium,firefox,webkit
  --eslint <preset>      recommended-ui or strict-ui
  --format <format>      text or json (default: text)
  --fail-on <severity>   error, review, or warning (default: error)
  --output <path>        Also write the merged report
  --no-cache             Disable the content-addressed cache
  -h, --help             Show this help

Exit codes: 0 clean, 1 findings, 2 configuration/tool failure, 130 cancelled.`);
    process.exit(0);
  }
  const { options } = parseCliArguments(args, {
    values: {
      '--root': 'root',
      '--package': 'package',
      '--path': 'paths',
      '--config': 'config',
      '--browser-url': 'browserUrl',
      '--browser': 'browser',
      '--eslint': 'eslint',
      '--format': 'format',
      '--fail-on': 'failOn',
      '--output': 'output',
    },
    repeatable: ['--path'],
    flags: {
      '--full': 'full',
      '--changed': 'changed',
      '--no-cache': 'noCache',
    },
  });
  const root = resolve(options.root ?? process.cwd());
  const packageSelector = options.package;
  const explicitPaths = options.paths;
  const configPath = options.config;
  const url = options.browserUrl;
  const browserList = options.browser;
  const eslintConfig = options.eslint ?? 'recommended-ui';
  const format = options.format ?? 'text';
  const failOn = options.failOn;
  const output = options.output;
  const full = options.full === true;
  const changed = options.changed === true;
  const noCache = options.noCache === true;
  if (full && changed)
    throw new Error('--full and --changed are mutually exclusive.');
  if (!['text', 'json'].includes(format))
    throw new Error('--format must be text or json.');
  if (failOn && !['error', 'review', 'warning'].includes(failOn))
    throw new Error('--fail-on must be error, review, or warning.');
  if (!['recommended-ui', 'strict-ui'].includes(eslintConfig))
    throw new Error('--eslint must be recommended-ui or strict-ui.');
  const abort = new globalThis.AbortController();
  process.once('SIGINT', () => abort.abort());
  const paths =
    changed && !explicitPaths.length ? await changedPaths(root) : explicitPaths;
  const report = await runUiDoctor({
    root,
    package: packageSelector,
    mode: changed ? 'changed' : full ? 'full' : undefined,
    paths,
    configPath,
    cache: !noCache,
    signal: abort.signal,
    eslintConfig,
    failOn,
    browser: url
      ? { url, browsers: browserList?.split(',').map((item) => item.trim()) }
      : undefined,
  });
  const rendered =
    format === 'json'
      ? JSON.stringify(report, null, 2)
      : formatUiDoctorText(report);
  if (output) await writeFile(resolve(root, output), `${rendered}\n`);
  else console.log(rendered);
  process.exitCode = report.exitCode;
} catch (error) {
  console.error(`kerf-ui-doctor: ${error.message}`);
  process.exitCode =
    process.exitCode === UI_DOCTOR_EXIT.cancelled
      ? process.exitCode
      : UI_DOCTOR_EXIT.configuration;
}
