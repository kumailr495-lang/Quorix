const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('http://127.0.0.1:47821/index.html');
  const r = await p.evaluate((u) => window.run(u), ['http://127.0.0.1:47821/m/884bc33745f9bdafceb23b7aa6d44b37/clip.webm', 'http://127.0.0.1:47821/m/884bc33745f9bdafceb23b7aa6d44b37/clip.mkv', 'http://127.0.0.1:47821/m/884bc33745f9bdafceb23b7aa6d44b37/clip.mp4']); console.log(JSON.stringify(r, null, 1)); await b.close(); })();
