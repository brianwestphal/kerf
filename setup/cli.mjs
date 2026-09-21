#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';

import { applyKerfSetup, formatSetupPlan, planKerfSetup } from './index.mjs';

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('-') ? args.shift() : 'setup';
const take = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--'))
    throw new Error(`${name} requires a value.`);
  args.splice(index, 2);
  return value;
};
const takeAll = (name) => {
  const values = [];
  while (args.includes(name)) values.push(take(name));
  return values;
};

try {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: kerfjs setup [options]

Options:
  --root <path>       Workspace root (default: current directory)
  --package <name>    Select a workspace package by name or relative path
  --core | --ui       Choose a mode when it cannot be detected
  --resolve <id>=<choice>
                       Resolve one conflict with keep or kerf (repeatable)
  --write             Apply the displayed plan (default is dry-run)
  --yes               Required with --write in non-interactive use
  --offline           Forbid registry access during dependency installation
  --no-install        Write configuration without running the package manager`);
    process.exit(0);
  }
  if (command !== 'setup') throw new Error(`Unknown command ${command}.`);
  const core = args.includes('--core');
  const ui = args.includes('--ui');
  if (core && ui) throw new Error('--core and --ui are mutually exclusive.');
  const write = args.includes('--write');
  const yes = args.includes('--yes');
  const offline = args.includes('--offline');
  const noInstall = args.includes('--no-install');
  const root = take('--root');
  const packageSelector = take('--package');
  const resolutions = {};
  for (const entry of takeAll('--resolve')) {
    const index = entry.lastIndexOf('=');
    if (index < 1) throw new Error('--resolve requires <id>=keep|kerf.');
    const id = entry.slice(0, index);
    const choice = entry.slice(index + 1);
    if (id in resolutions && resolutions[id] !== choice)
      throw new Error(`Conflicting resolutions for ${id}.`);
    resolutions[id] = choice;
  }
  const known = new Set([
    '--core',
    '--ui',
    '--write',
    '--yes',
    '--offline',
    '--no-install',
  ]);
  const unknown = args.filter((arg) => !known.has(arg));
  if (unknown.length)
    throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
  const plan = await planKerfSetup({
    root,
    package: packageSelector,
    mode: ui ? 'ui' : core ? 'core' : undefined,
    resolutions,
  });
  console.log(formatSetupPlan(plan));
  if (plan.conflicts.length) {
    process.exitCode = 2;
  } else if (write) {
    if (!yes)
      throw new Error('--write requires --yes after reviewing the plan.');
    await applyKerfSetup(plan, { install: !noInstall, offline });
    console.log(`Applied ${plan.actions.length} change(s).`);
  }
} catch (error) {
  console.error(`kerfjs setup: ${error.message}`);
  process.exitCode = 2;
}
