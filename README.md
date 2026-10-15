# Deny Everything

A Firefox extension that answers cookie and tracking banners with a complete **no**.

Most "Reject all" buttons only reject *consent*. The same dialog usually still has **legitimate interest**
switched on for dozens of purposes, and hundreds of **vendors** ticked as "legitimate interest partners",
hidden one screen deeper. Deny Everything opens that screen, switches every one of them off, and saves.

It never clicks anything that says accept, agree or allow.

## What it does

When a consent dialog appears it:

1. opens the detailed preferences ("Manage preferences", "Settings", "More options", ...);
2. switches every toggle off, picks **Disagree** / **Object** on every yes/no pair, and presses
   **Object to all** / **Disable all** where the dialog has such a button;
3. visits every tab (Purposes, Special features, **Legitimate interest**, Vendors, ...) and does the same,
   because tabs often draw their switches only once you open them;
4. saves. If the dialog is still open afterwards, it presses the plain **Reject all**.

It also copes with dialogs inside iframes and inside shadow DOM, and it understands buttons in about 25
languages (including Bulgarian).

Strictly-necessary rows ("Always active") and "remember my choice" boxes are left alone.
Dialogs that offer no way to say no (only "OK, got it") are left alone too. The toolbar icon then shows an
amber `!` so you know nothing could be denied there.

## Install

Firefox 140 or newer.

- **Try it (temporary):** open `about:debugging` → *This Firefox* → *Load Temporary Add-on…* and pick
  `manifest.json` from this folder. It stays until Firefox is closed.
- **Firefox Add-ons store:** coming soon.

### As a userscript (works next to uBlock Origin)

uBlock Origin has no plugin system, so it cannot host this directly. The same engine is also built as a single
userscript, `dist/deny-everything.user.js`, for [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey:
install one of those, then open the `.user.js` file in Firefox and confirm the install prompt. There is no toolbar
popup; use the userscript manager's menu on any page: *Turn OFF for this site*, *Turn OFF everywhere*,
*Log to the console*. The two never conflict, so uBlock Origin keeps blocking while this answers the banners.

Build it with `powershell -ExecutionPolicy Bypass -File tools/build-userscript.ps1`. Differences from the
extension: no badge count, no "denied in total" counter.

## Toolbar button

Shows how many banners were denied on the current page and how many switches that took, with a switch for
"this site" and one for "everywhere". Turning a site off and reloading restores the original behaviour there.

## Privacy

No telemetry, no network access, no accounts. The extension makes no requests at all. It stores three things
in Firefox's local extension storage: the on/off settings, the list of sites you switched off, and a count of
banners denied. They never leave your computer. It asks for access to all sites only because consent
dialogs can show up on any of them.

Dialogs are found by their structure and wording, and only things *inside* a detected consent dialog are ever
touched, never the rest of a page.

## Build

```
powershell -ExecutionPolicy Bypass -File tools/build.ps1
```

writes `dist/deny-everything-<version>.zip`. The `src/` folder is plain JavaScript, with no build step and no
dependencies.

## Tests

```
node tests/unit/text.test.js     # what counts as "reject", "save", "settings", ... in each language
node tests/e2e/run.js            # loads the extension into headless Firefox and opens tests/fixtures/*.html
node tests/e2e/run-userscript.js # same pages, with the built userscript injected (build it first)
```

`e2e` needs `npm install --no-save selenium-webdriver` and an installed Firefox. The fixtures are small pages
that imitate consent dialogs: tabs that render lazily, a "Reject all" that leaves legitimate interest on,
OneTrust-style ids, Usercentrics-style shadow DOM, a dialog in an iframe, and pages that must be left untouched.

## What has been tested

- The 9 fixture pages above, in Firefox 157, with the real extension loaded.
- Real sites, with the built zip loaded as an extension (October 2026, from Bulgaria):
  **dnes.bg, mediapool.bg, nova.bg** (Google Funding Choices: 64 to 104 switches turned off, saved, dialog gone),
  **independent.co.uk** (the page's own consent API afterwards reported zero purposes, zero legitimate interests,
  zero vendors) and **onet.pl** (7 switches off; one purpose the site marks as required stayed on).
- Real sites where it only partly works, and why: **theguardian.com, spiegel.de, bild.de, corriere.it,
  lemonde.fr** are "consent or pay" walls. They mark some purposes *consent required* and give them only an
  **Accept** button. The extension turns off everything that can be turned off and never presses that Accept, so
  the dialog stays open there. **marca.com** hides its legitimate-interest vendor lists a level deeper than the
  extension currently follows.

Real sites change their dialogs often. Treat the list above as a snapshot, not a promise.

## Limits

Be aware of these:

- The platform-specific rules in `src/content/rules.js` (OneTrust, Didomi, Sourcepoint, Cookiebot, ...) are
  written from the platforms' public markup. Platforms change their markup, and the fixtures only imitate them.
  When a rule stops matching, the generic engine takes over, but that is less precise.
- Dialogs that load their vendor list in pages of a few hundred, or draw it only while you scroll, may leave
  vendors on the lower pages untouched.
- "Pay or accept" walls have no real "no". Whatever *can* be refused is refused, the mandatory part is left alone
  (never accepted), and the toolbar icon shows an amber `!` when a dialog could not be closed.
- Turning a switch off in a dialog only changes what the *site* records. It cannot stop a company that ignores
  the answer. For that, use a content blocker such as uBlock Origin alongside.
- Some sites show the banner again if a consent cookie is rejected by Firefox's own cookie settings.

## Adding a platform

Add an entry to `src/content/rules.js`: a selector that only exists while the dialog is up (`detect`) and the
selectors for its `settings`, `reject` and `save` buttons. No other file needs to change.

## License

MIT. See `LICENSE`.
