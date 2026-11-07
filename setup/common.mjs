import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import process from 'node:process';

export const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const portable = (root, path) =>
  relative(root, path).replaceAll('\\', '/') || '.';
export const shellArg = (value) => `'${value.replaceAll("'", "'\\''")}'`;
export const contained = (root, path) => {
  const offset = relative(root, path);
  return (
    offset === '' ||
    (!offset.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
      offset !== '..' &&
      !isAbsolute(offset))
  );
};
export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
export const redactText = (value) =>
  String(value).replace(
    /([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+(?::[^\s/@]*)?@/gi,
    '$1<redacted>@',
  );
export const describeValue = (key, value) =>
  /token|secret|password|credential/i.test(key)
    ? '<redacted>'
    : redactText(JSON.stringify(value));

/** A file's text, or null when it does not exist; other read errors propagate. */
export async function readText(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Parses a file's JSON text (null stays null). Malformed JSON names the file,
 * relative to `root` when given: `<path> is invalid JSON: …`.
 */
export function parseJsonFile(source, path, root) {
  if (source === null) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(
      `${root ? portable(root, path) : path} is invalid JSON: ${error.message}`,
      { cause: error },
    );
  }
}

/** A file's parsed JSON, or null when it does not exist. */
export async function readJson(path, root) {
  return parseJsonFile(await readText(path), path, root);
}

export function dependencies(manifest) {
  return {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
  };
}
