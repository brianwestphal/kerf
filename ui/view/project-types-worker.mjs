/**
 * The worker thread `editorFileMiddleware` runs the project-type service in
 * (KF-EQFF9K: TypeScript's synchronous work used to block the dev or preview
 * server's event loop, so a Play page waited up to a second behind an
 * analysis). One worker per middleware root owns one service; each message
 * is one validated `analyze` or `validate` request.
 *
 * Message in: `{ id, body }`. Reply: `{ id, result }`, or `{ id, error }`
 * with the message of a request the service rejects.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';

import { applicationCatalogs } from '../vite-editor.mjs';
import { createViewCatalog } from './catalog.mjs';
import { createProjectTypeService } from './project-types.mjs';

const { root } = workerData;
const readJson = (url) => JSON.parse(readFileSync(fileURLToPath(url), 'utf8'));

let service;
/** Kerf UI's catalogs plus the application's, read afresh per request. */
const typeCatalog = () => {
  const app = applicationCatalogs(root);
  return createViewCatalog({
    props: [
      readJson(new URL('../ai/component-props.json', import.meta.url)),
      ...app.props,
    ],
    composition: [
      readJson(new URL('../ai/component-composition.json', import.meta.url)),
      ...app.composition,
    ],
  });
};

parentPort.on('message', ({ id, body }) => {
  try {
    service ??= createProjectTypeService(root);
    const result =
      body.action === 'analyze'
        ? service.analyze({
            ...body,
            ...(body.declared ? { catalog: typeCatalog() } : {}),
          })
        : service.validateDocument(body.document, typeCatalog(), body.source);
    parentPort.postMessage({ id, result });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
