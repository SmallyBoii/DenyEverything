'use strict';
/*
 * End-to-end test: loads the real extension into a real (headless) Firefox and opens the
 * fixture pages in tests/fixtures, each of which imitates one kind of consent dialog.
 *
 *   npm install --no-save selenium-webdriver     (Firefox must be installed)
 *   node tests/e2e/run.js
 *
 * Environment: FIREFOX_BIN to point at a specific firefox.exe, HEADFUL=1 to watch it run.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Builder } = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');

const ROOT = path.resolve(__dirname, '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures');

function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(FIXTURES, path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, ''));
    if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readState(driver) {
  return JSON.parse(await driver.executeScript('return JSON.stringify(window.state)'));
}

async function waitFor(driver, pred, ms = 15000) {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) {
    try {
      last = await readState(driver);
      if (pred(last)) return last;
    } catch (e) {
      /* page still loading */
    }
    await sleep(250);
  }
  return last;
}

const tests = require('./cases.js');

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;

  const options = new firefox.Options();
  if (!process.env.HEADFUL) options.addArguments('-headless');
  if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();

  let failed = 0;
  try {
    await driver.installAddon(ROOT, true);
    await sleep(800);

    for (const t of tests) {
      let state;
      try {
        await driver.get(base + t.page);
        if (t.frame) {
          await driver.switchTo().frame(await driver.findElement({ css: '#cmp' }));
        }
        if (t.until) state = await waitFor(driver, t.until);
        else {
          await sleep(t.settle || 3000);
          state = await readState(driver);
        }
        t.check(state);
        console.log('  ok   ' + t.name);
      } catch (e) {
        failed++;
        console.log('  FAIL ' + t.name + '\n       ' + String(e.message).split('\n').join('\n       '));
        if (state) console.log('       state: ' + JSON.stringify(state));
      } finally {
        await driver.switchTo().defaultContent().catch(() => {});
      }
    }
  } finally {
    await driver.quit().catch(() => {});
    server.close();
  }

  console.log(failed ? `\n${failed} of ${tests.length} failed` : `\nall ${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
