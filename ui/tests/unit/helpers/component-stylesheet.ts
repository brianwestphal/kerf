import { readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const componentRoot = resolve(import.meta.dirname, '../../../src/components');
let stylesheets: Promise<Map<string, string>> | undefined;

async function collect(directory: string, found: Map<string, string>) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path, found);
    else if (entry.isFile() && entry.name.endsWith('.css')) {
      if (found.has(entry.name))
        throw new Error(`Duplicate component stylesheet ${entry.name}`);
      found.set(entry.name, path);
    }
  }
  return found;
}

export async function componentStylesheet(file: string): Promise<string> {
  stylesheets ??= collect(componentRoot, new Map());
  const path = (await stylesheets).get(basename(file));
  if (!path) throw new Error(`Unknown component stylesheet ${file}`);
  return path;
}
