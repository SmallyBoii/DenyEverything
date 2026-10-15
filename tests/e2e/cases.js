'use strict';
const assert = require('node:assert/strict');

module.exports = [
  {
    name: 'plain banner: presses Reject, never Accept',
    page: 'generic.html',
    until: (s) => s.rejected || s.accepted,
    check: (s) => {
      assert.equal(s.accepted, false);
      assert.equal(s.rejected, true);
    }
  },
  {
    name: 'Bulgarian banner: "Отхвърляне на всички"',
    page: 'bulgarian.html',
    until: (s) => s.rejected || s.accepted,
    check: (s) => {
      assert.equal(s.accepted, false);
      assert.equal(s.rejected, true);
    }
  },
  {
    name: 'TCF-style dialog: consent, legitimate interest and vendors all off, then saved',
    page: 'tcf.html',
    until: (s) => s.saved || s.acceptedAll || s.rejectedTop,
    check: (s) => {
      assert.equal(s.acceptedAll, false, 'must never accept');
      assert.equal(s.rejectedTop, false, 'must go through the preferences, not the one-click reject');
      assert.equal(s.saved, true, 'must save');
      assert.deepEqual(s.consent, [false, false, false, false], 'consent toggles');
      assert.deepEqual(s.li, [false, false, false, false], 'legitimate-interest toggles');
      assert.deepEqual(s.vendors, [false, false, false], 'vendor toggles');
      assert.equal(s.newsletterTouched, false, 'the page itself must be left alone');
    }
  },
  {
    name: 'OneTrust-style ids: opens settings, switches everything off, confirms',
    page: 'onetrust.html',
    until: (s) => s.saved || s.acceptedAll || s.rejectedTop,
    check: (s) => {
      assert.equal(s.acceptedAll, false);
      assert.equal(s.rejectedTop, false);
      assert.equal(s.saved, true);
      assert.equal(s.consentOn, 0);
      assert.equal(s.liOn, 0);
    }
  },
  {
    name: 'Usercentrics-style shadow DOM',
    page: 'shadow.html',
    until: (s) => s.saved || s.accepted || s.deniedTop,
    check: (s) => {
      assert.equal(s.accepted, false);
      assert.equal(s.deniedTop, false);
      assert.equal(s.saved, true);
      assert.equal(s.on, 0);
    }
  },
  {
    name: 'dialog inside an iframe: Disagree / Object radios, keeps "remember my choice"',
    page: 'frame-host.html',
    frame: true,
    until: (s) => s.saved || s.accepted,
    check: (s) => {
      assert.equal(s.accepted, false);
      assert.equal(s.saved, true);
      assert.equal(s.p1, 'disagree');
      assert.equal(s.p2, 'object');
      assert.equal(s.remember, true, '"remember my choice" must stay ticked');
    }
  },
  {
    name: 'Accept / Reject button pairs inside collapsed sections; never "Reject all and subscribe"',
    page: 'pairs.html',
    until: (s) => s.saved || s.acceptedAll || s.subscribed,
    check: (s) => {
      assert.equal(s.acceptedAll, false);
      assert.equal(s.subscribed, false, 'the pay-wall button is not a reject button');
      assert.equal(s.saved, true);
      assert.deepEqual(s.choice, ['reject', 'reject', 'reject', 'reject']);
    }
  },
  {
    name: 'ordinary settings page + footer cookie link: nothing is clicked',
    page: 'untouched.html',
    settle: 5000,
    check: (s) => assert.equal(s.clicks, 0)
  },
  {
    name: 'notice with only "Got it!": nothing is clicked (nothing to deny with)',
    page: 'accept-only.html',
    settle: 5000,
    check: (s) => assert.equal(s.clicks, 0)
  }
];
