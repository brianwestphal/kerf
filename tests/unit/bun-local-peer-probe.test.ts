// @vitest-environment node
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fileEvidence,
  peerEvidence,
  resolvePeerTypes,
} from '../../scripts/bun-local-peer-probe.mjs';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-peer-evidence-'));
  mkdirSync(join(root, 'site'), { recursive: true });
  writeFileSync(join(root, 'site/package.json'), '{"name":"consumer"}');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function packageAt(path: string, version: string, declaration?: string) {
  mkdirSync(path, { recursive: true });
  writeFileSync(
    join(path, 'package.json'),
    JSON.stringify({
      name: 'kerfjs',
      version,
      types: './dist/index.d.ts',
      exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      },
    }),
  );
  if (declaration !== undefined) {
    mkdirSync(join(path, 'dist'), { recursive: true });
    writeFileSync(join(path, 'dist/index.d.ts'), declaration);
  }
}

describe('local peer evidence (KF-0X25EY)', () => {
  it('identifies the actual ancestor declarations when a nearer snapshot lacks dist', () => {
    packageAt(root, '5.0.0', 'export declare const selector: string;');
    packageAt(join(root, 'site/node_modules/kerfjs'), '5.0.0');
    packageAt(
      join(root, 'node_modules/kerfjs'),
      '4.4.1',
      'export declare const signal: string;',
    );
    const peer = peerEvidence(root);
    expect(peer.installed.symlink).toBe(false);
    expect(peer.installed.declaration.exists).toBe(false);
    const resolved = resolvePeerTypes(root, ts);
    expect(resolved?.path).toBe('node_modules/kerfjs/dist/index.d.ts');
    expect(resolved?.declaration.bytes).toContain('signal');
    expect(resolved?.declaration.bytes).not.toContain('selector');
  });

  it('tracks live directory-link creation and atomic replacement, unlike a copied peer', () => {
    packageAt(root, '5.0.0', 'export declare const before: string;');
    mkdirSync(join(root, 'site/node_modules'), { recursive: true });
    cpSync(join(root, 'dist'), join(root, 'site/node_modules/copy/dist'), {
      recursive: true,
    });
    symlinkSync('../..', join(root, 'site/node_modules/kerfjs'));
    // The relative symlink is from site/node_modules, so root is two parents up.
    const first = peerEvidence(root);
    expect(first.installed.symlink).toBe(true);
    expect(first.installed.declaration.sha256).toBe(
      first.source.declaration.sha256,
    );
    writeFileSync(
      join(root, 'dist/new.d.ts'),
      'export declare const selector: string;',
    );
    renameSync(join(root, 'dist/new.d.ts'), join(root, 'dist/index.d.ts'));
    const next = peerEvidence(root);
    expect(next.installed.declaration.sha256).toBe(
      next.source.declaration.sha256,
    );
    expect(next.installed.declaration.sha256).not.toBe(
      first.installed.declaration.sha256,
    );
    expect(
      fileEvidence(join(root, 'site/node_modules/copy/dist/index.d.ts')).bytes,
    ).toContain('before');
    expect(resolvePeerTypes(root, ts)?.declaration.bytes).toContain('selector');
  });

  it('distinguishes missing data from package-export metadata rather than guessing a version', () => {
    expect(fileEvidence(join(root, 'missing'))).toEqual({ exists: false });
    expect(resolvePeerTypes(root, ts)).toBeNull();
    const peer = peerEvidence(root);
    expect(peer.installed.exists).toBe(false);
    expect(peer.installed.realpath).toBeNull();
    expect(peer.installed.symlink).toBeNull();
  });
});
