// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  assertInputBoundary,
  assertMarkdownResults,
  inputHashes,
  installedGraph,
  packageLocation,
  provisioningAttempts,
} from '../../scripts/bun-pure-wasi-probe.mjs';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-bun-graph-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function pkg(path: string, manifest: Record<string, unknown>) {
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify(manifest));
}

describe('pure Bun evidence boundaries (KF-AT2EEZ)', () => {
  it('inventories hidden package metadata, nested edges, and symlinked storage', () => {
    pkg(root, { name: 'fixture', version: '1.0.0' });
    const loader = join(root, 'node_modules/satteri');
    const hidden = join(loader, 'node_modules/@emnapi/core');
    pkg(loader, {
      name: 'satteri',
      version: '0.10.5',
      dependencies: { '@emnapi/core': '1.11.1' },
    });
    pkg(hidden, {
      name: '@emnapi/core',
      version: '1.11.1',
      exports: { '.': './index.js' },
    });
    writeFileSync(join(hidden, 'index.js'), '');
    symlinkSync('satteri', join(root, 'node_modules/satteri-alias'));
    expect(packageLocation(join(loader, 'package.json'), '@emnapi/core')).toBe(
      join(hidden, 'package.json'),
    );
    expect(packageLocation(join(loader, 'package.json'), 'missing')).toBeNull();
    const graph = installedGraph(root);
    expect(graph.nodes.map((node) => node.manifest.name).sort()).toEqual([
      '@emnapi/core',
      'satteri',
    ]);
    expect(
      graph.nodes.find((node) => node.manifest.name === 'satteri')?.edges,
    ).toEqual([
      {
        name: '@emnapi/core',
        range: '1.11.1',
        target: 'node_modules/satteri/node_modules/@emnapi/core',
      },
    ]);
    expect(graph.links).toContainEqual({
      path: 'node_modules/satteri-alias',
      target: 'node_modules/satteri',
    });
  });

  it('records an empty graph before installation and immutable input digests', () => {
    expect(installedGraph(root)).toEqual({ nodes: [], links: [] });
    writeFileSync(join(root, 'package.json'), '{}');
    const hashes = inputHashes(root);
    expect(hashes['package.json']).toMatch(/^[a-f0-9]{64}$/);
    expect(hashes['package-lock.json']).toBeNull();
    expect(hashes['bun.lock']).toBeNull();
  });

  it('permits only explicit fixture manifest/Bun-lock changes, never canonical npm-lock changes', () => {
    const before = {
      'package.json': 'manifest',
      'package-lock.json': 'npm',
      'bun.lock': 'bun',
    };
    const frozen = provisioningAttempts[0];
    expect(() => assertInputBoundary(before, before, frozen)).not.toThrow();
    expect(() =>
      assertInputBoundary(before, { ...before, 'bun.lock': 'changed' }, frozen),
    ).toThrow('Frozen Bun lock');
    expect(() =>
      assertInputBoundary(
        before,
        { ...before, 'package.json': 'changed' },
        frozen,
      ),
    ).toThrow('Unexpected manifest');
    const direct = provisioningAttempts.find(
      (attempt) => attempt.name === 'direct-platform',
    )!;
    expect(() =>
      assertInputBoundary(
        before,
        { ...before, 'package.json': 'changed', 'bun.lock': 'changed' },
        direct,
      ),
    ).not.toThrow();
    expect(() =>
      assertInputBoundary(
        before,
        { ...before, 'package-lock.json': 'changed' },
        direct,
      ),
    ).toThrow('Canonical npm lock');
  });

  it('rejects native failure, strict hangs/signals, and unrelated strict failures', () => {
    const passed = {
      status: 0,
      signal: null,
      error: null,
      stdout: '<h1>WASM probe</h1>',
      stderr: '',
    };
    const missing = { ...passed, status: 1, stderr: 'WASI binding not found' };
    expect(() =>
      assertMarkdownResults({ native: passed, strict: missing }),
    ).not.toThrow();
    expect(() =>
      assertMarkdownResults({ native: passed, strict: passed }),
    ).not.toThrow();
    expect(() =>
      assertMarkdownResults({ native: missing, strict: missing }),
    ).toThrow('Native Markdown');
    expect(() =>
      assertMarkdownResults({
        native: passed,
        strict: { ...missing, signal: 'SIGTERM' },
      }),
    ).toThrow('killed or hung');
    expect(() =>
      assertMarkdownResults({
        native: passed,
        strict: { ...missing, error: 'ETIMEDOUT' },
      }),
    ).toThrow('exit cleanly');
    expect(() =>
      assertMarkdownResults({
        native: passed,
        strict: { ...missing, stderr: 'different failure' },
      }),
    ).toThrow();
  });

  it('uses Bun-only supported selectors and direct provisioning without force-platform bypasses or peers', () => {
    expect(provisioningAttempts.map((attempt) => attempt.name)).toContain(
      'unsupported-wasm32',
    );
    expect(
      provisioningAttempts
        .filter((attempt) => attempt.manifestChangeAllowed)
        .map((attempt) => attempt.name),
    ).toEqual(['direct-platform']);
    for (const attempt of provisioningAttempts) {
      expect(['install', 'add']).toContain(attempt.args[0]);
      expect(attempt.args).toContain('--ignore-scripts');
      expect(attempt.args).not.toContain('--global');
      expect(attempt.args).not.toContain('--no-verify');
      expect(attempt.args).not.toContain('--peer');
    }
  });
});
