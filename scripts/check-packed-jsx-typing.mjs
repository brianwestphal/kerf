import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = mkdtempSync(resolve(root, '.packed-jsx-typing-'));

try {
  const packOutput = execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        HUSKY: '0',
        npm_config_cache: join(temporary, 'npm-cache'),
      },
    },
  );
  const jsonStart = packOutput.indexOf('[\n  {');
  if (jsonStart < 0)
    throw new Error(`npm pack did not emit JSON: ${packOutput}`);
  const packed = JSON.parse(packOutput.slice(jsonStart));
  const tarball = join(temporary, packed[0].filename);
  const packageRoot = join(temporary, 'node_modules', 'kerfjs');
  mkdirSync(packageRoot, { recursive: true });
  execFileSync(
    'tar',
    ['-xzf', tarball, '-C', packageRoot, '--strip-components=1'],
    { stdio: 'inherit' },
  );

  const fixture = resolve(root, 'tests/dist/jsx-typing/consumer.tsx');
  const consumer = join(temporary, basename(fixture));
  copyFileSync(fixture, consumer);
  writeFileSync(
    join(temporary, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: true,
          skipLibCheck: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          jsxImportSource: 'kerfjs',
          types: [],
        },
        files: [basename(consumer)],
      },
      null,
      2,
    )}\n`,
  );

  execFileSync(
    process.execPath,
    [resolve(root, 'node_modules/typescript7/bin/tsc'), '-p', temporary],
    { cwd: root, stdio: 'inherit' },
  );
  const manifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8'),
  );
  console.log(
    `[check-packed-jsx-typing] OK — ${manifest.name}@${manifest.version} exports recursive JSXChildren declarations.`,
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
