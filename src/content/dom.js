/*
 * Deny Everything - DOM helpers.
 *
 * Small, boring building blocks: find elements (through shadow roots too), decide whether
 * they are visible, read toggle state, click like a person would.
 */
(function (root) {
  'use strict';

  const DE = (root.DE = root.DE || {});

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const shadowOf = (el) => (el && (el.openOrClosedShadowRoot || el.shadowRoot)) || null;

  // querySelectorAll that also looks inside (open and closed) shadow roots below `scope`.
  function collect(scope, selector, out = []) {
    if (!scope) return out;
    if (scope.nodeType === 1) {
      const own = shadowOf(scope);
      if (own) collect(own, selector, out);
    }
    try {
      out.push(...scope.querySelectorAll(selector));
    } catch (e) {
      return out;
    }
    const all = scope.querySelectorAll('*');
    if (all.length > 8000) return out;
    for (const el of all) {
      const sr = shadowOf(el);
      if (sr) collect(sr, selector, out);
    }
    return out;
  }

  function isVisible(el) {
    if (!el || !el.isConnected || el.getClientRects().length === 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Takes part in the layout (a custom switch may be invisible, but it is still rendered).
  function isRendered(el) {
    if (!el || !el.isConnected || el.getClientRects().length === 0) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  }

  // Every string that might describe a button: visible text, aria-label, value, title.
  function texts(el) {
    const out = [];
    const inner = el.textContent;
    // anything longer than a button label is a wrapper, not a button: skip the expensive text matching
    if (inner && inner.length <= 200 && inner.trim()) out.push(inner);
    if (typeof el.value === 'string' && /^(button|submit)$/i.test(el.type || '') && el.value) out.push(el.value);
    for (const attr of ['aria-label', 'title']) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (v) out.push(v);
    }
    return out;
  }

  // A link that would leave the page is never a consent control.
  function leavesPage(el) {
    if (el.tagName !== 'A') return false;
    const href = el.getAttribute('href');
    if (!href || href === '#' || href.startsWith('#') || /^javascript:/i.test(href)) return false;
    return true;
  }

  function click(el) {
    const opts = { bubbles: true, cancelable: true, composed: true };
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
    } catch (e) {}
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    try {
      el.dispatchEvent(new PointerEvent('pointerup', opts));
    } catch (e) {}
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
  }

  // ------------------------------------------------------------------ toggles

  const TOGGLE_SEL = 'input[type="checkbox"], [role="switch"], [role="checkbox"], button[aria-pressed]';
  const RADIO_SEL = 'input[type="radio"], [role="radio"]';
  const ACTION_SEL =
    'button, a, [role="button"], [role="tab"], input[type="button"], input[type="submit"], summary, ' +
    '[class*="btn" i], [class*="button" i], span[tabindex], div[tabindex]';

  // true = on, false = off, null = not a toggle we understand
  function toggleState(el) {
    if (el.matches('input[type="checkbox"]')) return el.checked;
    for (const attr of ['aria-checked', 'aria-pressed']) {
      const v = el.getAttribute(attr);
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
    return null;
  }

  function isLocked(el) {
    return !!(
      el.disabled ||
      el.readOnly ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.getAttribute('aria-readonly') === 'true' ||
      el.closest('[disabled], fieldset:disabled')
    );
  }

  // Text of the row a control sits in: climb while the container holds no control other than
  // this one (or the others in `group`, for a radio set) and is short enough to be a row.
  function rowText(el, group) {
    const own = new Set(group || [el]);
    const all = TOGGLE_SEL + ', ' + RADIO_SEL;
    let best = el;
    let node = el;
    for (let i = 0; i < 6 && node.parentElement; i++) {
      const parent = node.parentElement;
      if ([...parent.querySelectorAll(all)].some((c) => !own.has(c) && !el.contains(c) && !c.contains(el))) break;
      if ((parent.textContent || '').length > 300) break;
      node = parent;
      best = parent;
    }
    return (best.textContent || '').slice(0, 400);
  }

  // The short name of a control: its <label>, else aria-label / title / value, else text next to it.
  function labelOf(el) {
    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    if (el.labels && el.labels.length && clean(el.labels[0].textContent)) return clean(el.labels[0].textContent);
    const wrap = el.closest && el.closest('label');
    if (wrap && clean(wrap.textContent)) return clean(wrap.textContent);
    for (const attr of ['aria-label', 'title', 'value']) {
      const v = el.getAttribute && clean(el.getAttribute(attr));
      if (v) return v;
    }
    const next = el.nextElementSibling;
    if (next && clean(next.textContent)) return clean(next.textContent);
    if (el.parentElement && el.parentElement.querySelectorAll(RADIO_SEL).length === 1) {
      return clean(el.parentElement.textContent);
    }
    return clean(el.textContent);
  }

  const radioChecked = (el) => (el.matches('input') ? el.checked : el.getAttribute('aria-checked') === 'true');

  // Radio buttons grouped the way the page groups them (same form + name, or same parent).
  function radioGroups(scope) {
    const groups = new Map();
    for (const el of collect(scope, RADIO_SEL)) {
      const key = el.matches('input') && el.name ? 'n:' + (el.form ? 'f' : '') + el.name : el.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el);
    }
    return [...groups.values()];
  }

  DE.dom = {
    sleep,
    collect,
    isVisible,
    isRendered,
    texts,
    leavesPage,
    click,
    TOGGLE_SEL,
    RADIO_SEL,
    ACTION_SEL,
    toggleState,
    isLocked,
    rowText,
    labelOf,
    radioChecked,
    radioGroups
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
