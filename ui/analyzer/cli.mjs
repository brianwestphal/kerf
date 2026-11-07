#!/usr/bin/env node

import console from 'node:console';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  CLI_USAGE_EXIT,
  parseCliArguments,
  wantsHelp,
} from '../scripts/lib/cli-args.mjs';
import {
  analyzeUiProject,
  formatUiAnalysisSarif,
  formatUiAnalysisText,
} from './index.mjs';

const USAGE = `Usage: kerf-ui-analyze [options] [path...]

Analyzes the named source paths (default: the whole root).

Options:
  --root <path>       Project root (default: current directory)
  --format <format>   text, json, or sarif (default: text)
  --output <path>     Write the report to a file instead of stdout
  --profile <path>    Override the package-default application UI profile
  --fail-on-review    Exit 1 on review diagnostics, not only errors
  --adoption          Report ownership-boundary diagnostics as review
  -h, --help          Show this help

Exit codes: 0 clean, 1 findings, 2 usage or input error.`;

const args = process.argv.slice(2);

try {
  if (wantsHelp(args)) {
    console.log(USAGE);
    process.exit(0);
  }
  const { options, positionals: paths } = parseCliArguments(args, {
    values: {
      '--root': 'root',
      '--format': 'format',
      '--output': 'output',
      '--profile': 'profile',
    },
    flags: { '--fail-on-review': 'failOnReview', '--adoption': 'adoption' },
    positionals: true,
  });
  const root = resolve(options.root ?? process.cwd());
  const format = options.format ?? 'text';
  if (!['text', 'json', 'sarif'].includes(format))
    throw new Error(
      `Unknown --format ${format}; expected text, json, or sarif.`,
    );
  const report = await analyzeUiProject({
    root,
    paths,
    profile: options.profile,
    adoption: options.adoption === true,
  });
  const rendered =
    format === 'text'
      ? formatUiAnalysisText(report)
      : JSON.stringify(
          format === 'sarif' ? formatUiAnalysisSarif(report) : report,
          null,
          2,
        );
  if (options.output)
    await writeFile(resolve(root, options.output), `${rendered}\n`);
  else console.log(rendered);
  if (
    report.summary.errors ||
    (options.failOnReview === true && report.summary.review)
  )
    process.exitCode = 1;
} catch (error) {
  console.error(`kerf-ui-analyze: ${error.message}`);
  process.exitCode = CLI_USAGE_EXIT;
}
