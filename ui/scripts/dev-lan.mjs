// `npm run dev:lan`: the UX catalog dev server, reachable from other devices
// on the LAN or tailnet (for checks a desktop browser cannot make, such as a
// phone's virtual keyboard and safe areas). It binds every interface and
// allows Tailscale MagicDNS (*.ts.net) and mDNS (*.local) host names; the
// ordinary `npm run dev` stays bound to 127.0.0.1.
import { execFileSync, spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import process from 'node:process';

const port = 42817;
const route = '/?component=surface-scaffold';
/** IPv4 address → label, first label wins (Tailscale before plain LAN). */
const addresses = new Map();
try {
  for (const ip of execFileSync('tailscale', ['ip', '-4'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean))
    addresses.set(ip, '(Tailscale)');
} catch {
  // Tailscale is optional; LAN addresses below still work on the same network.
}
for (const entries of Object.values(networkInterfaces()))
  for (const entry of entries ?? [])
    if (entry.family === 'IPv4' && !entry.internal)
      addresses.add(entry.address);

console.log('[dev:lan] Open on another device:');
for (const [ip, label] of addresses) {
  console.log(`  http://${ip}:${String(port)}${route} ${label}`.trimEnd());
}

const vite = spawn(
  'npx',
  ['vite', '--config', 'ux-demo/vite.config.ts', '--host', '0.0.0.0'],
  { stdio: 'inherit', env: { ...process.env, KERF_UI_DEV_LAN: '1' } },
);
vite.on('exit', (code) => process.exit(code ?? 0));
