/*
 * Deny Everything - userscript entry point.
 *
 * The userscript build is the same engine as the Firefox extension (text.js, dom.js, rules.js and
 * engine.js are pasted in front of this file). The only difference is how settings are kept:
 * the userscript manager's storage and its menu, instead of a toolbar popup.
 */
(function () {
  'use strict';

  const has = (name) => typeof globalThis[name] === 'function';
  const get = (key, fallback) => {
    try {
      return has('GM_getValue') ? GM_getValue(key, fallback) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const set = (key, value) => {
    try {
      if (has('GM_setValue')) GM_setValue(key, value);
    } catch (e) {}
  };

  // The site the person is looking at, even when this script runs inside an iframe.
  let topHost = location.hostname;
  try {
    topHost = window.top.location.hostname;
  } catch (e) {
    try {
      topHost = new URL(document.referrer).hostname || topHost;
    } catch (e2) {}
  }

  const enabled = get('enabled', true) !== false;
  const disabledHosts = get('disabledHosts', []);
  const debug = get('debug', false) === true;
  const offHere = disabledHosts.includes(topHost);

  // Menu entries (userscript manager icon -> this script). Only the top page registers them.
  if (window === window.top && has('GM_registerMenuCommand')) {
    const reload = () => location.reload();
    GM_registerMenuCommand(
      (offHere ? 'Turn ON for ' : 'Turn OFF for ') + topHost,
      () => {
        const list = new Set(get('disabledHosts', []));
        if (list.has(topHost)) list.delete(topHost);
        else list.add(topHost);
        set('disabledHosts', [...list].sort());
        reload();
      }
    );
    GM_registerMenuCommand(enabled ? 'Turn OFF everywhere' : 'Turn ON everywhere', () => {
      set('enabled', !enabled);
      reload();
    });
    GM_registerMenuCommand(debug ? 'Stop logging to the console' : 'Log to the console', () => {
      set('debug', !debug);
      reload();
    });
  }

  if (!enabled || offHere) return;

  globalThis.DE.engine.start({
    debug,
    report: (info) => {
      if (debug) console.debug('[Deny Everything] report', info);
    }
  });
})();
