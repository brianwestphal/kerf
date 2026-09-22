#!/usr/bin/env node

import console from 'node:console';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  analyzeUiProject,
  formatUiAnalysisSarif,
  formatUiAnalysisText,
} from './index.mjs';

const args = process.argv.slice(2);
const take = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  args.splice(index, 2);
  return value;
};
const root = resolve(take('--root') ?? process.cwd());
const format = take('--format') ?? 'text';
const output = take('--output');
const profile = take('--profile');
const failOnReview = args.includes('--fail-on-review');
const adoption = args.includes('--adoption');
const paths = args.filter(
  (argument) => !argument.startsWith('--') && argument !== '--adoption',
);

if (!['text', 'json', 'sarif'].includes(format)) {
  console.error(`Unknown --format ${format}; expected text, json, or sarif.`);
  process.exitCode = 2;
} else {
  const report = await analyzeUiProject({ root, paths, profile, adoption });
  const rendered =
    format === 'text'
      ? formatUiAnalysisText(report)
      : JSON.stringify(
          format === 'sarif' ? formatUiAnalysisSarif(report) : report,
          null,
          2,
        );
  if (output) await writeFile(resolve(root, output), `${rendered}\n`);
  else console.log(rendered);
  if (report.summary.errors || (failOnReview && report.summary.review))
    process.exitCode = 1;
}
