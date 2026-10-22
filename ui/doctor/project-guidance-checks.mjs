import { lstat, readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const DIRECT_FILES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.github/copilot-instructions.md',
];
const MAX_RULE_FILES = 64;
const MAX_FILE_BYTES = 256 * 1024;

// Look for a usable retrieval pointer, not a passing mention of the package.
const UI_GUIDANCE_POINTER =
  /(?:\$kerf-ui\b|(?:node_modules\/)?@kerfjs\/ui\/llms\.txt\b|(?:\.claude|\.agents|\.codex)\/skills\/kerf-ui(?:\/SKILL\.md)?\b)/;

async function regularFile(path) {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink()) throw new Error('Symlinked guidance file');
    return info.isFile() ? info : undefined;
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

/** Return an incomplete result rather than guess when a scan is unsafe or partial. */
export async function collectProjectGuidanceFiles(root, packageRoot = root) {
  const directories = [...new Set([root, packageRoot])];
  const files = [];
  try {
    for (const directory of directories) {
      for (const name of DIRECT_FILES) {
        const path = resolve(directory, name);
        const info = await regularFile(path);
        if (info) {
          if (info.size > MAX_FILE_BYTES) return { files: [], complete: false };
          files.push(path);
        }
      }
      const rulesDirectory = resolve(directory, '.cursor/rules');
      let rulesInfo;
      try {
        rulesInfo = await lstat(rulesDirectory);
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      if (!rulesInfo.isDirectory()) return { files: [], complete: false };
      const rules = await readdir(rulesDirectory, { withFileTypes: true });
      if (rules.length > MAX_RULE_FILES) return { files: [], complete: false };
      for (const entry of rules) {
        if (!entry.isFile() || !/\.mdc?$/.test(entry.name)) continue;
        const path = resolve(rulesDirectory, entry.name);
        const info = await regularFile(path);
        if (!info || info.size > MAX_FILE_BYTES)
          return { files: [], complete: false };
        files.push(path);
      }
    }
    return { files: files.sort(), complete: true };
  } catch {
    return { files: [], complete: false };
  }
}

export async function checkProjectGuidance(root, packageRoot = root) {
  const { files, complete } = await collectProjectGuidanceFiles(
    root,
    packageRoot,
  );
  if (!complete || !files.length) return [];
  try {
    for (const path of files)
      if (UI_GUIDANCE_POINTER.test(await readFile(path, 'utf8'))) return [];
  } catch {
    return [];
  }
  const locations = files.map((path) =>
    relative(root, path).replaceAll('\\', '/'),
  );
  return [
    {
      id: 'KUI-D041',
      severity: 'warning',
      stage: 'catalog',
      message:
        'Project instructions do not point to the installed Kerf UI retrieval order.',
      location: { file: locations[0], line: 1, column: 1 },
      evidence: { instructionFiles: locations },
      action:
        'Point project guidance to `.claude/skills/kerf-ui/SKILL.md` or `node_modules/@kerfjs/ui/llms.txt` before UI work.',
      documentation: '@kerfjs/ui/docs/ui-doctor.md#project-guidance-pointer',
      meaning: 'Project guidance omits the UI retrieval order',
    },
  ];
}
