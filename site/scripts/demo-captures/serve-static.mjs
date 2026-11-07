#!/usr/bin/env node
// Minimal static file server for capture-demos.sh.
//
//   node serve-static.mjs <root> <port-file>
//
// Binds 127.0.0.1 on an OS-assigned free port, then writes that port number
// to <port-file>. The capture script waits for the file, so it always talks
// to this server and never to something else already listening on a fixed
// port. Uses only Node built-ins, so a capture run downloads nothing.
//
// A path that names a directory serves its index.html (the built apps are
// reached at /<name>/). Requests are confined to <root>.

import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const [rootArg, portFile] = process.argv.slice(2);
if (!rootArg || !portFile) {
  console.error('usage: serve-static.mjs <root> <port-file>');
  process.exit(2);
}
const root = resolve(rootArg);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const candidate = resolve(join(root, decoded));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  try {
    const stat = statSync(candidate);
    if (stat.isDirectory()) {
      const index = join(candidate, 'index.html');
      return statSync(index).isFile() ? index : null;
    }
    return stat.isFile() ? candidate : null;
  } catch {
    return null;
  }
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const file = resolveFile(pathname);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(0, '127.0.0.1', () => {
  writeFileSync(portFile, String(server.address().port));
});
