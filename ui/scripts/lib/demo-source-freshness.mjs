import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.json', '.ts', '.tsx']);
const SOURCE_ROOTS = ['src', 'ux-demo'];

async function sourceFiles(root, directory) {
  const absolute = resolve(root, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(absolute, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(root, path)));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name)))
      files.push(relative(root, path));
  }
  return files;
}

export async function computeDemoSourceFreshness(root) {
  const files = (
    await Promise.all(
      SOURCE_ROOTS.map((directory) => sourceFiles(root, directory)),
    )
  )
    .flat()
    .sort();
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(path);
    hash.update('\0');
    hash.update(await readFile(resolve(root, path)));
    hash.update('\0');
  }
  return { schemaVersion: 1, sha256: hash.digest('hex'), files };
}
