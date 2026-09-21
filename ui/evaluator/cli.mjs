#!/usr/bin/env node

import console from 'node:console';
import { resolve } from 'node:path';
import process from 'node:process';

import { evaluateUi, formatUiEvaluationText } from './index.mjs';

const args = process.argv.slice(2);
const take = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`${name} requires a value.`);
  args.splice(index, 2);
  return value;
};

try {
  if (args.includes('--help') || args.includes('-h')) {
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
  --no-fail              Exit zero even when objective diagnostics fail`);
    process.exit(0);
  }
  const url = take('--url');
  const root = resolve(take('--root') ?? process.cwd());
  const startDirectory = resolve(root, take('--start') ?? '.');
  const packageProfile = take('--profile');
  const outputDirectory = resolve(root, take('--output') ?? 'kerf-ui-evidence');
  const reportValue = take('--report');
  const reportPath = reportValue
    ? resolve(root, reportValue)
    : resolve(outputDirectory, 'report.json');
  const browserValue = take('--browser');
  const browsers = browserValue
    ? browserValue.split(',').map((value) => value.trim())
    : undefined;
  const timeoutMs = Number(take('--timeout') ?? 15_000);
  const settleMs = Number(take('--settle') ?? 100);
  const retention = take('--retention') ?? 'on-failure';
  const format = take('--format') ?? 'text';
  const noFail = args.includes('--no-fail');
  const unknown = args.filter((argument) => argument !== '--no-fail');
  if (unknown.length)
    throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
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
