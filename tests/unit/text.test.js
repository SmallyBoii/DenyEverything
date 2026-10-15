'use strict';
// Run with: node tests/unit/text.test.js
const assert = require('node:assert/strict');
const T = require('../../src/content/text.js');

let passed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error('FAIL', name, '\n', e.message);
    process.exitCode = 1;
  }
};

const yes = (fn, list) => list.forEach((s) => check(`${fn.name}(${JSON.stringify(s)}) is true`, () => assert.equal(fn(s), true)));
const no = (fn, list) => list.forEach((s) => check(`${fn.name}(${JSON.stringify(s)}) is false`, () => assert.equal(fn(s), false)));

// -------------------------------------------------------------------- reject
yes(T.isReject, [
  'Reject all', 'REJECT ALL', '  Reject All  ', 'Decline', 'Deny', 'Do not consent', 'Continue without accepting',
  'Only necessary cookies', 'Necessary cookies only', 'No, thanks', 'Disagree to all', 'Refuse all',
  'Reject non-essential cookies', 'Alle ablehnen', 'Nur notwendige Cookies', 'Tout refuser', 'Rechazar todo',
  'Rifiuta tutto', 'Alles weigeren', 'Rejeitar tudo', 'Odrzuć wszystkie', 'Odmítnout vše', 'Refuză toate',
  'Отхвърляне на всички', 'Откажи всички', 'Не приемам', 'Само необходимите', 'Отказ',
  'Отклонить все', 'Avvisa alla', '拒绝全部', 'すべて拒否', 'No', 'Nein',
  'Reject all purposes', 'Reject about cookies', '× Rechazar', 'Reject'
]);
no(T.isReject, [
  'Accept all', 'Приемам всички', 'I agree', 'Manage preferences', 'Save', 'Allow all', 'Allow selection',
  'We reject all liability for anything you read on this extremely long sentence about cookies and other things',
  'Notice', 'Learn more', 'Privacy policy', '', 'Reject all and subscribe', 'Alle ablehnen und abonnieren'
]);

// ------------------------------------------------------------------- settings
yes(T.isSettings, [
  'Manage preferences', 'Cookie settings', 'Settings', 'Customize', 'More options', 'Options', 'Preferences',
  'Einstellungen', 'Anpassen', 'Paramètres', 'Personnaliser', 'Configurar', 'Impostazioni', 'Instellingen',
  'Настройки', 'Управление на предпочитанията', 'Персонализиране', 'Ustawienia', 'Nastavení',
  '141 partners', '287 vendors', '12 партньори'
]);
no(T.isSettings, ['Accept all', 'Accept and set preferences', 'Allow cookies', 'Reject all', 'Save', 'Приемам']);

// ----------------------------------------------------------------------- save
yes(T.isSave, [
  'Save', 'Save & exit', 'Save and exit', 'Confirm my choices', 'Confirm choices', 'Save settings',
  'Allow selection', 'Accept selected', 'Zapisz', 'Speichern', 'Enregistrer', 'Guardar', 'Salva', 'Opslaan',
  'Запази', 'Запази избора', 'Потвърди избора ми', 'Auswahl bestätigen', 'Done'
]);
no(T.isSave, [
  'Accept all', 'Allow all', 'Agree', 'I agree', 'Accept', 'Приемам всички', 'Alle akzeptieren', 'Tout accepter',
  'Confirm all', 'Потвърди всички', 'Save and accept all', 'Aceptar todo', 'Accetta tutto', 'OK', 'Got it'
]);

// ------------------------------------------------------------- object / disable
yes(T.isObject, ['Object to all', 'Object all', 'Object', 'Alle widersprechen', "S'opposer à tout", 'Възразявам']);
no(T.isObject, ['Withdraw objection', 'Accept all', 'Save']);
yes(T.isDisableAll, ['Disable all', 'Turn off all', 'Deselect all', 'Alle deaktivieren', 'Изключи всички']);
no(T.isDisableAll, ['Enable all', 'Accept all']);

// ----------------------------------------------------------------------- tabs
yes(T.isTabLabel, ['Legitimate interest', 'Legitimate Interests (12)', 'Purposes', 'Vendors', 'Partners', 'Special features', 'Законни интереси', 'Berechtigtes Interesse']);
no(T.isTabLabel, ['Accept all', 'Save', 'A very long label that is clearly not a tab but a sentence about something', 'Home']);

// --------------------------------------------------------------- accept veto
yes(T.isAcceptLike, ['Accept all', 'I agree', 'Allow all cookies', 'Приемам', 'Съгласен съм', 'Alle akzeptieren', 'Tout accepter', 'Aceptar', 'Accetta', 'OK', 'Yes']);
no(T.isAcceptLike, ['Reject all', 'Save', 'Manage preferences', 'Confirm my choices', 'Save consent preferences', 'Отхвърляне']);

// ------------------------------------------------------------- rows to leave
yes(T.isAlwaysOn, ['Strictly necessary cookies. Always active', 'Necessary', 'Essential cookies', 'Винаги активни', 'Immer aktiv', 'Toujours actif']);
no(T.isAlwaysOn, ['Measure ad performance', 'Marketing', 'Personalised ads - legitimate interest', 'Analytics']);
yes(T.isKeep, ['Remember my choice', 'Do not show again', 'Запомни ме']);
no(T.isKeep, ['Marketing', 'Measure ad performance']);

// ------------------------------------------------------- radio "no" side
yes(T.isNegativeChoice, ['Disagree', 'Object', 'Off', 'Reject', 'Decline', 'Disabled', 'No']);
no(T.isNegativeChoice, ['Agree', 'Consent', 'On', 'Accept', 'Allow']);

// ------------------------------------------------------- consent-ish text
check('consent text: cookies', () => assert.equal(T.looksLikeConsentText('This site uses cookies for ads'), true));
check('consent text: bg', () => assert.equal(T.looksLikeConsentText('Този сайт използва бисквитки'), true));
check('consent text: privacy + partners', () => assert.equal(T.looksLikeConsentText('Your privacy matters. We share data with partners.'), true));
check('consent text: ordinary', () => assert.equal(T.looksLikeConsentText('Welcome to my blog about gardening'), false));

console.log(`${passed} checks passed${process.exitCode ? ', some FAILED' : ''}`);
