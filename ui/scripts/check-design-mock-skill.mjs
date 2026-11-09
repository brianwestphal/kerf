import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const uiRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(uiRoot, '..');
const skillPath = resolve(uiRoot, 'ai/design-mock/SKILL.md');
const skill = readFileSync(skillPath, 'utf8');
const paths = [
  'llms.txt',
  'ai/skill.md',
  'docs/interaction-conventions.md',
  'docs/component-selection.md',
  'ai/components/README.md',
  'docs/design/templates.md',
  'docs/design/templates/',
  'docs/design/sketch/README.md',
  'docs/design/sketch/coverage.md',
  'ai/design-mock/references/hs2-example.md',
];
for (const path of paths) {
  if (!existsSync(resolve(uiRoot, path)))
    throw new Error(`Missing installed design-mock reference: ${path}`);
  if (!skill.includes(path.replace('ai/design-mock/', ''))) {
    // The example is linked relative to the skill folder.
    if (
      path !== 'ai/design-mock/references/hs2-example.md' ||
      !skill.includes('references/hs2-example.md')
    )
      throw new Error(`Design-mock skill does not link ${path}`);
  }
}
const pkg = JSON.parse(readFileSync(resolve(uiRoot, 'package.json'), 'utf8'));
if (!pkg.files.includes('ai') || !pkg.files.includes('docs'))
  throw new Error(
    'Design-mock skill or its references are missing from the UI package files list',
  );
const claude = readFileSync(
  resolve(repoRoot, '.claude/skills/kerf-ui-design-mock/SKILL.md'),
  'utf8',
);
const codex = readFileSync(
  resolve(repoRoot, '.agents/skills/kerf-ui-design-mock/SKILL.md'),
  'utf8',
);
if (claude !== codex)
  throw new Error('Claude and Codex design-mock entry points differ');
if (!claude.includes('node_modules/@kerfjs/ui/ai/design-mock/SKILL.md'))
  throw new Error(
    'Design-mock entry point does not retrieve the installed skill',
  );
console.log(
  'Design-mock skill references and provider entry points are current.',
);
