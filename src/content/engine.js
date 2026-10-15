/*
 * Deny Everything - the engine.
 *
 * What it does when a consent dialog shows up:
 *
 *   1. Open the detailed preferences ("Manage preferences", "Settings", ...), because the
 *      one-click "Reject all" on most dialogs only rejects *consent* and leaves every
 *      "legitimate interest" switched on.
 *   2. Switch every toggle off. Pick "Disagree" / "Object" on every radio pair. Click
 *      "Object to all" / "Disable all" buttons. Visit every tab (Purposes, Legitimate
 *      interest, Vendors, ...) and repeat, because tabs often render their toggles lazily.
 *   3. Save the choices. If that did not close the dialog, press the plain "Reject all".
 *
 * Safety rules the code keeps:
 *   - Only things inside a detected consent dialog are touched. Never the rest of the page.
 *   - Anything that reads like "accept" / "agree" / "allow" is never clicked
 *     (except "allow selection", which is how some dialogs name "save").
 *   - Links that would leave the page are never clicked.
 *   - Strictly-necessary rows and "remember my choice" boxes are left alone.
 */
(function (root) {
  'use strict';

  const DE = (root.DE = root.DE || {});
  const T = DE.text;
  const D = DE.dom;

  const isTop = (() => {
    try {
      return window === window.top;
    } catch (e) {
      return false;
    }
  })();

  const BUDGET_MS = 15000; // longest a single dialog may keep us busy
  const LIFETIME_MS = isTop ? 45000 : 20000; // how long we keep watching for a dialog to appear

  const state = {
    busy: false,
    tries: new WeakMap(),
    report: () => {},
    debug: false,
    observer: null,
    stopTimer: null,
    lastScan: 0,
    scheduled: null
  };

  const log = (...args) => {
    if (state.debug) console.debug('[Deny Everything +' + Math.round(performance.now()) + 'ms]', ...args);
  };

  // ------------------------------------------------------------------ finding things

  // Clickable things in `scope`. When `predicate` is given the cheap text test runs first, so the
  // layout-forcing visibility check only happens for the few elements that matter.
  function actionables(scope, predicate) {
    let list = D.collect(scope, D.ACTION_SEL).filter((el) => !D.leavesPage(el));
    if (predicate) list = list.filter((el) => D.texts(el).some(predicate));
    return list.filter(D.isVisible);
  }

  // innermost elements only: a wrapper <div class="btn"> around a <span> counts once
  function innermost(list) {
    return list.filter((el) => !list.some((other) => other !== el && el.contains(other)));
  }

  function findAction(scope, selectors, predicate) {
    if (selectors) {
      for (const sel of selectors) {
        const hit = D.collect(scope, sel).find(D.isVisible);
        if (hit) return hit;
      }
    }
    if (!predicate) return null;
    return innermost(actionables(scope, predicate))[0] || null;
  }

  // Switches and radio buttons the person could see right now (hidden panels do not count).
  function controlCount(scope, limit = Infinity) {
    let n = 0;
    for (const el of [...D.collect(scope, D.TOGGLE_SEL), ...D.collect(scope, D.RADIO_SEL)]) {
      if (!D.isLocked(el) && D.isRendered(el) && ++n >= limit) break;
    }
    return n;
  }

  // Is there anything on this screen for us to work through: switches, radios, tabs or collapsed sections?
  function hasWork(scope) {
    return (
      controlCount(scope, 1) > 0 ||
      !!nextTab(scope, new Set()) ||
      D.collect(scope, '[aria-expanded="false"]').some((el) => D.isVisible(el) && !D.leavesPage(el))
    );
  }

  function describeActions(scope) {
    const has = (pred) => actionables(scope, pred).length > 0;
    return { reject: has(T.isReject), settings: has(T.isSettings), accept: has(T.isAcceptLike), save: has(T.isSave) };
  }

  function resolveRoot(rule, hit) {
    if (!rule.root) return hit;
    for (const sel of [].concat(rule.root)) {
      const el = sel === 'body' ? document.body : document.querySelector(sel);
      if (el) return el;
    }
    return hit;
  }

  function findKnown() {
    for (const rule of DE.RULES) {
      for (const sel of rule.detect) {
        let hit = null;
        try {
          hit = document.querySelector(sel);
        } catch (e) {
          continue;
        }
        if (!hit) continue;
        const rootEl = resolveRoot(rule, hit);
        const wanted = [].concat(rule.reject || [], rule.settings || [], rule.save || []);
        const visible = wanted.length
          ? wanted.some((s) => D.collect(rootEl, s).some(D.isVisible))
          : D.isVisible(rootEl);
        if (visible) return { rule, root: rootEl };
      }
    }
    return null;
  }

  const CANDIDATES =
    '[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open], ' +
    '[id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i], ' +
    '[id*="gdpr" i], [class*="gdpr" i], [id^="cmp" i], [class^="cmp" i], [id*="privacy" i], [class*="privacy" i], ' +
    '[id*="banner" i], [class*="banner" i], [class*="overlay" i], [class*="modal" i], [class*="popup" i], ' +
    '[id*="notice" i], [class*="notice" i]';

  function qualifies(el, nameHit) {
    if (!D.isVisible(el)) return false;
    const text = el.innerText || '';
    if (text.length < 15 || text.length > (isTop ? 6000 : 9000)) return false;
    if (!T.looksLikeConsentText(text)) return false;

    const a = describeActions(el);
    // nothing we could deny with: no reject, no settings, and no preferences screen with a save button
    if (!a.reject && !a.settings && !(a.save && hasWork(el))) return false;

    const cs = getComputedStyle(el);
    const modal =
      el.matches('[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]') ||
      cs.position === 'fixed' ||
      cs.position === 'sticky' ||
      (cs.position === 'absolute' && parseInt(cs.zIndex, 10) >= 10);
    if (modal) return true;
    // an in-flow bar: only if it is named like a cookie bar and clearly offers a yes/no choice
    return !!nameHit && text.length < 2500 && (a.reject || (a.accept && a.settings));
  }

  function genericDialogs() {
    if (!document.body) return [];
    const seen = new Set();
    const found = [];
    const consider = (el, nameHit) => {
      if (seen.has(el) || el === document.body || el === document.documentElement) return;
      seen.add(el);
      if (qualifies(el, nameHit)) found.push(el);
    };

    let named = [];
    try {
      named = [...document.querySelectorAll(CANDIDATES)];
    } catch (e) {}
    named.slice(0, 80).forEach((el) => consider(el, true));

    // fixed overlays that carry no telling name
    const top = [...document.body.children].slice(0, 40);
    for (const el of top) {
      consider(el, false);
      [...el.children].slice(0, 20).forEach((child) => consider(child, false));
    }

    if (!isTop && qualifies(document.body, true)) found.push(document.body); // a consent iframe: the whole frame is the dialog

    return found.filter((el) => !found.some((other) => other !== el && other.contains(el)));
  }

  // Everything that looks like a floating dialog right now (named like a banner, or role=dialog, or position:fixed).
  function overlays() {
    if (!document.body) return [];
    const list = new Set();
    let named = [];
    try {
      named = [...document.querySelectorAll(CANDIDATES)].slice(0, 120);
    } catch (e) {}
    const plain = [...document.body.children].slice(0, 40).flatMap((el) => [el, ...[...el.children].slice(0, 20)]);
    for (const el of [...named, ...plain]) {
      if (el === document.body || el === document.documentElement || !D.isVisible(el)) continue;
      const cs = getComputedStyle(el);
      if (
        el.matches('[role="dialog"], [role="alertdialog"], [aria-modal="true"], dialog[open]') ||
        cs.position === 'fixed' ||
        cs.position === 'sticky'
      ) {
        list.add(el);
      }
    }
    return [...list];
  }

  function findGeneric() {
    const dialogs = genericDialogs();
    return dialogs.length ? { rule: null, root: dialogs[0] } : null;
  }

  // The element that holds the toggles: the dialog itself, or a panel that appeared after a click.
  function pickPanel(found, before) {
    let best = found.root;
    let bestN = controlCount(best, 50);
    const consider = (el) => {
      const n = controlCount(el, 50);
      if (n > bestN) {
        best = el;
        bestN = n;
      }
    };
    genericDialogs().forEach(consider);
    if (before) overlays().filter((el) => !before.has(el)).forEach(consider);
    return best;
  }

  // ------------------------------------------------------------------ switching things off

  const TAB_SEL = '[role="tab"], [aria-selected], [class*="tab" i], li, button, a, div[tabindex], span[tabindex], summary';

  function nextTab(panel, seen) {
    const looksLikeTab = (el) => el.getAttribute('role') === 'tab' || D.texts(el).some(T.isTabLabel);
    const found = D.collect(panel, TAB_SEL).filter((el) => {
      if (D.leavesPage(el) || el.getAttribute('aria-selected') === 'true') return false;
      if (!looksLikeTab(el)) return false;
      const labels = D.texts(el);
      if (labels.some(T.isAcceptLike) && !labels.some(T.isTabLabel)) return false;
      return D.isVisible(el);
    });
    for (const el of innermost(found)) {
      const key = T.norm(D.texts(el)[0]);
      if (!seen.has(key)) {
        seen.add(key);
        return el;
      }
    }
    return null;
  }

  // Is there an accept-type button right next to this one (same row)?
  function hasAcceptSibling(el) {
    let node = el.parentElement;
    for (let i = 0; i < 3 && node; i++, node = node.parentElement) {
      const buttons = D.collect(node, D.ACTION_SEL);
      if (buttons.length > 8) return false;
      if (buttons.some((b) => b !== el && D.texts(b).some(T.isAcceptLike))) return true;
    }
    return false;
  }

  function sweep(panel, memo) {
    let flipped = 0;
    const now = Date.now();

    // 1. toggles: ON -> OFF (and the odd "Object" toggle the other way round)
    for (const el of D.collect(panel, D.TOGGLE_SEL)) {
      const stateNow = D.toggleState(el);
      if (stateNow === null || D.isLocked(el)) continue;

      const label = D.labelOf(el);
      const inverted = label.length <= 40 && T.isObject(label); // "Object": ON means objected
      const wanted = inverted;
      if (stateNow === wanted) continue;

      const row = D.rowText(el);
      if (!inverted && (T.isKeep(label) || T.isKeep(row) || T.isAlwaysOn(row))) continue;

      const prior = memo.clicked.get(el);
      if (prior && (prior.n >= 2 || now - prior.t < 600)) continue;
      memo.clicked.set(el, { n: prior ? prior.n + 1 : 1, t: now });

      D.click(el);
      if (el.matches('input') && D.toggleState(el) === stateNow) {
        // a hidden checkbox that ignored the click: press its visible label instead
        const label = (el.labels && el.labels[0]) || el.closest('label');
        if (label) D.click(label);
      }
      flipped++;
    }

    // 2. Agree / Disagree style radio pairs
    for (const group of D.radioGroups(panel)) {
      if (group.length < 2 || group.some(D.isLocked)) continue;
      const negative = group.find((el) => T.isNegativeChoice(D.labelOf(el)));
      if (!negative || D.radioChecked(negative)) continue;
      const row = D.rowText(negative, group);
      if (T.isKeep(row) || T.isAlwaysOn(row)) continue;
      const prior = memo.clicked.get(negative);
      if (prior && (prior.n >= 2 || now - prior.t < 600)) continue;
      memo.clicked.set(negative, { n: prior ? prior.n + 1 : 1, t: now });
      D.click(negative);
      flipped++;
    }

    // 2b. per-purpose Accept / Reject button pairs (no aria state): press Reject on each.
    // A single pair is just the banner's own buttons, so only act when there is a list of them.
    const pairs = innermost(actionables(panel, T.isChoiceNo)).filter(hasAcceptSibling);
    if (pairs.length >= 2 || (memo.inPanel && pairs.length >= 1)) {
      const seenNo = new Map();
      for (const el of pairs) {
        const label = T.norm(D.texts(el)[0]);
        const index = seenNo.get(label) || 0;
        seenNo.set(label, index + 1);
        const key = 'no:' + label + '#' + index;
        if (memo.buttons.has(key)) continue;
        memo.buttons.add(key);
        D.click(el);
        flipped++;
      }
    }

    // 3. "Object to all" / "Disable all" buttons: once each
    const seenLabel = new Map();
    for (const el of innermost(actionables(panel, (t) => T.isObject(t) || T.isDisableAll(t)))) {
      const labels = D.texts(el);
      const label = T.norm(labels[0]);
      const index = seenLabel.get(label) || 0;
      seenLabel.set(label, index + 1);
      const key = label + '#' + index;
      if (memo.buttons.has(key)) continue;
      memo.buttons.add(key);
      D.click(el);
      flipped++;
    }

    return flipped;
  }

  async function expandSections(panel, memo) {
    let opened = 0;
    for (const el of D.collect(panel, '[aria-expanded="false"]')) {
      if (opened >= 25) break;
      if (memo.expanded.has(el) || !D.isVisible(el) || D.leavesPage(el) || D.isLocked(el)) continue;
      if (el.getAttribute('role') === 'tab') continue;
      if (D.texts(el).some((t) => T.isAcceptLike(t) || T.isReject(t))) continue;
      memo.expanded.add(el);
      D.click(el);
      opened++;
    }
    if (opened) await D.sleep(150);
    return opened;
  }

  async function sweepAll(panel, memo, deadline, walkTabs) {
    const t0 = performance.now();
    let flipped = sweep(panel, memo);
    const t1 = performance.now();
    const opened = await expandSections(panel, memo);
    if (opened) flipped += sweep(panel, memo);
    const t2 = performance.now();

    const seen = new Set();
    let tabs = 0;
    for (let i = 0; walkTabs && i < 10 && Date.now() < deadline; i++) {
      const tab = nextTab(panel, seen);
      if (!tab) break;
      tabs++;
      D.click(tab);
      await D.sleep(200);
      flipped += sweep(panel, memo);
      if (await expandSections(panel, memo)) flipped += sweep(panel, memo);
    }
    log('timing: first sweep ' + Math.round(t1 - t0) + 'ms, expand ' + Math.round(t2 - t1) + 'ms (' + opened + ' opened), tabs ' + tabs + ' in ' + Math.round(performance.now() - t2) + 'ms');
    return flipped;
  }

  // ------------------------------------------------------------------ one dialog, start to finish

  const stillShowing = (...els) => els.some((el) => el && el.isConnected && D.isVisible(el));

  async function handle(found) {
    const started = Date.now();
    const deadline = started + BUDGET_MS;
    const { rule } = found;
    const root = found.root;
    const memo = { clicked: new WeakMap(), buttons: new Set(), expanded: new WeakSet(), inPanel: false };
    const result = { cmp: rule ? rule.name : 'generic', toggles: 0, action: null };

    log('dialog found:', result.cmp, root);

    const rejectAll = (scope) => findAction(scope, rule && rule.reject, T.isReject);

    // platforms whose reject button already means "everything"
    if (rule && rule.quick) {
      const btn = rejectAll(root);
      if (btn) {
        D.click(btn);
        result.action = 'reject';
        return result;
      }
    }

    // open the detailed preferences unless the toggles are already on screen
    let panel = root;
    if (controlCount(root, 2) < 2) {
      const open = findAction(root, rule && rule.settings, T.isSettings);
      if (open) {
        log('opening preferences');
        const before = new Set(overlays());
        D.click(open);
        for (let i = 0; i < 4; i++) {
          await D.sleep(i === 0 ? 450 : 500);
          panel = pickPanel(found, before);
          if (hasWork(panel)) break;
        }
      }
    } else {
      panel = pickPanel(found);
    }

    if (hasWork(panel)) {
      for (let pass = 0; pass < 4 && Date.now() < deadline; pass++) {
        memo.inPanel = panel !== root;
        const n = await sweepAll(panel, memo, deadline, pass === 0);
        result.toggles += n;
        log('pass', pass + 1, 'switched off', n);
        if (!n) break;
        await D.sleep(250);
      }

      const save = findAction(panel, rule && rule.save, T.isSave) || (panel !== root ? findAction(root, rule && rule.save, T.isSave) : null);
      if (save) {
        log('saving');
        D.click(save);
        result.action = 'save';
        await D.sleep(900);
      } else {
        const btn = rejectAll(panel) || rejectAll(root);
        if (btn) {
          D.click(btn);
          result.action = 'reject';
          await D.sleep(600);
        }
      }

      if (stillShowing(root, panel) && result.action === 'save') {
        const btn = rejectAll(panel) || rejectAll(root);
        if (btn) {
          log('still open after saving: pressing reject all');
          D.click(btn);
          result.action = 'save+reject';
          await D.sleep(600);
        }
      }
      // a dialog that is still there insists on something we will not do (usually "consent or pay")
      result.stillOpen = stillShowing(root, panel);
      return result;
    }

    // no preferences screen at all: the plain reject button is all there is
    const btn = rejectAll(root);
    if (btn) {
      D.click(btn);
      result.action = 'reject';
    }
    return result;
  }

  // ------------------------------------------------------------------ watching the page

  async function scan() {
    if (state.busy) return;
    const found = findKnown() || findGeneric();
    if (!found) return;

    const tries = state.tries.get(found.root) || 0;
    if (tries >= 2) return;
    state.tries.set(found.root, tries + 1);

    state.busy = true;
    try {
      const result = await handle(found);
      if (result.action && result.stillOpen) {
        log('did what it could, but the dialog is still open', result);
        state.report({ kind: 'stuck', cmp: result.cmp, toggles: result.toggles });
      } else if (result.action) {
        log('done', result);
        state.report({ kind: 'denied', cmp: result.cmp, toggles: result.toggles, action: result.action });
      } else {
        log('found a dialog but nothing to deny it with', found.root);
        state.report({ kind: 'stuck', cmp: result.cmp });
      }
    } catch (e) {
      log('error', e);
    } finally {
      state.busy = false;
    }
  }

  function schedule() {
    if (state.scheduled) return;
    const wait = Math.max(0, 400 - (Date.now() - state.lastScan));
    state.scheduled = setTimeout(() => {
      state.scheduled = null;
      state.lastScan = Date.now();
      scan();
    }, wait);
  }

  function stop() {
    if (state.observer) state.observer.disconnect();
    state.observer = null;
  }

  function start(options) {
    state.report = (options && options.report) || state.report;
    state.debug = !!(options && options.debug);
    if (!document.documentElement) return;

    state.observer = new MutationObserver(schedule);
    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open']
    });
    [0, 700, 1800, 3500].forEach((ms) => setTimeout(schedule, ms));
    state.stopTimer = setTimeout(stop, LIFETIME_MS);
  }

  DE.engine = { start, stop, scan, handle, findKnown, findGeneric, _state: state };
})(typeof globalThis !== 'undefined' ? globalThis : this);
