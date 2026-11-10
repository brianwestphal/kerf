// GitHub-hosted Ubuntu browser dependencies: prefer HTTPS without changing repos.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePaths = [
  'etc/apt/apt-mirrors.txt',
  'etc/apt/sources.list',
  'etc/apt/sources.list.d/ubuntu.sources',
];
const settingsPath = 'etc/apt/apt.conf.d/zzzz-kerf-browser-downloads';
const settings =
  'Acquire::Retries "1";\nAcquire::http::Timeout "15";\nAcquire::https::Timeout "15";\n';
const ubuntuUrl =
  /https?:\/\/(?:(?:azure\.)?archive|security)\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g;
const activeUbuntuUrls = (content) =>
  content
    .split('\n')
    .flatMap((line) => line.split('#', 1)[0].match(ubuntuUrl) ?? []);

function readOptional(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

/** Configure real /etc in CI, or an isolated filesystem root in verification. */
export function configureBrowserApt(root = '/') {
  const sources = sourcePaths.flatMap((path) => {
    const before = readOptional(join(root, path));
    if (before === undefined) return [];
    const content = before
      .replaceAll(
        /https?:\/\/(?:azure\.)?archive\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g,
        'https://archive.ubuntu.com/ubuntu',
      )
      .replaceAll(
        /http:\/\/security\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g,
        'https://security.ubuntu.com/ubuntu',
      );
    return [{ path, content, changed: content !== before }];
  });
  if (!sources.some(({ content }) => activeUbuntuUrls(content).length))
    throw new Error(
      'No recognized Ubuntu APT sources found; inspect the runner configuration.',
    );
  for (const source of sources) {
    if (source.changed) writeFileSync(join(root, source.path), source.content);
  }
  const target = join(root, settingsPath);
  if (readOptional(target) !== settings) {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, settings, { mode: 0o644 });
  }
  return { sources, settingsPath, settings };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.length > 3)
    throw new Error('Usage: configure-browser-apt.mjs [filesystem-root]');
  const report = configureBrowserApt(process.argv[2]);
  console.log(
    JSON.stringify(
      {
        sources: report.sources.map(({ path, content, changed }) => ({
          path,
          changed,
          ubuntuUrls: [...new Set(activeUbuntuUrls(content))],
        })),
        settingsPath: report.settingsPath,
        settings: report.settings,
      },
      null,
      2,
    ),
  );
}
