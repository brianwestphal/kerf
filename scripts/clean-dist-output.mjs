import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const BARE_CHUNK_IMPORT = /^(\s*)import\s+(['"])(\.\/chunk-[^'"]+\.js)\2;(?=\r?$)/gm;
const STATIC_CHUNK_REFERENCE = /\b(?:from\s+|import\s*)(['"])(\.\/chunk-[^'"]+\.js)\1/g;
const SOURCE_MAP_DIRECTIVE = /^(\s*)\/\/# sourceMappingURL=([^\r\n]+)(?=\r?$)/gm;

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(path);
    return entry.isFile() && entry.name.endsWith('.js') ? [path] : [];
  }));
  return nested.flat();
}

function chunkReferences(source) {
  return [...source.matchAll(STATIC_CHUNK_REFERENCE)].map((match) => match[2]);
}

function nonBareChunkReferences(source) {
  const withoutBareImports = source.replace(BARE_CHUNK_IMPORT, '');
  return chunkReferences(withoutBareImports);
}

function isReachable(target, roots, graph) {
  const pending = [...roots];
  const visited = new Set();
  while (pending.length > 0) {
    const next = pending.pop();
    if (next === target) return true;
    if (next === undefined || visited.has(next)) continue;
    visited.add(next);
    pending.push(...(graph.get(next) ?? []));
  }
  return false;
}

function blankMatch(match) {
  return match.replace(/[^\r\n]/g, '');
}

async function clean(directory) {
  const root = resolve(directory);
  const files = await javascriptFiles(root);
  const sources = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
  const graph = new Map();

  for (const [file, source] of sources) {
    const key = `./${relative(root, file)}`;
    graph.set(key, chunkReferences(source).map((reference) => `./${relative(root, resolve(dirname(file), reference))}`));
  }

  for (const [file, original] of sources) {
    const roots = nonBareChunkReferences(original).map((reference) => `./${relative(root, resolve(dirname(file), reference))}`);
    let source = original.replace(BARE_CHUNK_IMPORT, (statement, _space, _quote, reference) => {
      const target = `./${relative(root, resolve(dirname(file), reference))}`;
      if (!isReachable(target, roots, graph)) {
        throw new Error(`${relative(process.cwd(), file)} has a non-redundant bare chunk import: ${statement.trim()}`);
      }
      return blankMatch(statement);
    });

    const directives = [...source.matchAll(SOURCE_MAP_DIRECTIVE)];
    if (directives.length > 1) {
      const names = new Set(directives.map((match) => match[2]));
      if (names.size !== 1) {
        throw new Error(`${relative(process.cwd(), file)} has conflicting source-map directives`);
      }
      let remaining = directives.length - 1;
      source = source.replace(SOURCE_MAP_DIRECTIVE, (directive) => remaining-- > 0 ? blankMatch(directive) : directive);
    }

    if (source !== original) await writeFile(file, source);
  }

  console.log(`Cleaned ${files.length} JavaScript outputs in ${basename(root)}/`);
}

const directory = process.argv[2];
if (!directory) throw new Error('Usage: node scripts/clean-dist-output.mjs <dist-directory>');
await clean(directory);
