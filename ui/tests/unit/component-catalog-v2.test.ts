import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ConsumerComponentCatalogV2 } from '../../ai/component-catalog-extension-v2.js';
import type { ComponentCatalogV2 } from '../../ai/component-catalog-v2.js';
import { validateCatalogV2 } from '../../scripts/component-catalog-v2-validation.mjs';

type InvalidFixture = {
  name: string;
  path: string;
  value?: unknown;
  copyFrom?: string;
  message: string;
};

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(resolve(import.meta.dirname, path), 'utf8')) as T;

const childAt = (value: unknown, part: string): unknown => {
  if (Array.isArray(value)) return value[Number(part)];
  return (value as Record<string, unknown>)[part];
};

const assignPath = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
  const parts = path.split('.');
  const key = parts.pop()!;
  let owner: unknown = target;
  for (const part of parts) owner = childAt(owner, part);
  if (Array.isArray(owner)) owner[Number(key)] = value;
  else (owner as Record<string, unknown>)[key] = value;
};

const readPath = (target: Record<string, unknown>, path: string) =>
  path.split('.').reduce<unknown>(childAt, target);

describe('component catalog v2 composition contract', () => {
  it('projects every live v1 entry with package-qualified identity and complete boundaries', async () => {
    const [v1, v2] = await Promise.all([
      readJson<{ package: string; entries: Array<{ id: string }> }>(
        '../../ai/component-catalog.json',
      ),
      readJson<ComponentCatalogV2>('../../ai/component-catalog-v2.json'),
    ]);
    expect(validateCatalogV2(v2, { v1 })).toEqual([]);
    expect(v2.entries).toHaveLength(v1.entries.length);
    expect(
      v2.entries.every((entry) => entry.key === `${entry.package}:${entry.id}`),
    ).toBe(true);
    expect(
      v2.entries.every(
        (entry) =>
          entry.parents &&
          entry.children &&
          entry.state &&
          entry.wiring &&
          entry.responsive &&
          entry.layout &&
          entry.accessibility &&
          entry.boundaries &&
          (entry.boundaries.rootClass === null ||
            entry.boundaries.publicClasses.includes(
              entry.boundaries.rootClass,
            )) &&
          entry.provenance,
      ),
    ).toBe(true);
  });

  it('keeps permissive defaults distinct from authoritative enforceable overrides', async () => {
    const v2 = await readJson<ComponentCatalogV2>(
      '../../ai/component-catalog-v2.json',
    );
    const toolbar = v2.entries.find((entry) => entry.id === 'toolbar')!;
    const icon = v2.entries.find((entry) => entry.id === 'lucide-icon')!;
    expect(toolbar).toMatchObject({
      children: {
        mode: 'listed',
        concepts: ['toolbar-text', 'toolbar-control-group'],
      },
      provenance: {
        composition: 'docs/component-selection.md#toolbar-composition',
      },
    });
    expect(toolbar.diagnostics[0].id).toBe('KUI-C101');
    expect(icon).toMatchObject({
      parents: { mode: 'any', entries: [] },
      provenance: { composition: 'generated-permissive-default' },
    });
    expect(icon.diagnostics).toEqual([]);
  });

  it('rejects adversarial invalid fixtures with stable actionable findings', async () => {
    const [v2, fixtures] = await Promise.all([
      readJson<ComponentCatalogV2>('../../ai/component-catalog-v2.json'),
      readJson<InvalidFixture[]>(
        '../fixtures/component-catalog-v2-invalid.json',
      ),
    ]);
    for (const fixture of fixtures) {
      const invalid = JSON.parse(JSON.stringify(v2)) as ComponentCatalogV2;
      const value = fixture.copyFrom
        ? readPath(
            invalid as unknown as Record<string, unknown>,
            fixture.copyFrom,
          )
        : fixture.value;
      assignPath(
        invalid as unknown as Record<string, unknown>,
        fixture.path,
        value,
      );
      expect(validateCatalogV2(invalid), fixture.name).toEqual(
        expect.arrayContaining([expect.stringContaining(fixture.message)]),
      );
    }
  });

  it('provides a package-qualified consumer v2 example without weakening Kerf identity', async () => {
    const consumer = await readJson<ComponentCatalogV2>(
      '../../docs/examples/component-catalog-extension-v2.json',
    );
    const typedConsumer: ConsumerComponentCatalogV2 = consumer;
    expect(validateCatalogV2(consumer)).toEqual([]);
    expect(typedConsumer.package).toBe('@acme/ui');
    expect(consumer.entries[0].key).toBe('@acme/ui:inspector');
    expect(consumer.entries[0].parents.entries).toContain('@kerfjs/ui:layout');
  });

  it('validates generated consumer selection and source metadata when present', async () => {
    const consumer = await readJson<ComponentCatalogV2>(
      '../../docs/examples/component-catalog-extension-v2.json',
    );
    const entry = consumer.entries[0];
    entry.purpose = 'Compose the record inspector.';
    entry.publicExports = [{ name: 'Inspector', subpath: './inspector' }];
    entry.sourceLinks = ['docs/inspector.md'];
    expect(validateCatalogV2(consumer)).toEqual([]);

    entry.purpose = '';
    entry.publicExports.push({ name: 'Inspector', subpath: './inspector' });
    entry.sourceLinks.push('docs/inspector.md');
    expect(validateCatalogV2(consumer)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('purpose must be a non-empty string'),
        expect.stringContaining('public exports must be unique'),
        expect.stringContaining('sourceLinks must be a unique string list'),
      ]),
    );
  });
});
