import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { expect, test } from 'vitest';

// Doctor's internal source checker has no public declaration contract.
// @ts-expect-error JavaScript-only internal module
import { checkComponentStyles } from '../../doctor/component-style-checks.mjs';

test('component style checks locate naming and cross-component selectors', async () => {
  const root = await mkdtemp(
    resolve(tmpdir(), 'kerf-doctor-component-styles-'),
  );
  try {
    await mkdir(resolve(root, 'src'));
    const files = [
      [
        'src/workspace-header.tsx',
        'export function WorkspaceHeader() { return <header class="wrong-root">Hi</header>; }',
      ],
      [
        'src/workspace-header.css',
        '.wrong-root { color: red; }\n.view-mode-switcher__content { color: blue; }',
      ],
      [
        'src/workspace-controls.tsx',
        'import "./workspace-controls.css"; export function ViewModeSwitcher() { return <button class="view-mode-switcher">Mode</button>; }',
      ],
      ['src/workspace-controls.css', '.view-mode-switcher { color: green; }'],
    ] as const;
    for (const [name, source] of files)
      await writeFile(resolve(root, name), source);
    const findings = await checkComponentStyles(
      root,
      files.map(([name]) => resolve(root, name)),
    );
    expect(
      findings.map(
        (item: { id: string; location: { file: string; line: number } }) =>
          `${item.id} ${item.location.file}:${item.location.line}`,
      ),
    ).toEqual([
      'KUI-D030 src/workspace-header.tsx:1',
      'KUI-D032 src/workspace-header.css:2',
      'KUI-D031 src/workspace-controls.css:1',
    ]);
    expect(
      (
        await checkComponentStyles(
          root,
          files.map(([name]) => resolve(root, name)),
          [],
          ['src/workspace-header.css'],
        )
      ).map((item: { id: string }) => item.id),
    ).toEqual(['KUI-D030', 'KUI-D032']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('matching component class and stylesheet stay clean after repair', async () => {
  const root = await mkdtemp(
    resolve(tmpdir(), 'kerf-doctor-component-styles-'),
  );
  try {
    const component = resolve(root, 'search-field.tsx');
    const style = resolve(root, 'search-field.css');
    await writeFile(
      component,
      'export const SearchField = () => <input className="search-field" />;',
    );
    await writeFile(
      style,
      '.search-field, .search-field__input { color: red; }',
    );
    expect(await checkComponentStyles(root, [component, style])).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a stylesheet cannot select a sibling component in the same module', async () => {
  const root = await mkdtemp(
    resolve(tmpdir(), 'kerf-doctor-component-styles-'),
  );
  try {
    const component = resolve(root, 'workspace-header.tsx');
    const style = resolve(root, 'workspace-header.css');
    await writeFile(
      component,
      'export const WorkspaceHeader = () => <header class="workspace-header" />; export const ViewModeSwitcher = () => <button class="view-mode-switcher" />;',
    );
    await writeFile(style, '.view-mode-switcher__content { color: red; }');
    expect(
      (await checkComponentStyles(root, [component, style])).map(
        (item: { id: string }) => item.id,
      ),
    ).toEqual(['KUI-D032']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
