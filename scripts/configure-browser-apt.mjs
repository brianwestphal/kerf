// GitHub-hosted Ubuntu browser dependencies: bound HTTPS and skip the unused Microsoft feed.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourcePaths = [
  'etc/apt/apt-mirrors.txt',
  'etc/apt/sources.list',
  'etc/apt/sources.list.d/ubuntu.sources',
  'etc/apt/sources.list.d/microsoft-prod.list',
];
const settingsPath = 'etc/apt/apt.conf.d/zzzz-kerf-browser-downloads';
const settings =
  'Acquire::Retries "1";\nAcquire::http::Timeout "15";\nAcquire::https::Timeout "15";\n';
// KF-914KN1: some runner images point at a regional EC2 mirror
// (`<region>.ec2.archive.ubuntu.com`) over plain HTTP, which crawled past the
// install step's bound; it gets the same HTTPS archive as the Azure mirror.
const ubuntuUrl =
  /https?:\/\/(?:(?:azure\.|[a-z0-9-]+\.ec2\.)?archive|security)\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g;
// Playwright needs Ubuntu packages only. An outage on this optional runner
// feed can still abort apt-get update before any Ubuntu package is installed.
const microsoftNobleEntry =
  /^[\t ]*deb(?:-src)?[\t ]+(?:\[[^\]\r\n]*\][\t ]+)?https?:\/\/packages\.microsoft\.com\/ubuntu\/24\.04\/prod\/?[\t ]+noble(?=[\t \r\n]|$)[^\r\n]*/gm;
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
    const https = before
      .replaceAll(
        /https?:\/\/(?:azure\.|[a-z0-9-]+\.ec2\.)?archive\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g,
        'https://archive.ubuntu.com/ubuntu',
      )
      .replaceAll(
        /http:\/\/security\.ubuntu\.com\/ubuntu(?=[/\s]|$)/g,
        'https://security.ubuntu.com/ubuntu',
      );
    const content = path.endsWith('.list')
      ? https.replaceAll(microsoftNobleEntry, '# $&')
      : https;
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
