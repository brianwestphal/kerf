// The editor's local server addresses, in one place (KF-5MVBPB: the ports
// were repeated across the Vite, preview, fixture, and Playwright configs).
// Bound to IPv4 explicitly: on Linux CI `localhost` can resolve to ::1 only,
// which Playwright's 127.0.0.1 readiness probe never reaches.

export const HOST = '127.0.0.1';

/** The private editor app's dev and preview server. */
export const EDITOR_PORT = 42917;

/** The fixture application hosting the editor through `@kerfjs/ui/vite-editor`. */
export const FIXTURE_APP_PORT = 42918;

export const EDITOR_URL = `http://${HOST}:${EDITOR_PORT}`;
export const FIXTURE_EDITOR_URL = `http://${HOST}:${FIXTURE_APP_PORT}/__kerf-ui-editor/`;
