import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const GUIDANCE_PATHS = [
  'AGENTS.md',
  'CLAUDE.md',
  '.agents/skills/hotsheet/SKILL.md',
  '.claude/skills/hotsheet/SKILL.md',
];

async function readOrMissing(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export async function snapshotGuidance(root, paths = GUIDANCE_PATHS) {
  return new Map(
    await Promise.all(
      paths.map(async (path) => [
        path,
        await readOrMissing(resolve(root, path)),
      ]),
    ),
  );
}

export function changedGuidancePaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((path) => {
    const left = before.get(path);
    const right = after.get(path);
    if (left === null || left === undefined)
      return right !== null && right !== undefined;
    if (right === null || right === undefined) return true;
    return !left.equals(right);
  });
}
