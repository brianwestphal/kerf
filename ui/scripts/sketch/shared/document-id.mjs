import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('./document-id.py', import.meta.url));

/** Read a Sketch archive's document ID, the identity consumers link to. */
export async function readDocumentId(path) {
  return (await exec('python3', [script, path])).stdout.trim();
}

/**
 * Sketch's staged SaveTo/Save gives the saved copy a new document ID, and
 * linked consumers follow a Library only while that ID stays the same. Pin
 * the staged library to the manifest's recorded ID (or the published file's
 * current ID when none is recorded yet) and return the ID it now carries.
 */
export async function pinDocumentId(staged, manifest, publishedPath) {
  const target =
    manifest.libraryDocumentId ??
    (publishedPath ? await readDocumentId(publishedPath) : null);
  if (target) await exec('python3', [script, staged, target]);
  return target ?? readDocumentId(staged);
}
