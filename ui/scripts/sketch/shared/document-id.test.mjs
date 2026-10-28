import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { pinDocumentId, readDocumentId } from './document-id.mjs';

function archive(path, id) {
  execFileSync('python3', [
    '-c',
    'import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z:\n  z.writestr("document.json", json.dumps({"do_objectID": sys.argv[2], "pages": []}))\n  z.writestr("meta.json", "{}")',
    path,
    id,
  ]);
}

test('pins a staged library to the recorded or published document ID', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kerf-docid-'));
  try {
    const published = join(dir, 'Kerf-Lists.sketch');
    const staged = join(dir, '.staged.sketch');
    archive(published, 'PUBLISHED');
    archive(staged, 'RESAVED');
    assert.equal(await pinDocumentId(staged, {}, published), 'PUBLISHED');
    assert.equal(await readDocumentId(staged), 'PUBLISHED');
    archive(staged, 'RESAVED');
    assert.equal(
      await pinDocumentId(staged, { libraryDocumentId: 'FIRST' }, published),
      'FIRST',
    );
    assert.equal(await readDocumentId(staged), 'FIRST');
    archive(staged, 'NEW');
    assert.equal(await pinDocumentId(staged, {}, null), 'NEW');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
