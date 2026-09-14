import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outputPath = resolve(root, 'ai/public-api-signatures-v1.md');
const webAwesomeOutputPath = resolve(root, 'ai/webawesome-jsx-signatures-v1.md');
const check = process.argv.includes('--check');
const entries = [
  ['@kerfjs/ui/disclosure-arrow', 'dist/disclosure-arrow.d.ts'],
  ['@kerfjs/ui/toolbar', 'dist/toolbar.d.ts'],
  ['@kerfjs/ui/toolbar-text', 'dist/toolbar-text.d.ts'],
  ['@kerfjs/ui/toolbar-control-group', 'dist/toolbar-control-group.d.ts'],
  ['@kerfjs/ui/menu-header', 'dist/menu-header.d.ts'],
  ['@kerfjs/ui/menu-item', 'dist/menu-item.d.ts'],
  ['@kerfjs/ui/page-header', 'dist/page-header.d.ts'],
  ['@kerfjs/ui/value-table', 'dist/value-table.d.ts'],
  ['@kerfjs/ui/resizable-region', 'dist/resizable-region.d.ts'],
  ['@kerfjs/ui/wire-resizable-regions', 'dist/wire-resizable-regions.d.ts'],
  ['@kerfjs/ui/segmented-control', 'dist/segmented-control.d.ts'],
  ['@kerfjs/ui/state-banner', 'dist/state-banner.d.ts'],
  ['@kerfjs/ui/empty-state', 'dist/empty-state.d.ts'],
  ['@kerfjs/ui/loading-spinner', 'dist/loading-spinner.d.ts'],
  ['@kerfjs/ui/token-search-field', 'dist/token-search-field.d.ts'],
  ['kerfjs/actions', 'node_modules/kerfjs/dist/actions.d.ts'],
];
const uiPackage = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const kerfPackage = JSON.parse(await readFile(resolve(root, 'node_modules/kerfjs/package.json'), 'utf8'));
const sections = [];
for (const [specifier, path] of entries) {
  const declaration = await readFile(resolve(root, path), 'utf8');
  sections.push(`## \`${specifier}\`\n\n\`\`\`ts\n${declaration.trim()}\n\`\`\``);
}
const body = `# Public API signatures for the UI authoring corpus\n\n`+
  `Generated from emitted declarations for \`@kerfjs/ui@${uiPackage.version}\` and `+
  `\`kerfjs@${kerfPackage.version}\`. This bounded reference covers only APIs used by `+
  `the seven-task corpus. It is interface evidence, not an implementation or runtime guarantee.\n\n`+
  `${sections.join('\n\n')}\n`;
const digest = createHash('sha256').update(body).digest('hex');
const webAwesomeDeclaration = await readFile(resolve(root, 'dist/webawesome.d.ts'), 'utf8');
const webAwesomeBody = `# Web Awesome JSX signatures for the UI authoring corpus\n\n`+
  `Generated from the emitted \`@kerfjs/ui@${uiPackage.version}\` declaration boundary. `+
  `Import \`@kerfjs/ui/webawesome\` for type effects when authoring direct \`wa-*\` JSX. `+
  `The module emits no runtime behavior and does not register custom elements.\n\n`+
  `\`\`\`ts\n${webAwesomeDeclaration.trim()}\n\`\`\`\n`;
const webAwesomeDigest = createHash('sha256').update(webAwesomeBody).digest('hex');
if (check) {
  const [existing, existingWebAwesome] = await Promise.all([
    readFile(outputPath, 'utf8'),
    readFile(webAwesomeOutputPath, 'utf8'),
  ]);
  if (existing !== body) throw new Error('ai/public-api-signatures-v1.md is stale; run npm run ai:signatures:sync');
  if (existingWebAwesome !== webAwesomeBody) throw new Error('ai/webawesome-jsx-signatures-v1.md is stale; run npm run ai:signatures:sync');
  console.log(`[sync-ai-public-signatures] OK — ${entries.length} pinned API subpaths (${digest}) and Web Awesome JSX declarations (${webAwesomeDigest})`);
} else {
  await Promise.all([
    writeFile(outputPath, body),
    writeFile(webAwesomeOutputPath, webAwesomeBody),
  ]);
  console.log(`[sync-ai-public-signatures] wrote API (${digest}) and Web Awesome JSX (${webAwesomeDigest}) signature contexts`);
}
