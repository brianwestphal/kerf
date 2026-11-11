// KF-1EH00H: the physical installed graph a disposable Bun qualification
// lane actually ran against. `bun pm ls` reads the lock, so after
// `bun add --no-save` it can name a version that is not on disk; this walks
// node_modules itself (scoped packages, nested installs, Bun's hidden
// `.bun` store, symlinked packages) and asks Node which copy it resolves.
// Disposable qualification evidence only: production installs remain npm.
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const manifestOf = (dir) => {
  const file = join(dir, 'package.json');
  if (!existsSync(file)) return undefined;
  try {
    const { name, version } = JSON.parse(readFileSync(file, 'utf8'));
    return typeof name === 'string' && typeof version === 'string'
      ? { name, version }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Every package installed under `root/node_modules`, by the path Node would
 * find it at and the real directory behind it. Each real directory is
 * walked once, so a symlink cycle ends instead of looping.
 */
export function installedInventory(given) {
  // Relative paths read from the real root (macOS's /var is /private/var).
  const root = realpathSync(given);
  const packages = [];
  const cycles = [];
  const walked = new Set();
  const visitPackage = (dir, linked) => {
    const real = realpathSync(dir);
    const manifest = manifestOf(real);
    if (manifest)
      packages.push({
        path: relative(root, dir),
        realPath: relative(root, real),
        name: manifest.name,
        version: manifest.version,
        linked,
      });
    if (walked.has(real)) {
      cycles.push(relative(root, dir));
      return;
    }
    walked.add(real);
    // The nested install by the path Node finds it at.
    const nested = join(dir, 'node_modules');
    if (existsSync(nested)) visitModules(nested);
  };
  const visitModules = (modules) => {
    const real = realpathSync(modules);
    if (walked.has(real)) {
      cycles.push(relative(root, modules));
      return;
    }
    walked.add(real);
    for (const entry of readdirSync(modules).sort()) {
      if (entry === '.bin') continue;
      const path = join(modules, entry);
      const linked = lstatSync(path).isSymbolicLink();
      if (!linked && !lstatSync(path).isDirectory()) continue;
      if (linked && !existsSync(path)) continue;
      if (entry.startsWith('@')) {
        for (const scoped of readdirSync(path).sort())
          visitPackage(
            join(path, scoped),
            lstatSync(join(path, scoped)).isSymbolicLink(),
          );
      } else if (entry.startsWith('.')) {
        // A store such as Bun's `.bun/<name>@<version>/node_modules/…`.
        for (const stored of readdirSync(path).sort()) {
          const nested = join(path, stored, 'node_modules');
          if (existsSync(nested)) visitModules(nested);
        }
      } else visitPackage(path, linked);
    }
  };
  const modules = join(root, 'node_modules');
  if (existsSync(modules)) visitModules(modules);
  packages.sort(
    (a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name),
  );
  return { packages, cycles };
}

/** The copy of `name` Node resolves from `root`, as a bare import would. */
export function runtimePackage(given, name) {
  const root = realpathSync(given);
  const paths =
    createRequire(join(root, 'package.json')).resolve.paths(name) ?? [];
  for (const base of paths) {
    const dir = join(base, name);
    const manifest = manifestOf(dir);
    if (manifest?.name === name)
      return {
        name,
        version: manifest.version,
        path: relative(root, dir),
        realPath: relative(root, realpathSync(dir)),
      };
  }
  return undefined;
}

/** Whether `version` meets `wanted`: an exact version or `^major`. */
export function meets(version, wanted) {
  if (/^\d+\.\d+\.\d+/.test(wanted)) return version === wanted;
  const major = /^\^(\d+)$/.exec(wanted);
  if (!major) throw new Error(`Unsupported expectation: ${wanted}`);
  return version.split('.')[0] === major[1];
}

/** `name@wanted`, where a scoped name keeps its own leading `@`. */
export function parseExpectation(spec) {
  const at = spec.lastIndexOf('@');
  if (at <= 0) throw new Error(`Expected name@version, got ${spec}`);
  return { name: spec.slice(0, at), wanted: spec.slice(at + 1) };
}

/**
 * The inventory plus each expected package's runtime copy; throws when the
 * copy Node resolves is missing or is not the expected version.
 */
export function recordInventory(root, expectations = []) {
  const { packages, cycles } = installedInventory(root);
  const runtime = expectations.map((spec) => {
    const { name, wanted } = parseExpectation(spec);
    const found = runtimePackage(root, name);
    if (!found) throw new Error(`${name} does not resolve from ${root}`);
    if (!meets(found.version, wanted))
      throw new Error(
        `${name} resolves to ${found.version} at ${found.path}, not ${wanted}`,
      );
    return { ...found, expected: wanted };
  });
  return {
    kind: 'physical-installed-graph',
    note: 'Walked from node_modules on disk; not the lock or `bun pm ls`.',
    node: process.version,
    runtime,
    cycles,
    packages,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [dir, out, ...rest] = process.argv.slice(2);
  if (!dir || !out)
    throw new Error(
      'Usage: bun-installed-inventory.mjs <dir> <out.json> [--expect name@version]…',
    );
  const expectations = [];
  for (let index = 0; index < rest.length; index += 2) {
    if (rest[index] !== '--expect' || !rest[index + 1])
      throw new Error(`Unexpected argument: ${rest[index]}`);
    expectations.push(rest[index + 1]);
  }
  const inventory = recordInventory(resolve(dir), expectations);
  writeFileSync(out, `${JSON.stringify(inventory, null, 2)}\n`);
  for (const found of inventory.runtime)
    console.log(
      `Runtime ${found.name}@${found.version} at ${found.path} (expected ${found.expected})`,
    );
  console.log(
    `Physical inventory: ${inventory.packages.length} packages, ${inventory.cycles.length} cycles`,
  );
}
