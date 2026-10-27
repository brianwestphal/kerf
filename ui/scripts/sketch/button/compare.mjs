import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { defaultOutput } from './capture.mjs';

const { chromium } = createRequire(import.meta.url)('@playwright/test');
const root = resolve(process.argv[2] ?? defaultOutput);
const fixtures = JSON.parse(await readFile(root + '/fixtures.json', 'utf8'));
const rows = [];
for (const f of fixtures) {
  const source = (await readFile(`${root}/inputs/${f.id}.png`)).toString(
    'base64',
  );
  const sketch = (await readFile(`${root}/exports/${f.id}.png`)).toString(
    'base64',
  );
  rows.push(
    `<section style="background:${f.theme === 'light' ? '#fff' : '#111113'};color:${f.theme === 'light' ? '#111' : '#fff'}"><h3>${f.name}</h3><div><label>Browser<br><img src="data:image/png;base64,${source}"></label><label>Sketch<br><img src="data:image/png;base64,${sketch}"></label></div></section>`,
  );
}
const html = `<!doctype html><style>body{margin:0;font:14px system-ui;background:#ddd}section{padding:16px}h3{margin:0 0 12px}section>div{display:flex;gap:40px}label{width:280px}img{display:block;max-width:none;margin-top:8px}</style>${rows.join('')}`;
await writeFile(root + '/comparison.html', html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 680, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(pathToFileURL(root + '/comparison.html').href);
  await page
    .locator('img')
    .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await page.screenshot({ path: root + '/comparison.png', fullPage: true });
  const metrics = await page.locator('section').evaluateAll((sections) =>
    sections.map((s) => {
      const imgs = [...s.querySelectorAll('img')];
      const data = imgs.map((img) => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, c.width, c.height);
      });
      if (data[0].width !== data[1].width || data[0].height !== data[1].height)
        return {
          name: s.querySelector('h3').textContent,
          sizeMismatch: imgs.map((i) => [i.naturalWidth, i.naturalHeight]),
        };
      let error = 0,
        different = 0;
      for (let i = 0; i < data[0].data.length; i += 4) {
        let delta = 0;
        for (let j = 0; j < 4; j++)
          delta += Math.abs(data[0].data[i + j] - data[1].data[i + j]);
        error += delta;
        if (delta > 40) different++;
      }
      return {
        name: s.querySelector('h3').textContent,
        meanChannelError: error / data[0].data.length,
        differentPixelPercent:
          (100 * different) / (data[0].width * data[0].height),
      };
    }),
  );
  const mismatched = metrics.filter((entry) => entry.sizeMismatch);
  if (mismatched.length)
    throw new Error(
      `Browser/Sketch export dimensions differ: ${JSON.stringify(mismatched)}`,
    );
  await writeFile(root + '/comparison.json', JSON.stringify(metrics, null, 2));
  console.log(metrics);
} finally {
  await browser.close();
}
