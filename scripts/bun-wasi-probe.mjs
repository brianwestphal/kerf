// Probe the real Satteri consumer and all installed WASI locations on Linux.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const site = resolve(process.argv[2] ?? 'site');
const mode = process.argv[3] ?? 'native';
if (!['native', 'provisioned'].includes(mode))
  throw new Error('Invalid probe mode');
const evidence = process.env.BUN_QUALIFICATION_EVIDENCE;
if (!evidence) throw new Error('BUN_QUALIFICATION_EVIDENCE is required');
const requireSite = createRequire(join(site, 'package.json'));
const entry = requireSite.resolve('satteri');
const loader = createRequire(entry).resolve('#binding');
const requireLoader = createRequire(loader);
const names = [
  '@bruits/satteri-wasm32-wasi',
  '@emnapi/core',
  '@emnapi/runtime',
  '@emnapi/wasi-threads',
  '@napi-rs/wasm-runtime',
];
const resolutions = names.map((name) => {
  try {
    const path = requireLoader.resolve(`${name}/package.json`);
    return {
      name,
      path,
      version: requireLoader(`${name}/package.json`).version,
    };
  } catch (error) {
    return { name, absent: true, code: error.code };
  }
});

// Walk the whole installed tree, including Bun's hidden storage. Follow local
// package symlinks once so inventory is complete without recursive link loops.
const inventory = [];
const visited = new Set();
async function walk(path) {
  const physical = await realpath(path);
  if (visited.has(physical)) return;
  visited.add(physical);
  const entries = await readdir(path, { withFileTypes: true });
  const manifest = entries.find((entry) => entry.name === 'package.json');
  if (manifest) {
    const pkg = JSON.parse(await readFile(join(path, manifest.name), 'utf8'));
    if (names.includes(pkg.name))
      inventory.push({ name: pkg.name, version: pkg.version, path });
  }
  for (const entry of entries) {
    if (entry.name === '.git') continue;
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      try {
        await walk(join(path, entry.name));
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'ELOOP'].includes(error.code)) throw error;
      }
    }
  }
}
await walk(join(site, 'node_modules'));

const source = `
  const { markdownToHtml } = await import(${JSON.stringify(entry)});
  const result = await markdownToHtml('# WASM probe\\n\\n**works**');
  if (!result.html.includes('<h1>WASM probe</h1>') || !result.html.includes('<strong>works</strong>'))
    throw new Error('Real Markdown parser/renderer output mismatch');
  console.log(result.html);
`;
function probe(strict) {
  const env = { ...process.env };
  delete env.NAPI_RS_FORCE_WASI;
  if (strict) env.NAPI_RS_FORCE_WASI = 'error';
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', source],
    {
      cwd: site,
      env,
      encoding: 'utf8',
      timeout: 30_000,
    },
  );
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
const native = probe(false);
const strict = probe(true);
await mkdir(evidence, { recursive: true });
async function digest(path) {
  try {
    return createHash('sha256')
      .update(await readFile(join(site, path)))
      .digest('hex');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
const result = {
  commit: process.env.GITHUB_SHA ?? null,
  node: process.version,
  npm: spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim(),
  platform: process.platform,
  arch: process.arch,
  inputs: {
    manifest: await digest('package.json'),
    npmLock: await digest('package-lock.json'),
    bunLock: await digest('bun.lock'),
  },
  entry,
  loader,
  resolutions,
  inventory,
  native,
  strict,
};
await writeFile(
  join(evidence, `wasi-${mode}.json`),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(result, null, 2));
assert.equal(native.status, 0, 'Native Markdown rendering must pass');
if (mode === 'provisioned') {
  assert.equal(
    strict.status,
    0,
    'Explicitly provisioned WASI rendering must pass and exit',
  );
} else if (strict.status !== 0) {
  assert.match(strict.stderr, /WASI binding not found/);
  assert.equal(strict.signal, null, 'Missing WASI must fail cleanly, not hang');
} else {
  console.log('WASI is already resolvable from this native candidate');
}
