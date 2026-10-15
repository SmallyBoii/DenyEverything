'use strict';
/*
 * Same cases as run.js, but for the userscript build: dist/deny-everything.user.js is injected into each
 * fixture page of plain headless Firefox (no extension), once WITHOUT the Greasemonkey API and once with a
 * small stand-in for GM_getValue / GM_setValue / GM_registerMenuCommand.
 *
 *   node tools/build-userscript ... (powershell -File tools/build-userscript.ps1)
 *   node tests/e2e/run-userscript.js
 *
 * Note: this checks the script's logic, not a particular userscript manager's sandbox.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures');
const script = fs.readFileSync(path.join(ROOT, 'dist', 'deny-everything.user.js'), 'utf8');
const tests = require('./cases.js');

const GM_STUB = `
  window.__gm = { store: {}, menu: [] };
  window.GM_getValue = (k, d) => (k in window.__gm.store ? window.__gm.store[k] : d);
  window.GM_setValue = (k, v) => { window.__gm.store[k] = v; };
  window.GM_registerMenuCommand = (name, fn) => { window.__gm.menu.push(name); };
`;

const server = http.createServer((req, res) => {
  const file = path.join(FIXTURES, path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, ''));
  if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(file));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readState = async (d) => JSON.parse(await d.executeScript('return JSON.stringify(window.state)'));

async function waitFor(d, pred, ms = 15000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await readState(d);
      if (pred(last)) return last;
    } catch (e) {}
    await sleep(250);
  }
  return last;
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const options = new firefox.Options().addArguments('-headless');
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();

  let failed = 0;
  try {
    for (const withGM of [false, true]) {
      console.log(withGM ? '\nwith a Greasemonkey API stand-in' : 'without any Greasemonkey API');
      for (const t of tests) {
        let state;
        try {
          await d.get(base + t.page);
          const injectInto = async () => d.executeScript((withGM ? GM_STUB : '') + script);
          if (t.frame) {
            await d.switchTo().frame(await d.findElement({ css: '#cmp' }));
          }
          await injectInto();
          state = t.until ? await waitFor(d, t.until) : (await sleep(t.settle || 3000), await readState(d));
          t.check(state);
          console.log('  ok   ' + t.name);
        } catch (e) {
          failed++;
          console.log('  FAIL ' + t.name + '\n       ' + String(e.message).split('\n').join('\n       '));
          if (state) console.log('       state: ' + JSON.stringify(state));
        } finally {
          await d.switchTo().defaultContent().catch(() => {});
        }
      }
    }

    // the menu entries are registered once, by the top page
    await d.get(base + 'generic.html');
    await d.executeScript(GM_STUB + script);
    const menu = await d.executeScript('return window.__gm.menu');
    console.log('\nmenu entries: ' + JSON.stringify(menu));
    if (menu.length !== 3) failed++;
  } finally {
    await d.quit().catch(() => {});
    server.close();
  }

  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
