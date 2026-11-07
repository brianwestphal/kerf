import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  realpath,
  rename,
  rm,
  rmdir,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { contained, exists, readText } from './common.mjs';

const execFileAsync = promisify(execFile);

export async function applyKerfSetup(
  plan,
  { install = true, offline = false, runner = execFileAsync } = {},
) {
  if (plan.conflicts.length)
    throw new Error('Resolve setup conflicts before applying changes.');
  const written = [];
  const temporaryPaths = [];
  const createdDirectories = [];
  const lockPath = resolve(plan.root, '.kerf-ai-setup.lock');
  try {
    await mkdir(lockPath);
  } catch {
    throw new Error(
      'Another Kerf setup is already applying in this workspace.',
    );
  }
  const lockfiles = [
    ...new Set(
      [plan.root, plan.packageRoot].flatMap((directory) => [
        resolve(directory, 'package-lock.json'),
        resolve(directory, 'pnpm-lock.yaml'),
        resolve(directory, 'yarn.lock'),
      ]),
    ),
  ];
  const lockfileSnapshots = new Map();
  const generatedSnapshots = new Map();
  let actualPackageRoot;
  const isSymlink = async (path) => {
    try {
      return (await lstat(path)).isSymbolicLink();
    } catch {
      return false;
    }
  };
  const validateGeneratedPath = async (
    path,
    { allowLeafSymlink = false } = {},
  ) => {
    if (!contained(plan.packageRoot, path))
      throw new Error('A generated catalog path escapes the selected package.');
    let ancestor = dirname(path);
    while (!(await exists(ancestor))) ancestor = dirname(ancestor);
    if (!contained(actualPackageRoot, await realpath(ancestor)))
      throw new Error(
        'A generated catalog path traverses a symlink outside the selected package.',
      );
    if (!allowLeafSymlink && (await isSymlink(path)))
      throw new Error('Setup refuses a symlinked generated catalog output.');
  };
  try {
    const actualRoot = await realpath(plan.root);
    if (
      !contained(plan.root, plan.packageRoot) ||
      !contained(actualRoot, await realpath(plan.packageRoot))
    )
      throw new Error('Selected package escapes the setup workspace.');
    actualPackageRoot = await realpath(plan.packageRoot);
    for (const path of lockfiles) {
      if (!contained(plan.root, path))
        throw new Error('A lockfile path escapes the setup workspace.');
      lockfileSnapshots.set(path, await readText(path));
    }
    for (const path of plan.generatedPaths ?? []) {
      await validateGeneratedPath(path);
      generatedSnapshots.set(path, await readText(path));
    }
    for (const action of plan.actions) {
      const expectedPath = resolve(plan.root, action.path);
      if (
        action.absolutePath !== expectedPath ||
        !contained(plan.root, action.absolutePath)
      )
        throw new Error(`Setup action escapes the workspace: ${action.path}.`);
      let ancestor = dirname(action.absolutePath);
      while (!(await exists(ancestor))) ancestor = dirname(ancestor);
      if (!contained(actualRoot, await realpath(ancestor)))
        throw new Error(
          `Setup action traverses a symlink outside the workspace: ${action.path}.`,
        );
      if (
        (await exists(action.absolutePath)) &&
        (await lstat(action.absolutePath)).isSymbolicLink()
      )
        throw new Error(`Setup refuses to replace symlink ${action.path}.`);
      if ((await readText(action.absolutePath)) !== action.before)
        throw new Error(
          `Setup plan is stale for ${action.path}; rerun the dry-run.`,
        );
    }
    for (const action of plan.actions) {
      let directory = dirname(action.absolutePath);
      const missing = [];
      while (!(await exists(directory))) {
        missing.push(directory);
        directory = dirname(directory);
      }
      await mkdir(dirname(action.absolutePath), { recursive: true });
      createdDirectories.push(...missing);
      if (!contained(actualRoot, await realpath(dirname(action.absolutePath))))
        throw new Error(
          `Setup action traverses a symlink outside the workspace: ${action.path}.`,
        );
      const temporary = `${action.absolutePath}.kerf-setup-${process.pid}-${randomUUID()}.tmp`;
      temporaryPaths.push(temporary);
      await writeFile(temporary, action.after);
      if ((await readText(action.absolutePath)) !== action.before)
        throw new Error(
          `Setup plan became stale for ${action.path}; rerun the dry-run.`,
        );
      await rename(temporary, action.absolutePath);
      written.push(action);
    }
    if (install) {
      if (plan.packageManager === 'yarn' && !plan.packageManagerVariant)
        throw new Error(
          'Cannot install with Yarn until Classic or Berry is identified.',
        );
      const berry = plan.packageManagerVariant === 'berry';
      const offlineArgs = offline
        ? berry
          ? ['--immutable-cache']
          : ['--offline']
        : [];
      const workspace = plan.packageRoot !== plan.root;
      let args;
      let installCwd = plan.root;
      if (!workspace || berry) args = ['install', ...offlineArgs];
      else if (plan.packageManager === 'npm')
        args = ['install', '--workspace', plan.packageName, ...offlineArgs];
      else if (plan.packageManager === 'pnpm')
        args = ['--filter', plan.packageName, 'install', ...offlineArgs];
      else {
        args = ['install', '--focus', ...offlineArgs];
        installCwd = plan.packageRoot;
      }
      await runner(plan.packageManager, args, {
        cwd: installCwd,
        ...(offline && berry
          ? { env: { ...process.env, YARN_ENABLE_NETWORK: '0' } }
          : {}),
      });
      if (plan.mode === 'ui' && plan.generatedPaths?.length) {
        for (const path of plan.generatedPaths ?? [])
          await validateGeneratedPath(path);
        await runner(plan.packageManager, ['run', 'catalog:generate'], {
          cwd: plan.packageRoot,
        });
      }
    }
  } catch (error) {
    for (const action of written.reverse()) {
      if (action.before === null)
        await rm(action.absolutePath, { force: true });
      else await writeFile(action.absolutePath, action.before);
    }
    for (const [path, source] of lockfileSnapshots) {
      if (source === null) await rm(path, { force: true });
      else await writeFile(path, source);
    }
    for (const [path, source] of generatedSnapshots) {
      await validateGeneratedPath(path, { allowLeafSymlink: true });
      if (await isSymlink(path)) await rm(path, { force: true });
      if (source === null) await rm(path, { force: true });
      else await writeFile(path, source);
    }
    throw error;
  } finally {
    for (const path of temporaryPaths) await rm(path, { force: true });
    for (const path of [...new Set(createdDirectories)].sort(
      (left, right) => right.length - left.length,
    )) {
      try {
        await rmdir(path);
      } catch {
        // Preserve non-empty directories, including directories used by other tools.
      }
    }
    await rm(lockPath, { recursive: true, force: true });
  }
  return { changed: plan.actions.map(({ path }) => path) };
}
