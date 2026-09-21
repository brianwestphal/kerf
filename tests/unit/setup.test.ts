import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  applyKerfSetup,
  formatSetupPlan,
  planKerfSetup,
} from '../../setup/index.mjs';

const roots: string[] = [];
async function fixture(manifest: object, files: Record<string, string> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kerf-setup-'));
  roots.push(root);
  await writeFile(join(root, 'package.json'), `${JSON.stringify(manifest)}\n`);
  for (const [path, source] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), source);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe('AI-first setup planner', () => {
  it('preserves JSONC comments, trailing commas, extends, and authored includes', async () => {
    const tsconfig = `{
  // Keep the shared base and its formatting.
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022", // a URL-like comment: https://example.test/a/*b*/
    "strict": true,
  },
  "include": ["src", "generated",],
}
`;
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': tsconfig },
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.conflicts).toEqual([]);
    await applyKerfSetup(plan, { install: false });
    const output = await readFile(join(root, 'tsconfig.json'), 'utf8');
    expect(output).toContain('// Keep the shared base and its formatting.');
    expect(output).toContain(
      '// a URL-like comment: https://example.test/a/*b*/',
    );
    expect(output).toContain('"extends": "./tsconfig.base.json"');
    expect(output).toContain('"include": ["src", "generated",],');
    expect(output).toContain('"moduleResolution": "Bundler"');
    expect(output).toMatch(/"jsxImportSource": "kerfjs",?\n\s*}/);
    expect(
      (await planKerfSetup({ root, version: '4.4.1' })).actions.find(
        ({ path }) => path === 'tsconfig.json',
      ),
    ).toBeUndefined();
  });

  it('upgrades state-managed JSONC fields without disturbing surrounding text', async () => {
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      {
        'tsconfig.json': `{
  "compilerOptions": {
    // Previous setup recommendation.
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs",
  },
  "include": ["src",],
}
`,
      },
    );
    const hash = createHash('sha256')
      .update(JSON.stringify('ES2020'), 'utf8')
      .digest('hex');
    await writeFile(
      join(root, '.kerf-ai-setup.json'),
      `${JSON.stringify({
        schemaVersion: 2,
        setupVersion: '4.3.0',
        packageManager: 'npm',
        packages: {
          '.': {
            mode: 'core',
            package: 'core-app',
            packagePath: '.',
            managed: {
              'tsconfig.json#compilerOptions.target': { sha256: hash },
            },
            resolutions: {},
          },
        },
      })}\n`,
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.conflicts).toEqual([]);
    await applyKerfSetup(plan, { install: false });
    const output = await readFile(join(root, 'tsconfig.json'), 'utf8');
    expect(output).toContain('// Previous setup recommendation.');
    expect(output).toContain('"target": "ES2022",');
    expect(output).toContain('"include": ["src",],');
  });

  it('requires explicit keep or kerf for a malformed JSONC compilerOptions container', async () => {
    const source = `{
  // This is authored, though structurally invalid for setup.
  "compilerOptions": [],
}
`;
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    const id = 'tsconfig.json#compilerOptions';
    expect((await planKerfSetup({ root, version: '4.4.1' })).conflicts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id })]),
    );
    const keep = await planKerfSetup({
      root,
      version: '4.4.1',
      resolutions: { [id]: 'keep' },
    });
    await applyKerfSetup(keep, { install: false });
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).toContain(
      '"compilerOptions": []',
    );
    const keptAgain = await planKerfSetup({ root, version: '4.4.1' });
    expect(keptAgain.conflicts).toEqual([]);
    expect(
      keptAgain.actions.find(({ path }) => path === 'tsconfig.json'),
    ).toBeUndefined();

    const kerfRoot = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    await applyKerfSetup(
      await planKerfSetup({
        root: kerfRoot,
        version: '4.4.1',
        resolutions: { [id]: 'kerf' },
      }),
      { install: false },
    );
    const replaced = await readFile(join(kerfRoot, 'tsconfig.json'), 'utf8');
    expect(replaced).toContain('// This is authored');
    expect(replaced).toContain('"compilerOptions": {');
    expect(replaced).toContain('"strict": true');
    expect(
      (await planKerfSetup({ root: kerfRoot, version: '4.4.1' })).actions.find(
        ({ path }) => path === 'tsconfig.json',
      ),
    ).toBeUndefined();
  });

  it('preserves JSONC around explicit field-level keep and kerf decisions', async () => {
    const source = `{
  "compilerOptions": {
    // Deliberate local policy.
    "strict": false,
  },
}
`;
    const id = 'tsconfig.json#compilerOptions.strict';
    const keepRoot = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    await applyKerfSetup(
      await planKerfSetup({
        root: keepRoot,
        version: '4.4.1',
        resolutions: { [id]: 'keep' },
      }),
      { install: false },
    );
    const kept = await readFile(join(keepRoot, 'tsconfig.json'), 'utf8');
    expect(kept).toContain('// Deliberate local policy.');
    expect(kept).toContain('"strict": false,');

    const kerfRoot = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    await applyKerfSetup(
      await planKerfSetup({
        root: kerfRoot,
        version: '4.4.1',
        resolutions: { [id]: 'kerf' },
      }),
      { install: false },
    );
    const replaced = await readFile(join(kerfRoot, 'tsconfig.json'), 'utf8');
    expect(replaced).toContain('// Deliberate local policy.');
    expect(replaced).toContain('"strict": true,');
  });

  it('preserves CRLF, block-comment tokens, escaped strings, and comment-only objects', async () => {
    const source = [
      '{',
      '  "compilerOptions": {',
      '    /* Deliberate tokens: } ] " // and an escaped-looking \\u007d. */',
      '  },',
      '  "note": "escaped \\" // /* text",',
      '}',
      '',
    ].join('\r\n');
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.conflicts).toEqual([]);
    await applyKerfSetup(plan, { install: false });
    const output = await readFile(join(root, 'tsconfig.json'), 'utf8');
    expect(output).toContain(
      '/* Deliberate tokens: } ] " // and an escaped-looking \\u007d. */',
    );
    expect(output).toContain('"note": "escaped \\" // /* text",');
    expect(output).toContain('"target": "ES2022"');
    expect(output.replaceAll('\r\n', '')).not.toContain('\n');
    expect(
      (await planKerfSetup({ root, version: '4.4.1' })).actions.find(
        ({ path }) => path === 'tsconfig.json',
      ),
    ).toBeUndefined();
  });

  it('fails closed on malformed JSONC without changing its bytes', async () => {
    const source = '{\n  /* unterminated\n  "compilerOptions": {}\n}\n';
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      'tsconfig.json is invalid JSONC',
    );
    expect(await readFile(join(root, 'tsconfig.json'), 'utf8')).toBe(source);
  });

  it('requires explicit keep or kerf when the JSONC root is not an object', async () => {
    const source = '/* authored root */\n["local",]\n';
    const id = 'tsconfig.json';
    const keepRoot = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    expect(
      (await planKerfSetup({ root: keepRoot, version: '4.4.1' })).conflicts,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    await applyKerfSetup(
      await planKerfSetup({
        root: keepRoot,
        version: '4.4.1',
        resolutions: { [id]: 'keep' },
      }),
      { install: false },
    );
    expect(await readFile(join(keepRoot, 'tsconfig.json'), 'utf8')).toBe(
      source,
    );
    expect(
      (await planKerfSetup({ root: keepRoot, version: '4.4.1' })).conflicts,
    ).toEqual([]);

    const kerfRoot = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'tsconfig.json': source },
    );
    await applyKerfSetup(
      await planKerfSetup({
        root: kerfRoot,
        version: '4.4.1',
        resolutions: { [id]: 'kerf' },
      }),
      { install: false },
    );
    expect(
      JSON.parse(await readFile(join(kerfRoot, 'tsconfig.json'), 'utf8')),
    ).toMatchObject({
      compilerOptions: { target: 'ES2022', strict: true },
      include: ['src'],
    });
    expect(
      (await planKerfSetup({ root: kerfRoot, version: '4.4.1' })).actions.find(
        ({ path }) => path === 'tsconfig.json',
      ),
    ).toBeUndefined();
  });

  it('redacts URL credentials exposed by JSONC value conflicts', async () => {
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      {
        'tsconfig.json': `{
  "compilerOptions": {
    "target": "https://alice:hunter2@example.test/target",
  },
}
`,
      },
    );
    const output = formatSetupPlan(
      await planKerfSetup({ root, version: '4.4.1' }),
    );
    expect(output).not.toContain('alice');
    expect(output).not.toContain('hunter2');
    expect(output).toContain('<redacted>');
  });

  it('plans, explicitly applies, preserves canonical append content, and becomes a no-op', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
    });
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.mode).toBe('core');
    expect(plan.conflicts).toEqual([]);
    expect(formatSetupPlan(plan)).toContain(
      'CREATE .claude/skills/kerf-app/SKILL.md',
    );
    await applyKerfSetup(plan, { install: false });
    const skillPath = join(root, '.claude/skills/kerf-app/SKILL.md');
    await writeFile(
      skillPath,
      `${await readFile(skillPath, 'utf8')}\nProject-owned guidance.\n`,
    );
    const preserve = await planKerfSetup({ root, version: '4.4.1' });
    expect(preserve.conflicts).toEqual([]);
    expect(
      preserve.actions.find(
        ({ path }) => path === '.claude/skills/kerf-app/SKILL.md',
      ),
    ).toBeUndefined();
    await applyKerfSetup(preserve, { install: false });
    expect(await readFile(skillPath, 'utf8')).toContain(
      'Project-owned guidance.',
    );
    const second = await planKerfSetup({ root, version: '4.4.1' });
    expect(second.actions).toEqual([]);
  });

  it('refuses forked canonical files and conflicting structural values', async () => {
    const root = await fixture(
      {
        name: 'core-app',
        dependencies: { kerfjs: '4.4.1' },
        scripts: { 'kerf:check': 'custom-check' },
      },
      {
        '.claude/skills/kerf-app/SKILL.md': 'hand-written without marker\n',
        'tsconfig.json': JSON.stringify({ compilerOptions: { strict: false } }),
      },
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.conflicts.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        '.claude/skills/kerf-app/SKILL.md',
        'package.json#scripts.kerf:check',
        'tsconfig.json#compilerOptions.strict',
      ]),
    );
    await expect(applyKerfSetup(plan, { install: false })).rejects.toThrow(
      'Resolve setup conflicts',
    );
  });

  it('detects UI source imports and emits package-qualified metadata discovery', async () => {
    const root = await fixture(
      { name: '@acme/app' },
      { 'src/main.ts': "import { Pane } from '@kerfjs/ui/pane';\n" },
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.mode).toBe('ui');
    expect(plan.conflicts).toEqual([]);
    await applyKerfSetup(plan, { install: false });
    const profile = JSON.parse(
      await readFile(join(root, '.kerf-ui-profile.json'), 'utf8'),
    );
    expect(profile.catalogs).toContainEqual({
      package: '@acme/app',
      composition: {
        path: './component-catalog-v2.json',
        schemaVersion: 2,
      },
    });
    expect(
      JSON.parse(await readFile(join(root, 'kerf.components.json'), 'utf8'))
        .components,
    ).toEqual([]);
  });

  it('discovers pnpm workspaces and requires an exact package selection', async () => {
    const root = await fixture(
      { name: 'workspace', private: true },
      {
        'pnpm-workspace.yaml': "packages:\n  - 'packages/*'\n",
        'packages/a/package.json': JSON.stringify({
          name: '@acme/a',
          dependencies: { kerfjs: '4.4.1' },
        }),
        'packages/b/package.json': JSON.stringify({
          name: '@acme/b',
          dependencies: { kerfjs: '4.4.1' },
        }),
      },
    );
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      'Multiple Kerf packages',
    );
    const plan = await planKerfSetup({
      root,
      package: '@acme/b',
      version: '4.4.1',
    });
    expect(plan.packageRoot).toBe(join(root, 'packages/b'));
    expect(
      plan.actions.some(({ path }) => path === 'packages/a/package.json'),
    ).toBe(false);
  });

  it('reports an installed/running version mismatch without rewriting', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.3.0' },
    });
    const installed = join(root, 'node_modules/kerfjs');
    await mkdir(installed, { recursive: true });
    await writeFile(
      join(installed, 'package.json'),
      JSON.stringify({ name: 'kerfjs', version: '4.3.0', main: 'index.js' }),
    );
    await writeFile(join(installed, 'index.js'), 'export {};\n');
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    expect(plan.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'kerfjs-version',
          message: expect.stringContaining('rerun with kerfjs@4.3.0'),
        }),
      ]),
    );
    const keep = await planKerfSetup({
      root,
      version: '4.4.1',
      resolutions: { 'kerfjs-version': 'keep' },
    });
    expect(keep.conflicts).toEqual([]);
    expect(
      JSON.parse(
        keep.actions.find(({ path }) => path === 'package.json')!.after,
      ).dependencies.kerfjs,
    ).toBe('4.3.0');
    const update = await planKerfSetup({
      root,
      version: '4.4.1',
      resolutions: { 'kerfjs-version': 'kerf' },
    });
    expect(update.conflicts).toEqual([]);
    expect(
      JSON.parse(
        update.actions.find(({ path }) => path === 'package.json')!.after,
      ).dependencies.kerfjs,
    ).toBe('4.4.1');
  });

  it('rolls back planned files and lockfiles when offline installation fails', async () => {
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      { 'package-lock.json': 'original-lock\n' },
    );
    const originalPackage = await readFile(join(root, 'package.json'), 'utf8');
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    await expect(
      applyKerfSetup(plan, {
        offline: true,
        runner: async (_command: string, args: string[]) => {
          expect(args).toContain('--offline');
          await writeFile(join(root, 'package-lock.json'), 'damaged\n');
          throw new Error('offline cache miss');
        },
      }),
    ).rejects.toThrow('offline cache miss');
    expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(
      originalPackage,
    );
    expect(await readFile(join(root, 'package-lock.json'), 'utf8')).toBe(
      'original-lock\n',
    );
    await expect(readFile(join(root, '.kerf-ai-setup.json'))).rejects.toThrow();
    expect((await readdir(root)).sort()).toEqual([
      'package-lock.json',
      'package.json',
    ]);
  });

  it('applies explicit keep and kerf resolutions and rejects unknown or stale choices', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
      scripts: { 'kerf:check': 'custom-check' },
    });
    const id = 'package.json#scripts.kerf:check';
    const keep = await planKerfSetup({
      root,
      version: '4.4.1',
      resolutions: { [id]: 'keep' },
    });
    expect(keep.conflicts).toEqual([]);
    await applyKerfSetup(keep, { install: false });
    expect(
      JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).scripts[
        id.split('.').at(-1)!
      ],
    ).toBe('custom-check');
    const remembered = await planKerfSetup({ root, version: '4.4.1' });
    expect(remembered.conflicts).toEqual([]);

    const kerfRoot = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
      scripts: { 'kerf:check': 'custom-check' },
    });
    const kerf = await planKerfSetup({
      root: kerfRoot,
      version: '4.4.1',
      resolutions: { [id]: 'kerf' },
    });
    await applyKerfSetup(kerf, { install: false });
    expect(
      JSON.parse(await readFile(join(kerfRoot, 'package.json'), 'utf8'))
        .scripts['kerf:check'],
    ).toBe('tsc --noEmit && eslint .');
    await expect(
      planKerfSetup({
        root: kerfRoot,
        version: '4.4.1',
        resolutions: { nope: 'keep' },
      }),
    ).rejects.toThrow('Unknown resolution id nope');
    await expect(
      planKerfSetup({
        root: kerfRoot,
        version: '4.4.1',
        resolutions: { [id]: 'kerf' },
      }),
    ).rejects.toThrow(`Stale resolution id ${id}`);
  });

  it('uses state hashes to upgrade unchanged recommendations and conflict on user edits', async () => {
    const root = await fixture({
      name: 'core-app',
    });
    const first = await planKerfSetup({ root, mode: 'core', version: '4.3.0' });
    await applyKerfSetup(first, { install: false });
    const upgrade = await planKerfSetup({ root, version: '4.4.1' });
    expect(upgrade.conflicts).toEqual([]);
    await applyKerfSetup(upgrade, { install: false });
    const upgraded = JSON.parse(
      await readFile(join(root, 'package.json'), 'utf8'),
    );
    expect(upgraded.dependencies.kerfjs).toBe('4.4.1');
    expect(upgraded.devDependencies['eslint-plugin-kerfjs']).toBe('4.4.1');

    upgraded.devDependencies['eslint-plugin-kerfjs'] = 'workspace:*';
    await writeFile(
      join(root, 'package.json'),
      `${JSON.stringify(upgraded)}\n`,
    );
    const customized = await planKerfSetup({ root, version: '4.5.0' });
    expect(customized.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'package.json#devDependencies.eslint-plugin-kerfjs',
        }),
      ]),
    );
  });

  it('renders bounded value changes without leaking absolute paths or secrets', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
      privateToken: 'do-not-print',
    });
    const output = formatSetupPlan(
      await planKerfSetup({ root, version: '4.4.1' }),
    );
    expect(output).toContain(
      '$.scripts.kerf:check: <missing> -> "tsc --noEmit && eslint ."',
    );
    expect(output).not.toContain(root);
    expect(output).not.toContain('do-not-print');
    expect(output.split('\n').length).toBeLessThan(180);
  });

  it('does not accept comments or strings as an installed ESLint preset', async () => {
    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      {
        'eslint.config.mjs': `// import kerfjs from 'eslint-plugin-kerfjs';\nconst note = "eslint-plugin-kerfjs";\nexport default [];\n`,
      },
    );
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    const action = plan.actions.find(
      ({ path }) => path === 'eslint.config.mjs',
    );
    expect(action?.after).toContain(
      "import kerfjs from 'eslint-plugin-kerfjs';",
    );
    expect(action?.after).toContain("kerfjs.configs['recommended']");
  });

  it('preserves canonical append content when kerf resolves a fork', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
    });
    await applyKerfSetup(await planKerfSetup({ root, version: '4.4.1' }), {
      install: false,
    });
    const path = join(root, '.claude/skills/kerf-app/SKILL.md');
    const source = await readFile(path, 'utf8');
    const marker =
      '<!-- KERF-APP-CANONICAL-END · your customizations below -->';
    await writeFile(
      path,
      `${source.replace('Kerf', 'Forked Kerf')}\nTeam appendix.\n`,
    );
    const plan = await planKerfSetup({
      root,
      version: '4.4.1',
      resolutions: { '.claude/skills/kerf-app/SKILL.md': 'kerf' },
    });
    await applyKerfSetup(plan, { install: false });
    const repaired = await readFile(path, 'utf8');
    expect(repaired).toContain(marker);
    expect(repaired).toContain('Team appendix.');
    expect(repaired).not.toContain('Forked Kerf');
  });

  it('keeps independent managed state for multiple workspace packages', async () => {
    const root = await fixture(
      { name: 'workspace', private: true, workspaces: ['packages/*'] },
      {
        'packages/a/package.json': JSON.stringify({
          name: '@acme/a',
          dependencies: { kerfjs: '^4.4.0' },
        }),
        'packages/b/package.json': JSON.stringify({
          name: '@acme/b',
          dependencies: { kerfjs: '^4.4.0' },
        }),
      },
    );
    for (const packageName of ['@acme/a', '@acme/b'])
      await applyKerfSetup(
        await planKerfSetup({ root, package: packageName, version: '4.4.1' }),
        { install: false },
      );
    const revisit = await planKerfSetup({
      root,
      package: '@acme/a',
      version: '4.4.1',
    });
    expect(revisit.conflicts).toEqual([]);
    expect(revisit.actions).toEqual([]);
    const state = JSON.parse(
      await readFile(join(root, '.kerf-ai-setup.json'), 'utf8'),
    );
    expect(Object.keys(state.packages).sort()).toEqual([
      'packages/a',
      'packages/b',
    ]);
  });

  it('rejects stale, escaped, symlinked, and concurrent apply plans', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
    });
    const stale = await planKerfSetup({ root, version: '4.4.1' });
    await writeFile(join(root, 'package.json'), '{"name":"changed"}\n');
    await expect(applyKerfSetup(stale, { install: false })).rejects.toThrow(
      'stale',
    );

    const freshRoot = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
    });
    const escaped = await planKerfSetup({ root: freshRoot, version: '4.4.1' });
    escaped.actions[0].absolutePath = join(tmpdir(), 'outside-setup-target');
    await expect(applyKerfSetup(escaped, { install: false })).rejects.toThrow(
      'escapes',
    );
    await mkdir(join(freshRoot, '.kerf-ai-setup.lock'));
    await expect(
      applyKerfSetup(
        await planKerfSetup({ root: freshRoot, version: '4.4.1' }),
        { install: false },
      ),
    ).rejects.toThrow('already applying');
    await rm(join(freshRoot, '.kerf-ai-setup.lock'), { recursive: true });

    const outside = await fixture({
      name: 'outside',
      dependencies: { kerfjs: '4.4.1' },
    });
    const workspace = await fixture(
      { name: 'workspace', workspaces: ['packages/escape'] },
      { 'packages/placeholder': '' },
    );
    await rm(join(workspace, 'packages/placeholder'));
    await symlink(outside, join(workspace, 'packages/escape'), 'dir');
    await expect(
      planKerfSetup({ root: workspace, version: '4.4.1' }),
    ).rejects.toThrow('symlink escapes');
  });

  it('requires the exact ESLint preset and emits valid CommonJS on explicit replacement', async () => {
    const uiRoot = await fixture(
      {
        name: '@acme/ui',
        dependencies: { kerfjs: '4.4.1', '@kerfjs/ui': '4.4.1' },
      },
      {
        'eslint.config.mjs':
          "import kerfjs from 'eslint-plugin-kerfjs';\nexport default [\n  kerfjs.configs['recommended'],\n];\n",
      },
    );
    const uiPlan = await planKerfSetup({ root: uiRoot, version: '4.4.1' });
    expect(
      uiPlan.actions.find(({ path }) => path === 'eslint.config.mjs')?.after,
    ).toContain("kerfjs.configs['recommended-ui']");

    const cjsRoot = await fixture(
      { name: 'core-cjs', dependencies: { kerfjs: '4.4.1' } },
      { 'eslint.config.cjs': 'module.exports = [];\n' },
    );
    const cjsPlan = await planKerfSetup({
      root: cjsRoot,
      version: '4.4.1',
      resolutions: { 'eslint.config.cjs': 'kerf' },
    });
    const output = cjsPlan.actions.find(
      ({ path }) => path === 'eslint.config.cjs',
    )?.after;
    expect(output).toContain('module.exports = (async () =>');
    expect(output).not.toContain('export default');
  });

  it('replaces resolved profile catalogs exactly and reports malformed state/profile', async () => {
    const root = await fixture(
      {
        name: '@acme/ui',
        dependencies: { kerfjs: '4.4.1', '@kerfjs/ui': '4.4.1' },
      },
      {
        '.kerf-ui-profile.json': JSON.stringify({
          schemaVersion: 1,
          scope: 'workspace',
          catalogs: [
            {
              package: '@acme/ui',
              composition: { path: './old.json', schemaVersion: 2 },
              extra: true,
            },
          ],
        }),
      },
    );
    const id = '.kerf-ui-profile.json#catalogs.@acme/ui';
    await applyKerfSetup(
      await planKerfSetup({
        root,
        version: '4.4.1',
        resolutions: { [id]: 'kerf' },
      }),
      { install: false },
    );
    expect((await planKerfSetup({ root, version: '4.4.1' })).actions).toEqual(
      [],
    );

    await writeFile(
      join(root, '.kerf-ai-setup.json'),
      '{"schemaVersion":99}\n',
    );
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      'Unsupported',
    );
    await rm(join(root, '.kerf-ai-setup.json'));
    await writeFile(join(root, '.kerf-ui-profile.json'), '{"catalogs":{}}\n');
    const malformed = await planKerfSetup({ root, version: '4.4.1' });
    expect(malformed.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '.kerf-ui-profile.json#catalogs' }),
      ]),
    );
  });

  it('redacts credential fields and URL userinfo in plans and conflicts', async () => {
    const root = await fixture({
      name: 'core-app',
      dependencies: { kerfjs: '4.4.1' },
      scripts: { 'kerf:check': 'https://alice:hunter2@example.test/task' },
      credentialToken: 'super-secret',
    });
    const output = formatSetupPlan(
      await planKerfSetup({ root, version: '4.4.1' }),
    );
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('super-secret');
    expect(output).toContain('<redacted>');
  });

  it('uses the declared package manager offline mode and restores generated output', async () => {
    const root = await fixture({
      name: '@acme/ui',
      packageManager: 'yarn@4.6.0',
      dependencies: { kerfjs: '4.4.1', '@kerfjs/ui': '4.4.1' },
    });
    const outputPath = join(root, 'component-catalog-v2.json');
    const outside = await fixture({ name: 'outside' });
    const outsidePath = join(outside, 'catalog.json');
    await writeFile(outsidePath, 'outside catalog\n');
    await writeFile(outputPath, 'original catalog\n');
    const plan = await planKerfSetup({ root, version: '4.4.1' });
    const calls: { command: string; args: string[]; cwd: string }[] = [];
    await expect(
      applyKerfSetup(plan, {
        offline: true,
        runner: async (
          command: string,
          args: string[],
          options: { cwd: string },
        ) => {
          calls.push({ command, args, cwd: options.cwd });
          if (args.includes('catalog:generate')) {
            await rm(outputPath);
            await symlink(outsidePath, outputPath);
            throw new Error('catalog failed after write');
          }
          return { stdout: '', stderr: '' };
        },
      }),
    ).rejects.toThrow('catalog failed after write');
    expect(calls[0]).toMatchObject({
      command: 'yarn',
      args: ['install', '--immutable-cache'],
      cwd: root,
    });
    expect(calls[1]).toMatchObject({
      command: 'yarn',
      args: ['run', 'catalog:generate'],
      cwd: root,
    });
    expect(await readFile(outputPath, 'utf8')).toBe('original catalog\n');
    expect(await readFile(outsidePath, 'utf8')).toBe('outside catalog\n');
    expect(await readdir(root)).not.toContain('.kerf-ai-setup.lock');
    expect(
      (await readdir(root)).some((name) => name.includes('.kerf-setup-')),
    ).toBe(false);
  });

  it('rejects an existing generated-catalog symlink before writes or generation', async () => {
    const root = await fixture({
      name: '@acme/ui',
      dependencies: { kerfjs: '4.4.1', '@kerfjs/ui': '4.4.1' },
    });
    const outside = await fixture({ name: 'outside' });
    const outsidePath = join(outside, 'catalog.json');
    await writeFile(outsidePath, 'outside catalog\n');
    await symlink(outsidePath, join(root, 'component-catalog-v2.json'));
    const originalManifest = await readFile(join(root, 'package.json'), 'utf8');

    await expect(
      applyKerfSetup(await planKerfSetup({ root, version: '4.4.1' }), {
        install: false,
      }),
    ).rejects.toThrow('symlinked generated catalog output');
    expect(await readFile(outsidePath, 'utf8')).toBe('outside catalog\n');
    expect(await readFile(join(root, 'package.json'), 'utf8')).toBe(
      originalManifest,
    );
  });

  it('rejects unsafe workspace patterns and corrupt persisted resolutions', async () => {
    const unsafe = await fixture({
      name: 'workspace',
      workspaces: ['../outside'],
    });
    await expect(
      planKerfSetup({ root: unsafe, mode: 'core', version: '4.4.1' }),
    ).rejects.toThrow('Unsafe workspace pattern');

    const root = await fixture(
      { name: 'core-app', dependencies: { kerfjs: '4.4.1' } },
      {
        '.kerf-ai-setup.json': JSON.stringify({
          schemaVersion: 2,
          setupVersion: '4.4.1',
          packageManager: 'npm',
          packages: {
            '.': {
              mode: 'core',
              package: 'core-app',
              packagePath: '.',
              managed: {},
              resolutions: { unsafe: 'overwrite' },
            },
          },
        }),
      },
    );
    await expect(planKerfSetup({ root, version: '4.4.1' })).rejects.toThrow(
      'Invalid persisted resolution',
    );
  });

  it('targets the selected package with the workspace package manager', async () => {
    const root = await fixture(
      {
        name: 'workspace',
        private: true,
        packageManager: 'pnpm@9.12.0',
        workspaces: ['packages/*'],
      },
      {
        'packages/app/package.json': JSON.stringify({
          name: '@acme/app',
          dependencies: { kerfjs: '4.4.1' },
        }),
      },
    );
    const plan = await planKerfSetup({
      root,
      package: '@acme/app',
      version: '4.4.1',
    });
    const calls: unknown[][] = [];
    await applyKerfSetup(plan, {
      offline: true,
      runner: async (...args: unknown[]) => {
        calls.push(args);
        return { stdout: '', stderr: '' };
      },
    });
    expect(calls).toEqual([
      [
        'pnpm',
        ['--filter', '@acme/app', 'install', '--offline'],
        { cwd: root },
      ],
    ]);
  });
});
