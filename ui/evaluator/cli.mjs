#!/usr/bin/env node

import console from 'node:console';
import { resolve } from 'node:path';
import process from 'node:process';

import { parseCliArguments, wantsHelp } from '../scripts/lib/cli-args.mjs';
import { evaluateUi, formatUiEvaluationText } from './index.mjs';

const args = process.argv.slice(2);

try {
  if (wantsHelp(args)) {
    console.log(`Usage: kerf-ui-evaluate --url <running-app> [options]

Options:
  --root <path>          Workspace root (default: current directory)
  --start <path>         Profile discovery start directory (default: root)
  --profile <path>       Override the package-default profile
  --browser <list>       Comma-separated chromium,firefox,webkit
  --output <directory>   Evidence directory (default: kerf-ui-evidence)
  --report <path>        Report JSON path (default: <output>/report.json)
  --timeout <ms>         Per-operation timeout (default: 15000)
  --settle <ms>          App settle delay after navigation (default: 100)
  --retention <policy>   always, on-failure, or never
  --format <format>      text or json (default: text)
  --no-fail              Exit zero even when objective diagnostics fail
  -h, --help             Show this help

Exit codes: 0 passed, 1 objective diagnostics failed, 2 usage or input error.`);
    process.exit(0);
  }
  const { options } = parseCliArguments(args, {
    values: {
      '--url': 'url',
      '--root': 'root',
      '--start': 'start',
      '--profile': 'profile',
      '--output': 'output',
      '--report': 'report',
      '--browser': 'browser',
      '--timeout': 'timeout',
      '--settle': 'settle',
      '--retention': 'retention',
      '--format': 'format',
    },
    flags: { '--no-fail': 'noFail' },
  });
  const url = options.url;
  const root = resolve(options.root ?? process.cwd());
  const startDirectory = resolve(root, options.start ?? '.');
  const packageProfile = options.profile;
  const outputDirectory = resolve(root, options.output ?? 'kerf-ui-evidence');
  const reportPath = options.report
    ? resolve(root, options.report)
    : resolve(outputDirectory, 'report.json');
  const browsers = options.browser
    ? options.browser.split(',').map((value) => value.trim())
    : undefined;
  const timeoutMs = Number(options.timeout ?? 15_000);
  const settleMs = Number(options.settle ?? 100);
  const retention = options.retention ?? 'on-failure';
  const format = options.format ?? 'text';
  const noFail = options.noFail === true;
  if (!url) throw new Error('--url is required.');
  if (!['text', 'json'].includes(format))
    throw new Error('--format must be text or json.');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error('--timeout must be a positive number.');
  if (!Number.isFinite(settleMs) || settleMs < 0)
    throw new Error('--settle must be a non-negative number.');

  const report = await evaluateUi({
    url,
    workspaceRoot: root,
    startDirectory,
    packageProfile: packageProfile && resolve(root, packageProfile),
    outputDirectory,
    reportPath,
    browsers,
    timeoutMs,
    settleMs,
    retention,
  });
  console.log(
    format === 'json'
      ? JSON.stringify(report, null, 2)
      : formatUiEvaluationText(report),
  );
  console.error(`Report: ${reportPath}`);
  if (!noFail && !report.summary.passed) process.exitCode = 1;
} catch (error) {
  console.error(`kerf-ui-evaluate: ${error.message}`);
  process.exitCode = 2;
}
