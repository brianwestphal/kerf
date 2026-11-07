// The shared argument contract for every @kerfjs/ui bin (KF-FSCXYT: uniform
// --help; KF-7NZM4K: missing values and unknown flags are usage errors, and
// file problems name the file). Each bin prints its usage and exits 0 on
// --help / -h without doing any work, and reports a usage or input error as
// `<bin>: <message>` with exit status 2.
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/** Exit status for a usage, configuration, or input-file error. */
export const CLI_USAGE_EXIT = 2;

/** True when `--help` or `-h` appears anywhere in `argv`. */
export function wantsHelp(argv) {
  return argv.includes('--help') || argv.includes('-h');
}

/**
 * Parses `argv` against a declared option set and throws on anything else.
 *
 * - `values` maps a flag that takes a value to its option key.
 * - `repeatable` lists value flags that may repeat (collected into arrays).
 * - `flags` maps a boolean flag to its option key.
 * - `positionals` allows bare arguments (returned in order); otherwise a bare
 *   argument is an unknown argument.
 */
export function parseCliArguments(
  argv,
  { values = {}, repeatable = [], flags = {}, positionals = false } = {},
) {
  const options = {};
  for (const flag of repeatable) options[values[flag]] = [];
  const bare = [];
  const unknown = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (Object.hasOwn(values, argument)) {
      const value = argv[index + 1];
      if (value === undefined || value === '' || value.startsWith('--'))
        throw new Error(`${argument} requires a value.`);
      index += 1;
      const key = values[argument];
      if (repeatable.includes(argument)) options[key].push(value);
      else options[key] = value;
    } else if (Object.hasOwn(flags, argument)) {
      options[flags[argument]] = true;
    } else if (!argument.startsWith('-') && positionals) {
      bare.push(argument);
    } else {
      unknown.push(argument);
    }
  }
  if (unknown.length)
    throw new Error(`Unknown arguments: ${unknown.join(' ')}`);
  return { options, positionals: bare };
}

/**
 * Reads and parses a JSON file, naming the file in every failure:
 * `<path>: file not found`, `<path>: invalid JSON: …`, or `<path>: <reason>`.
 */
export function readJsonFile(path, label = path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    throw new Error(
      error?.code === 'ENOENT'
        ? `${label}: file not found`
        : `${label}: ${error?.message ?? String(error)}`,
      { cause: error },
    );
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error.message}`, {
      cause: error,
    });
  }
}

/**
 * True when the module at `moduleUrl` is the process entry point. npm runs
 * bins through `node_modules/.bin` symlinks, so both sides are real paths.
 */
export function isMainModule(moduleUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      realpathSync(resolve(entry)) === realpathSync(fileURLToPath(moduleUrl))
    );
  } catch {
    return false;
  }
}
