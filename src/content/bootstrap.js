/*
 * Deny Everything - content script entry point.
 *
 * Runs in every frame (consent dialogs are often inside an iframe). Asks the background page
 * whether the extension is switched on for this site, and if so starts the engine.
 */
(function () {
  'use strict';

  const api = typeof browser !== 'undefined' ? browser : chrome;

  async function main() {
    let reply;
    try {
      reply = await api.runtime.sendMessage({ type: 'hello' });
    } catch (e) {
      return;
    }
    if (!reply || !reply.active) return;

    globalThis.DE.engine.start({
      debug: reply.debug,
      report: (info) => {
        try {
          const p = api.runtime.sendMessage(Object.assign({ type: 'report' }, info));
          if (p && p.catch) p.catch(() => {});
        } catch (e) {}
      }
    });
  }

  main();
})();
