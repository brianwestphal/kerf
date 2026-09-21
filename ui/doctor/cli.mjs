#!/usr/bin/env node

import console from 'node:console';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { formatUiDoctorText, runUiDoctor, UI_DOCTOR_EXIT } from './index.mjs';

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);
const take = (name, repeat = false) => {
  const values = [];
  while (args.includes(name)) {
    const index = args.indexOf(name);
    const value = args[index + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`${name} requires a value.`);
    args.splice(index, 2);
    values.push(value);
    if (!repeat) break;
  }
  return repeat ? values : values[0];
};

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
  if (args.includes('--help') || args.includes('-h')) {
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
  --output <path>        Also write the merged report
  --no-cache             Disable the content-addressed cache

Exit codes: 0 clean, 1 findings, 2 configuration/tool failure, 130 cancelled.`);
    process.exit(0);
  }
  const root = resolve(take('--root') ?? process.cwd());
  const packageSelector = take('--package');
  const explicitPaths = take('--path', true);
  const configPath = take('--config');
  const url = take('--browser-url');
  const browserList = take('--browser');
  const eslintConfig = take('--eslint') ?? 'recommended-ui';
  const format = take('--format') ?? 'text';
  const output = take('--output');
  const full = args.includes('--full');
  const changed = args.includes('--changed');
  const noCache = args.includes('--no-cache');
  const known = new Set(['--full', '--changed', '--no-cache']);
  const unknown = args.filter((item) => !known.has(item));
  if (unknown.length)
    throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
  if (full && changed)
    throw new Error('--full and --changed are mutually exclusive.');
  if (!['text', 'json'].includes(format))
    throw new Error('--format must be text or json.');
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
