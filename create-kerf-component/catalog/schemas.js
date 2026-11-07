// The three JSON schemas the catalog command validates against. They ship
// beside the command's entry file — the package root here, `scripts/` in a
// scaffolded package — one directory above these modules.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const schemaRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const readSchema = (name) =>
  JSON.parse(readFileSync(join(schemaRoot, name), 'utf8'));

/** The author metadata (`kerf.components.json`) schema. */
export const metadataSchema = readSchema('component-metadata.schema.json');
/** The generated composition catalog schema. */
export const catalogSchema = readSchema('component-composition.schema.json');
/** The generated selection-catalog extension schema. */
export const selectionSchema = readSchema(
  'component-catalog-extension.schema.json',
);
