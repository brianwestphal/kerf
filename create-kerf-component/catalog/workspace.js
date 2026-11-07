// Which packages the catalog command generates: the root package and every
// npm workspace package that declares `package.json#kerfComponentCatalog`.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export const CONFIG_KEY = 'kerfComponentCatalog';
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules']);

/** Every diagnostic a run found, thrown together. */
export class CatalogError extends Error {
  constructor(diagnostics) {
    super(diagnostics.join('\n'));
    this.name = 'CatalogError';
    this.diagnostics = diagnostics;
  }
}

/** Parse a JSON file, or record why it could not be read and return null. */
export function readJson(path, label, diagnostics) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    diagnostics.push(`${label}: ${error.message}`);
    return null;
  }
}

// A workspace pattern supports one `*` segment (`packages/*`), as npm does.
function expandWorkspace(root, pattern) {
  const normalized = pattern.replaceAll('/', sep);
  if (!normalized.includes('*')) return [resolve(root, normalized)];
  const star = normalized.indexOf('*');
  const parent = resolve(root, normalized.slice(0, star));
  const suffix = normalized.slice(star + 1);
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && !ignoredDirectories.has(entry.name),
    )
    .map((entry) => resolve(parent, entry.name + suffix))
    .filter((path) => existsSync(path) && statSync(path).isDirectory());
}

/** The configured package roots under `root`, sorted and deduplicated. */
export function configuredPackages(root, diagnostics) {
  const rootPackagePath = join(root, 'package.json');
  const rootPackage = readJson(rootPackagePath, rootPackagePath, diagnostics);
  if (!rootPackage) return [];
  const packages = rootPackage[CONFIG_KEY] ? [root] : [];
  const workspacePatterns = Array.isArray(rootPackage.workspaces)
    ? rootPackage.workspaces
    : (rootPackage.workspaces?.packages ?? []);
  for (const pattern of workspacePatterns) {
    for (const packageRoot of expandWorkspace(root, pattern)) {
      const packagePath = join(packageRoot, 'package.json');
      if (!existsSync(packagePath)) continue;
      const packageJson = readJson(packagePath, packagePath, diagnostics);
      if (packageJson?.[CONFIG_KEY]) packages.push(packageRoot);
    }
  }
  return [...new Set(packages)].sort();
}
