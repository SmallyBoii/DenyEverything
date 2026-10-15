'use strict';

const $ = (id) => document.getElementById(id);
let tab = null;
let host = '';

async function load() {
  [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const info = await browser.runtime.sendMessage({ type: 'popup:get', tabId: tab.id, url: tab.url });
  host = info.host;
  render(info);
}

function render(info) {
  const canRun = !!info.host && /^https?:/.test(tab.url || '');
  $('siteLabel').textContent = canRun ? info.host : 'This page';
  $('site').checked = canRun && info.siteEnabled;
  $('site').disabled = !canRun;
  $('all').checked = info.enabled;
  $('debug').checked = info.debug;

  const big = $('big');
  const small = $('small');
  big.className = 'big';

  if (!canRun) {
    big.textContent = 'Not active on this page';
    small.textContent = 'Browser pages and add-on stores are off limits to extensions.';
  } else if (!info.enabled) {
    big.textContent = 'Switched off everywhere';
    small.textContent = 'Banners will be left alone.';
  } else if (!info.siteEnabled) {
    big.textContent = 'Switched off on this site';
    small.textContent = 'Banners here will be left alone.';
  } else if (info.stats.dialogs > 0) {
    big.classList.add('ok');
    big.textContent = info.stats.dialogs === 1 ? '1 banner denied' : info.stats.dialogs + ' banners denied';
    const via = info.stats.cmps.length ? ' (' + info.stats.cmps.join(', ') + ')' : '';
    small.textContent = info.stats.toggles + ' switches turned off' + via;
  } else if (info.stats.stuck > 0) {
    big.classList.add('warn');
    big.textContent = 'A banner could not be fully denied';
    small.textContent = (info.stats.toggles ? info.stats.toggles + ' switches turned off, but ' : '') + 'it insists on something (often "consent or pay"). Nothing was accepted.';
  } else {
    big.textContent = 'Watching this page';
    small.textContent = 'No consent banner seen yet.';
  }

  $('total').textContent = info.total ? info.total + ' denied in total' : '';
}

async function save(change) {
  await browser.runtime.sendMessage(Object.assign({ type: 'popup:set', host }, change));
  $('reload').hidden = false;
  const info = await browser.runtime.sendMessage({ type: 'popup:get', tabId: tab.id, url: tab.url });
  render(info);
}

$('site').addEventListener('change', (e) => save({ siteEnabled: e.target.checked }));
$('all').addEventListener('change', (e) => save({ enabled: e.target.checked }));
$('debug').addEventListener('change', (e) => save({ debug: e.target.checked }));
$('reload').addEventListener('click', async () => {
  await browser.tabs.reload(tab.id);
  window.close();
});

load();
