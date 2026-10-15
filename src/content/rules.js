/*
 * Deny Everything - known consent platforms.
 *
 * Each rule says how to find one platform's dialog and its buttons. Rules are a shortcut, not
 * a requirement: when a site uses a platform that is not listed here, the generic engine in
 * engine.js finds the dialog by its text and buttons instead.
 *
 *   name      label shown in the debug log
 *   detect    selectors that exist only while this platform's dialog is on screen
 *   root      (optional) selector(s) of the element the rest of the work is scoped to.
 *             Defaults to the detected element.
 *   settings  buttons that open the detailed preferences
 *   reject    the "reject all" button
 *   save      the button that stores the choices made in the detailed preferences
 *   quick     true = this platform's reject button already covers everything (no
 *             legitimate-interest layer), so just click it
 *
 * Everything not listed is found by the generic text matching.
 */
(function (root) {
  'use strict';

  const DE = (root.DE = root.DE || {});

  DE.RULES = [
    // ---- platforms with a legitimate-interest layer: open the preferences and switch it all off
    {
      name: 'OneTrust',
      detect: ['#onetrust-banner-sdk', '#onetrust-pc-sdk'],
      root: '#onetrust-consent-sdk',
      settings: ['#onetrust-pc-btn-handler', '.ot-sdk-show-settings'],
      reject: ['#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler'],
      save: ['.save-preference-btn-handler']
    },
    {
      name: 'Didomi',
      detect: ['#didomi-host', '#didomi-popup'],
      settings: ['#didomi-notice-learn-more-button'],
      reject: ['#didomi-notice-disagree-button', '.didomi-continue-without-agreeing']
    },
    {
      name: 'Sourcepoint',
      detect: ['button.sp_choice_type_REJECT_ALL', 'button.sp_choice_type_12', 'button.sp_choice_type_SAVE_AND_EXIT'],
      root: ['[id^="sp_message_container"]', 'body'],
      settings: ['button.sp_choice_type_12'],
      reject: ['button.sp_choice_type_REJECT_ALL'],
      save: ['button.sp_choice_type_SAVE_AND_EXIT']
    },
    {
      name: 'Quantcast Choice',
      detect: ['.qc-cmp2-container'],
      root: '.qc-cmp2-container'
    },
    {
      name: 'Google Funding Choices',
      detect: ['.fc-consent-root', '.fc-dialog-container'],
      root: '.fc-consent-root',
      settings: ['.fc-cta-manage-options'],
      reject: ['.fc-cta-do-not-consent'],
      save: ['.fc-confirm-choices']
    },
    {
      name: 'Usercentrics',
      detect: ['#usercentrics-root'],
      settings: ['[data-testid="uc-more-button"]'],
      reject: ['[data-testid="uc-deny-all-button"]'],
      save: ['[data-testid="uc-save-button"]']
    },
    {
      name: 'Cookiebot',
      detect: ['#CybotCookiebotDialog'],
      settings: ['#CybotCookiebotDialogBodyLevelButtonCustomize', '#CybotCookiebotDialogBodyButtonDetails'],
      reject: ['#CybotCookiebotDialogBodyButtonDecline'],
      save: ['#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowallSelection']
    },
    {
      name: 'consentmanager',
      detect: ['#cmpbox'],
      settings: ['.cmpboxbtncustom'],
      reject: ['.cmpboxbtnno'],
      save: ['.cmpboxbtnsave']
    },
    {
      name: 'Iubenda',
      detect: ['#iubenda-cs-banner'],
      settings: ['.iubenda-cs-customize-btn'],
      reject: ['.iubenda-cs-reject-btn']
    },
    {
      name: 'TrustArc',
      detect: ['#truste-consent-track', '#consent_blackbar', '.truste_box_overlay'],
      reject: ['#truste-consent-required'],
      quick: true
    },

    // ---- platforms whose reject button already covers everything
    { name: 'CookieYes', detect: ['.cky-consent-container', '.cky-consent-bar'], reject: ['.cky-btn-reject'], quick: true },
    { name: 'Complianz', detect: ['#cmplz-cookiebanner-container', '.cmplz-cookiebanner'], reject: ['.cmplz-btn.cmplz-deny', '.cmplz-deny'], quick: true },
    { name: 'Osano', detect: ['.osano-cm-window', '.osano-cm-dialog'], reject: ['.osano-cm-denyAll'], quick: true },
    { name: 'Termly', detect: ['[data-tid="banner-decline"]'], reject: ['[data-tid="banner-decline"]'], quick: true },
    { name: 'Klaro', detect: ['.klaro .cookie-notice', '.klaro .cookie-modal'], reject: ['.klaro .cn-decline', '.klaro .cm-btn-decline'], quick: true },
    { name: 'Cookie Notice', detect: ['#cookie-notice'], reject: ['#cn-refuse-cookie'], quick: true },
    { name: 'HubSpot', detect: ['#hs-eu-cookie-confirmation'], reject: ['#hs-eu-decline-button'], quick: true },
    { name: 'Shopify', detect: ['#shopify-pc__banner'], reject: ['#shopify-pc__banner__btn-decline'], quick: true },
    { name: 'Squarespace', detect: ['.sqs-cookie-banner-v2'], reject: ['.sqs-cookie-banner-v2-deny'], quick: true },
    { name: 'Axeptio', detect: ['#axeptio_overlay'], reject: ['#axeptio_btn_dismiss'], quick: true },
    { name: 'CookieFirst', detect: ['[data-cookiefirst-action="reject"]'], reject: ['[data-cookiefirst-action="reject"]'], quick: true },
    { name: 'Borlabs Cookie', detect: ['#BorlabsCookieBox', '._brlbs-box-wrap'], reject: ['a._brlbs-refuse-btn', '._brlbs-refuse-btn'], quick: true },
    { name: 'Amazon', detect: ['#sp-cc'], reject: ['#sp-cc-rejectall-link'], quick: true },
    {
      name: 'Facebook / Instagram',
      detect: ['[data-cookiebanner="accept_only_essential_button"]'],
      reject: ['[data-cookiebanner="accept_only_essential_button"]'],
      quick: true
    },
    {
      name: 'Google consent page',
      detect: ['form[action*="consent.google"]', 'form[action*="consent.youtube"]'],
      root: 'body',
      reject: ['form[action*="consent."] button[aria-label*="Reject" i]'],
      quick: true
    },
    { name: 'Google search consent', detect: ['#CXQnmb'], reject: ['#W0wltc'], quick: true }
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
