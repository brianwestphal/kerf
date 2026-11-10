// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import { configureBrowserApt } from '../../scripts/configure-browser-apt.mjs';

const roots: string[] = [];
const fixture = (files: Record<string, string>) => {
  const root = mkdtempSync(join(tmpdir(), 'kerf-browser-apt-'));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
};
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('browser dependency APT setup', () => {
  it('configures and bounds every canonical browser dependency install without changing its command', () => {
    let installs = 0;
    for (const file of [
      '.github/workflows/ci.yml',
      '.github/workflows/release-ui.yml',
    ]) {
      const workflow = YAML.parse(readFileSync(file, 'utf8'));
      for (const job of Object.values(workflow.jobs) as Array<{
        steps: Array<{ run?: string; 'timeout-minutes'?: number }>;
      }>) {
        for (const [index, step] of job.steps.entries()) {
          if (!step.run?.includes('playwright install --with-deps')) continue;
          installs += 1;
          expect(step.run).toMatch(/^npx playwright install --with-deps /);
          expect(step['timeout-minutes']).toBe(15);
          const setup = job.steps[index - 1];
          expect(setup.run).toContain(
            'sudo "$(command -v node)" "$GITHUB_WORKSPACE/scripts/configure-browser-apt.mjs"',
          );
          expect(setup.run).toContain(
            'apt-config dump Acquire::Retries Acquire::http::Timeout Acquire::https::Timeout',
          );
          expect(setup['timeout-minutes']).toBe(2);
        }
      }
    }
    expect(installs).toBe(6);
  });

  it('makes the actual mirror-list primary HTTPS while retaining priorities and fallbacks', () => {
    const root = fixture({
      'etc/apt/apt-mirrors.txt':
        'http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttp://security.ubuntu.com/ubuntu/\tpriority:3\n',
    });
    const result = configureBrowserApt(root);
    expect(readFileSync(join(root, 'etc/apt/apt-mirrors.txt'), 'utf8')).toBe(
      'https://archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n',
    );
    expect(result.sources[0].changed).toBe(true);
    expect(readFileSync(join(root, result.settingsPath), 'utf8')).toBe(
      'Acquire::Retries "1";\nAcquire::http::Timeout "15";\nAcquire::https::Timeout "15";\n',
    );
    expect(statSync(join(root, result.settingsPath)).mode & 0o777).toBe(0o644);
    const previous = statSync(join(root, result.settingsPath)).mtimeMs;
    expect(
      configureBrowserApt(root).sources.every((source) => !source.changed),
    ).toBe(true);
    expect(statSync(join(root, result.settingsPath)).mtimeMs).toBe(previous);
  });

  it('handles direct and deb822 URLs without changing suites, signing keys or unrelated repositories', () => {
    const root = fixture({
      'etc/apt/sources.list':
        'deb http://archive.ubuntu.com/ubuntu noble main\ndeb http://security.ubuntu.com/ubuntu noble-security main\ndeb https://packages.microsoft.com/ubuntu/24.04/prod noble main\n',
      'etc/apt/sources.list.d/ubuntu.sources':
        'Types: deb\nURIs: http://azure.archive.ubuntu.com/ubuntu/\nSuites: noble noble-updates\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n',
    });
    configureBrowserApt(root);
    expect(readFileSync(join(root, 'etc/apt/sources.list'), 'utf8')).toBe(
      'deb https://archive.ubuntu.com/ubuntu noble main\ndeb https://security.ubuntu.com/ubuntu noble-security main\ndeb https://packages.microsoft.com/ubuntu/24.04/prod noble main\n',
    );
    expect(
      readFileSync(join(root, 'etc/apt/sources.list.d/ubuntu.sources'), 'utf8'),
    ).toBe(
      'Types: deb\nURIs: https://archive.ubuntu.com/ubuntu/\nSuites: noble noble-updates\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n',
    );
  });

  it('preserves mirror+file routing and rejects unknown layouts before writing acquire configuration', () => {
    const root = fixture({
      'etc/apt/apt-mirrors.txt':
        'https://archive.ubuntu.com/ubuntu/\tpriority:1\n',
      'etc/apt/sources.list.d/ubuntu.sources':
        'URIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble\n',
    });
    expect(
      configureBrowserApt(root).sources.every((source) => !source.changed),
    ).toBe(true);
    const unknown = fixture({
      'etc/apt/sources.list':
        '# http://archive.ubuntu.com/ubuntu\ndeb http://archive.ubuntu.com.evil/ubuntu noble main\ndeb https://packages.microsoft.com/ubuntu/24.04/prod noble main # http://archive.ubuntu.com/ubuntu\n',
    });
    expect(() => configureBrowserApt(unknown)).toThrow(
      'No recognized Ubuntu APT sources',
    );
    expect(() =>
      readFileSync(
        join(unknown, 'etc/apt/apt.conf.d/zzzz-kerf-browser-downloads'),
      ),
    ).toThrow();
  });
});
