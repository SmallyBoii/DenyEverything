/*
 * Deny Everything - background page.
 *
 * Keeps three things: the on/off switches, a per-tab count shown on the toolbar icon, and a
 * running total. Everything stays on this computer (browser.storage); nothing is ever sent anywhere.
 */
'use strict';

const DEFAULTS = { enabled: true, disabledHosts: [], total: 0, debug: false };

const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
};

const settings = () => browser.storage.local.get(DEFAULTS);

async function tabStats(tabId) {
  const key = 'tab' + tabId;
  const got = await browser.storage.session.get(key);
  return got[key] || { dialogs: 0, toggles: 0, stuck: 0, cmps: [] };
}

async function paintBadge(tabId) {
  const s = await tabStats(tabId);
  let text = '';
  let color = '#1a7f37';
  if (s.dialogs > 0) text = String(s.dialogs);
  else if (s.stuck > 0) {
    text = '!';
    color = '#b45309';
  }
  try {
    await browser.action.setBadgeText({ tabId, text });
    await browser.action.setBadgeBackgroundColor({ tabId, color });
    if (browser.action.setBadgeTextColor) await browser.action.setBadgeTextColor({ tabId, color: '#ffffff' });
  } catch (e) {
    // the tab went away
  }
}

async function onReport(msg, sender) {
  if (!sender.tab) return;
  const tabId = sender.tab.id;
  const s = await tabStats(tabId);
  if (msg.kind === 'denied') {
    s.dialogs += 1;
    s.toggles += msg.toggles || 0;
    if (msg.cmp && !s.cmps.includes(msg.cmp)) s.cmps.push(msg.cmp);
    const total = (await browser.storage.local.get({ total: 0 })).total + 1;
    await browser.storage.local.set({ total });
  } else if (msg.kind === 'stuck') {
    s.stuck += 1;
    s.toggles += msg.toggles || 0;
  }
  await browser.storage.session.set({ ['tab' + tabId]: s });
  await paintBadge(tabId);
}

browser.runtime.onMessage.addListener((msg, sender) => {
  switch (msg && msg.type) {
    case 'hello':
      return settings().then((s) => {
        const host = hostOf(sender.tab && sender.tab.url);
        return { active: s.enabled && !s.disabledHosts.includes(host), debug: s.debug };
      });
    case 'report':
      return onReport(msg, sender);
    case 'popup:get':
      return (async () => {
        const [s, stats] = await Promise.all([settings(), tabStats(msg.tabId)]);
        const host = hostOf(msg.url);
        return {
          host,
          enabled: s.enabled,
          siteEnabled: !s.disabledHosts.includes(host),
          debug: s.debug,
          total: s.total,
          stats
        };
      })();
    case 'popup:set':
      return (async () => {
        const s = await settings();
        if ('enabled' in msg) s.enabled = !!msg.enabled;
        if ('debug' in msg) s.debug = !!msg.debug;
        if ('siteEnabled' in msg && msg.host) {
          const set = new Set(s.disabledHosts);
          if (msg.siteEnabled) set.delete(msg.host);
          else set.add(msg.host);
          s.disabledHosts = [...set].sort();
        }
        await browser.storage.local.set({ enabled: s.enabled, disabledHosts: s.disabledHosts, debug: s.debug });
        return { ok: true };
      })();
    default:
      return undefined;
  }
});

// a new page load starts a fresh count for that tab
browser.tabs.onUpdated.addListener(
  async (tabId, changeInfo) => {
    if (changeInfo.status !== 'loading') return;
    await browser.storage.session.remove('tab' + tabId);
    try {
      await browser.action.setBadgeText({ tabId, text: '' });
    } catch (e) {}
  },
  { properties: ['status'] }
);

browser.tabs.onRemoved.addListener((tabId) => browser.storage.session.remove('tab' + tabId));
