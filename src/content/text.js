/*
 * Deny Everything - text matching.
 *
 * Decides what a button or toggle label means ("reject all", "save", "legitimate
 * interest", ...) in many languages. Text is normalised first (lower case, accents
 * removed), so every phrase below is written without accents.
 *
 * Nothing here touches the page. It is plain functions, so it is unit-tested in Node.
 */
(function (root) {
  'use strict';

  const DE = (root.DE = root.DE || {});

  const norm = (s) =>
    String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase()
      .replace(/[‘’´`]/g, "'")
      .replace(/\s*&\s*/g, ' and ')
      .replace(/\s+/g, ' ')
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
      .trim();

  const compile = (list) => list.map(norm);

  const CJK = /[぀-ヿ㐀-鿿가-힯]/;

  function hasPhrase(t, p) {
    if (t === p) return true;
    if (CJK.test(p) || p.includes(' ')) return t.includes(p);
    return t.startsWith(p + ' ') || t.endsWith(' ' + p) || t.includes(' ' + p + ' ');
  }

  const anyPhrase = (t, list) => list.some((p) => hasPhrase(t, p));

  // ---------------------------------------------------------------- phrase lists

  // "No to everything" buttons.
  const REJECT = compile([
    // English
    'reject all', 'reject everything', 'reject non-essential', 'reject optional', 'reject unnecessary',
    'decline all', 'decline optional', 'decline non-essential', 'decline everything',
    'deny all', 'deny everything', 'refuse all', 'refuse everything', 'disagree to all', 'disagree with all',
    'do not consent', "don't consent", 'do not accept', "don't accept", 'i do not accept', "i don't accept",
    'i decline', 'i refuse', 'i disagree', 'continue without accepting', 'continue without agreeing',
    'continue without consent', 'only necessary', 'necessary only', 'only essential', 'essential only',
    'only required', 'required only', 'strictly necessary only', 'use necessary cookies only',
    'necessary cookies only', 'essential cookies only', 'no thanks', 'no, thanks', 'no thank you',
    'opt out', 'opt-out', 'reject', 'decline', 'deny', 'refuse',
    // Bulgarian
    'отхвърляне на всички', 'отхвърли всички', 'откажи всички', 'отказване на всички', 'отказ от всички',
    'не приемам', 'не се съгласявам', 'само необходимите', 'само задължителните', 'само основните',
    'продължи без съгласие', 'продължете без съгласие', 'отхвърляне', 'отхвърли', 'отказ', 'откажи', 'отказвам',
    // German
    'alle ablehnen', 'alles ablehnen', 'alle verweigern', 'nur notwendige', 'nur erforderliche',
    'nur essenzielle', 'nur essentielle', 'nur technisch notwendige', 'ohne zustimmung fortfahren',
    'ohne einwilligung fortfahren', 'nicht zustimmen', 'nicht einverstanden', 'ablehnen', 'verweigern',
    // French
    'tout refuser', 'refuser tout', 'refuser', 'continuer sans accepter', 'uniquement les cookies necessaires',
    'cookies necessaires uniquement', 'je refuse', 'non merci',
    // Spanish
    'rechazar todo', 'rechazar todas', 'rechazar todos', 'rechazar', 'denegar', 'continuar sin aceptar',
    'solo necesarias', 'solo las necesarias', 'no acepto', 'no, gracias',
    // Italian
    'rifiuta tutto', 'rifiuta tutti', 'rifiuta', 'rifiutare', 'continua senza accettare',
    'solo necessari', 'solo i necessari', 'non accetto', 'no grazie',
    // Dutch
    'alles weigeren', 'alles afwijzen', 'alles weigeren', 'weigeren', 'afwijzen', 'alleen noodzakelijke',
    'alleen noodzakelijk', 'doorgaan zonder te accepteren', 'nee bedankt',
    // Portuguese
    'rejeitar tudo', 'rejeitar todos', 'rejeitar todas', 'recusar tudo', 'recusar todos', 'rejeitar',
    'recusar', 'continuar sem aceitar', 'apenas necessarios', 'apenas os necessarios', 'nao aceito',
    // Polish
    'odrzuc wszystkie', 'odrzuc wszystko', 'odrzuc', 'tylko niezbedne', 'nie zgadzam sie', 'kontynuuj bez zgody',
    // Romanian
    'refuza toate', 'refuza tot', 'respinge toate', 'respinge tot', 'refuza', 'respinge', 'doar necesare',
    'doar cele necesare', 'nu accept',
    // Czech / Slovak
    'odmitnout vse', 'odmitnout vsechny', 'odmitnout', 'pouze nezbytne', 'jen nezbytne', 'odmietnut vsetko',
    'odmietnut', 'nesuhlasim', 'nesouhlasim',
    // Greek
    'απορριψη ολων', 'απορριψη', 'μονο τα απαραιτητα', 'απαραιτητα μονο',
    // Swedish / Danish / Norwegian / Finnish
    'avvisa alla', 'neka alla', 'avvisa', 'neka', 'afvis alle', 'afvis', 'avvis alle', 'avvis',
    'hylkaa kaikki', 'hylkaa', 'vain valttamattomat', 'vain pakolliset',
    // Hungarian / Turkish / Croatian / Serbian / Slovenian / Baltic
    'osszes elutasitasa', 'elutasitas', 'elutasit', 'tumunu reddet', 'reddet', 'odbij sve', 'odbij', 'odbijam',
    'zavrni vse', 'zavrni', 'atmesti visus', 'atmesti', 'noraidit visus', 'noraidit', 'keeldu koigest', 'keeldu',
    // Russian / Ukrainian
    'отклонить все', 'отказаться от всех', 'отклонить', 'отказаться', 'только необходимые',
    'відхилити все', 'відхилити', 'відмовитися', 'тільки необхідні',
    // CJK
    '拒绝全部', '全部拒绝', '拒绝所有', '拒绝', '拒絕全部', '拒絕所有', '拒絕', 'すべて拒否', '全て拒否', '拒否', '모두 거부', '거부'
  ]);

  // Words that on their own, as the entire label, mean "no".
  const EXACT_REJECT = compile(['no', 'nej', 'nie', 'non', 'nein', 'nee', 'не', 'ne', 'nao', 'nu', 'ei']);

  // Opens the detailed preferences.
  const SETTINGS = compile([
    'manage preferences', 'manage my preferences', 'manage cookies', 'manage cookie preferences', 'manage options',
    'manage settings', 'manage consent', 'manage privacy', 'manage choices', 'manage my choices', 'more options',
    'more choices', 'cookie settings', 'cookie preferences', 'cookies settings', 'privacy settings',
    'privacy preferences', 'consent settings', 'consent preferences', 'advanced settings', 'set preferences',
    'set cookie preferences', 'show purposes', 'show vendors', 'show details', 'view preferences',
    'customize', 'customise', 'customize settings', 'customise settings', 'customize choices', 'personalize',
    'personalise', 'options', 'preferences', 'settings', 'configure', 'choices', 'review settings',
    // Bulgarian
    'настройки', 'управление на предпочитанията', 'управление на бисквитките', 'управление на настройките',
    'управление', 'персонализиране', 'персонализирай', 'повече опции', 'опции', 'предпочитания',
    'настройки на бисквитките', 'настройки за поверителност', 'избор',
    // German
    'einstellungen', 'cookie-einstellungen', 'cookie einstellungen', 'privatsphare-einstellungen',
    'datenschutzeinstellungen', 'datenschutz-einstellungen', 'anpassen', 'individuell anpassen', 'verwalten',
    'mehr optionen', 'weitere optionen', 'optionen', 'praferenzen', 'auswahl anpassen', 'konfigurieren',
    // French
    'parametres', 'parametrer', 'personnaliser', 'gerer', 'gerer mes choix', 'gerer mes preferences',
    'gerer les cookies', 'parametres des cookies', 'preferences', 'plus d\'options', 'options', 'choisir',
    // Spanish
    'configuracion', 'configurar', 'configurar cookies', 'personalizar', 'gestionar', 'gestionar preferencias',
    'gestionar opciones', 'mas opciones', 'opciones', 'preferencias', 'ajustes',
    // Italian
    'impostazioni', 'personalizza', 'gestisci', 'gestisci preferenze', 'gestisci le preferenze', 'altre opzioni',
    'opzioni', 'preferenze', 'configura',
    // Dutch
    'instellingen', 'cookie-instellingen', 'aanpassen', 'beheren', 'voorkeuren beheren', 'meer opties',
    'opties', 'voorkeuren', 'personaliseren',
    // Portuguese
    'configuracoes', 'configurar', 'personalizar', 'gerir', 'gerir preferencias', 'gerenciar preferencias',
    'mais opcoes', 'opcoes', 'preferencias',
    // Polish
    'ustawienia', 'dostosuj', 'zarzadzaj', 'zarzadzaj ustawieniami', 'wiecej opcji', 'opcje', 'preferencje',
    'ustawienia plikow cookie', 'ustaw preferencje',
    // Romanian
    'setari', 'personalizeaza', 'gestioneaza', 'mai multe optiuni', 'optiuni', 'preferinte', 'setari cookie',
    // Czech / Slovak
    'nastaveni', 'prizpusobit', 'spravovat', 'vice moznosti', 'moznosti', 'preference', 'nastavenia',
    'prispôsobit', 'spravovat nastaveni',
    // Greek
    'ρυθμισεις', 'προσαρμογη', 'διαχειριση', 'περισσοτερες επιλογες', 'επιλογες', 'προτιμησεις',
    // Nordic / Finnish
    'installningar', 'anpassa', 'hantera', 'fler alternativ', 'alternativ', 'indstillinger', 'tilpas',
    'administrer', 'flere muligheder', 'innstillinger', 'tilpass', 'asetukset', 'muokkaa', 'hallitse',
    // Russian / Ukrainian
    'настройки', 'настроить', 'управление', 'управлять', 'больше опций', 'параметры',
    'налаштування', 'налаштувати', 'керувати',
    // CJK
    '设置', '管理', '自定义', '設定', '管理', '設定を管理', '설정', '관리'
  ]);

  // Saves the choices made in the detailed preferences.
  const SAVE = compile([
    'save', 'save and exit', 'save and close', 'save and continue', 'save settings', 'save preferences',
    'save my preferences', 'save my choices', 'save choices', 'save selection', 'save changes', 'save consent',
    'save and apply', 'confirm', 'confirm choices', 'confirm my choices', 'confirm selection', 'confirm settings',
    'confirm preferences', 'apply', 'apply choices', 'apply settings', 'done', 'submit', 'submit choices',
    'allow selection', 'allow selected', 'accept selected', 'accept selection', 'use selection',
    // Bulgarian
    'запази', 'запази и затвори', 'запази настройките', 'запази избора', 'запазване', 'запазване на избора',
    'запазване на настройките', 'запиши', 'потвърди', 'потвърди избора', 'потвърди избора ми', 'потвърждавам',
    'приложи', 'готово',
    // German
    'speichern', 'speichern und schliessen', 'speichern und beenden', 'einstellungen speichern',
    'auswahl speichern', 'auswahl bestatigen', 'bestatigen', 'auswahl akzeptieren', 'auswahl zulassen',
    'ausgewahlte zulassen', 'anwenden', 'fertig',
    // French
    'enregistrer', 'enregistrer et quitter', 'enregistrer mes choix', 'enregistrer les preferences',
    'sauvegarder', 'valider', 'valider mes choix', 'confirmer', 'confirmer mes choix', 'appliquer', 'terminer',
    // Spanish
    'guardar', 'guardar y salir', 'guardar preferencias', 'guardar configuracion', 'guardar seleccion',
    'confirmar', 'confirmar mi seleccion', 'confirmar mis preferencias', 'confirmar seleccion', 'aplicar', 'listo',
    // Italian
    'salva', 'salva e esci', 'salva preferenze', 'salva le preferenze', 'salva impostazioni', 'conferma',
    'conferma selezione', 'conferma le mie scelte', 'conferma scelte', 'applica', 'fatto',
    // Dutch
    'opslaan', 'opslaan en afsluiten', 'voorkeuren opslaan', 'instellingen opslaan', 'keuze opslaan',
    'bevestigen', 'bevestig mijn keuze', 'bevestig keuze', 'toepassen', 'klaar',
    // Portuguese
    'guardar e sair', 'salvar', 'salvar preferencias', 'salvar e sair', 'confirmar escolhas', 'confirmar minhas escolhas',
    'aplicar', 'concluido',
    // Polish
    'zapisz', 'zapisz i zamknij', 'zapisz ustawienia', 'zapisz wybor', 'zapisz moj wybor', 'potwierdz',
    'potwierdz wybor', 'potwierdz moj wybor', 'zastosuj', 'gotowe',
    // Romanian
    'salveaza', 'salveaza si inchide', 'salveaza preferintele', 'salveaza setarile', 'confirma', 'confirma alegerile',
    'aplica',
    // Czech / Slovak
    'ulozit', 'ulozit a zavrit', 'ulozit nastaveni', 'ulozit predvolby', 'potvrdit', 'potvrdit vyber',
    'potvrdit moje volby', 'pouzit', 'ulozit vyber', 'ulozit moj vyber',
    // Greek
    'αποθηκευση', 'αποθηκευση και εξοδος', 'επιβεβαιωση', 'επιβεβαιωση επιλογων', 'εφαρμογη',
    // Nordic / Finnish
    'spara', 'spara och stang', 'spara installningar', 'bekrafta', 'bekrafta val', 'gem', 'gem indstillinger',
    'bekraft', 'lagre', 'lagre innstillinger', 'tallenna', 'vahvista', 'tallenna valinnat',
    // Russian / Ukrainian
    'сохранить', 'сохранить и закрыть', 'сохранить настройки', 'подтвердить', 'подтвердить выбор', 'применить',
    'зберегти', 'зберегти налаштування', 'підтвердити', 'підтвердити вибір',
    // CJK
    '保存', '保存设置', '保存并退出', '确认', '確認', '保存して閉じる', '保存', '저장', '확인'
  ]);

  // Buttons that object to legitimate-interest processing, or switch every toggle off at once.
  const OBJECT = compile([
    'object to all', 'object all', 'object', 'objection', 'object to legitimate interest',
    'object to all legitimate interests', 'withdraw legitimate interest', 'reject all legitimate interests',
    'opt out of all', 'oppose all', 'opposer a tout', 'sopposer a tout', 'sopposer',
    'alle widersprechen', 'widersprechen', 'widerspruch einlegen', 'allen widersprechen',
    'oponerse a todo', 'oponerse a todos', 'oponerse', 'opponiti a tutto', 'opponiti', 'oppormi a tutto',
    'bezwaar maken tegen alles', 'bezwaar maken', 'bezwaar', 'opor-se a tudo', 'opor-se', 'opor se a tudo',
    'sprzeciw', 'sprzeciwiam sie', 'sprzeciw wobec wszystkich', 'opunere', 'ma opun',
    'възразявам', 'възразявам срещу всички', 'възражение', 'възрази', 'възразяване',
    'namitka', 'namitat', 'namitati', 'vznest namitku', 'vznest namitku proti vsem', 'protestovat'
  ]);

  const DISABLE_ALL = compile([
    'disable all', 'turn off all', 'deselect all', 'unselect all', 'uncheck all', 'select none', 'switch off all',
    'toggle all off', 'deactivate all', 'clear all', 'turn all off', 'untick all',
    'изключи всички', 'изключване на всички', 'деактивирай всички', 'премахни всички',
    'alle deaktivieren', 'alle abwahlen', 'alle ausschalten', 'alle abschalten', 'alles deaktivieren',
    'tout desactiver', 'tout decocher', 'desactiver tout', 'tout deselectionner',
    'desactivar todo', 'desactivar todas', 'deseleccionar todo', 'desmarcar todo',
    'disattiva tutto', 'deseleziona tutto', 'disattiva tutti',
    'alles uitschakelen', 'alles deselecteren', 'alles uitzetten',
    'desativar tudo', 'desmarcar tudo', 'desselecionar tudo',
    'wylacz wszystkie', 'odznacz wszystkie', 'dezactiveaza toate', 'deselecteaza toate',
    'vypnout vse', 'zrusit vyber', 'vypnout vsechny'
  ]);

  // Tabs / sections of a detailed preference screen that hold more toggles.
  const TAB = compile([
    'legitimate interest', 'legitimate interests', 'legitimate interest purposes', 'purposes', 'special purposes',
    'features', 'special features', 'vendors', 'vendor list', 'our vendors', 'partners', 'our partners',
    'ad partners', 'advertising partners', 'third parties', 'third party', 'iab vendors', 'tcf vendors',
    'stacks', 'advertising', 'marketing', 'analytics', 'cookie list', 'cookie details', 'details', 'purposes and vendors',
    'законни интереси', 'легитимен интерес', 'легитимни интереси', 'цели', 'партньори', 'доставчици', 'функции',
    'специални цели', 'специални функции', 'реклама', 'маркетинг', 'статистика',
    'berechtigtes interesse', 'berechtigte interessen', 'zwecke', 'partner', 'anbieter', 'funktionen',
    'besondere zwecke', 'besondere funktionen', 'drittanbieter', 'werbung', 'marketing', 'statistik',
    'interet legitime', 'interets legitimes', 'finalites', 'partenaires', 'fournisseurs', 'fonctionnalites',
    'finalites speciales', 'fonctionnalites speciales', 'publicite',
    'interes legitimo', 'intereses legitimos', 'finalidades', 'socios', 'proveedores', 'funciones',
    'finalidades especiales', 'funciones especiales', 'publicidad',
    'interesse legittimo', 'interessi legittimi', 'finalita', 'fornitori', 'funzionalita', 'pubblicita',
    'gerechtvaardigd belang', 'gerechtvaardigde belangen', 'doeleinden', 'leveranciers', 'functies', 'reclame',
    'interesse legitimo', 'interesses legitimos', 'parceiros', 'fornecedores', 'funcionalidades', 'publicidade',
    'prawnie uzasadniony interes', 'cele', 'partnerzy', 'dostawcy', 'funkcje', 'reklama',
    'interes legitim', 'interese legitime', 'scopuri', 'parteneri', 'furnizori', 'functii',
    'opravneny zajem', 'ucely', 'partneri', 'dodavatele', 'funkce', 'reklama',
    'ρυθμισεις', 'σκοποι', 'συνεργατες', 'προμηθευτες',
    'berättigat intresse', 'berattigat intresse', 'andamal', 'partners', 'leverantorer', 'legitimt interesse',
    'formal', 'leverandorer', 'oikeutettu etu', 'tarkoitukset', 'kumppanit',
    'законный интерес', 'законные интересы', 'цели', 'партнеры', 'поставщики'
  ]);

  // Rows that must be left alone: strictly-necessary categories and "remember me" boxes.
  const ALWAYS_ON = compile([
    'always active', 'always on', 'always enabled', 'always required', 'strictly necessary', 'strictly required',
    'necessary cookies', 'essential cookies', 'required cookies', 'technical cookies', 'necessary', 'essential',
    'винаги активни', 'винаги активно', 'винаги включени', 'строго необходими', 'задължителни', 'необходими',
    'immer aktiv', 'stets aktiv', 'notwendig', 'unbedingt erforderlich', 'erforderlich', 'essenziell', 'technisch notwendig',
    'toujours actif', 'toujours actifs', 'strictement necessaires', 'necessaires', 'essentiels',
    'siempre activ', 'estrictamente necesarias', 'necesarias', 'esenciales', 'imprescindibles',
    'sempre attiv', 'strettamente necessari', 'necessari', 'essenziali',
    'altijd actief', 'strikt noodzakelijk', 'noodzakelijk', 'essentieel',
    'sempre ativ', 'estritamente necessarios', 'necessarios', 'essenciais',
    'zawsze aktywne', 'scisle niezbedne', 'niezbedne', 'wymagane',
    'intotdeauna active', 'strict necesare', 'necesare', 'esentiale',
    'vzdy aktivni', 'nezbytne', 'nutne', 'nevyhnutne', 'vzdy aktivne',
    'alltid aktiv', 'altid aktiv', 'nodvandiga', 'nodvendige', 'valttamattomat',
    'всегда активны', 'строго необходимые', 'необходимые', 'обязательные'
  ]);

  const KEEP = compile([
    'remember my choice', 'remember my choices', 'remember me', 'do not show again', "don't show again",
    'do not show this again', 'stay signed in', 'keep me signed in', 'keep me logged in',
    'запомни', 'не показвай отново', 'merken', 'nicht mehr anzeigen', 'se souvenir', 'ne plus afficher',
    'recordar', 'no volver a mostrar', 'ricorda', 'non mostrare piu', 'onthouden', 'niet meer tonen'
  ]);

  // Stems of words that mean "yes" in the languages above. Used only to VETO a button:
  // nothing that looks like an accept button is ever clicked.
  const ACCEPT_STEMS = [
    'accept', 'agree', 'allow', 'permit', 'enable', 'got', 'ok', 'okay', 'yes', 'sure',
    'прием', 'съгласен', 'съгласявам', 'разреш', 'разрешавам', 'добре', 'да',
    'akzept', 'zustimm', 'einverstanden', 'zulassen', 'erlauben', 'einwillig',
    'accepter', 'autoris', 'permettre', 'oui', 'jaccept',
    'acept', 'permitir', 'consentir', 'si',
    'accett', 'consenti', 'permetti',
    'accepteer', 'akkoord', 'toesta', 'ja',
    'aceit', 'concord', 'sim',
    'akcept', 'zgadz', 'zaakcept', 'zezwol', 'tak',
    'accept', 'sunt de acord', 'permite', 'da',
    'prijm', 'souhlas', 'povolit', 'suhlas', 'prijat',
    'αποδοχη', 'αποδεχομαι', 'συμφωνω', 'ναι',
    'godkan', 'tillat', 'tillad', 'hyvaksy', 'samtykk', 'samtykke',
    'elfogad', 'kabul', 'prihvati', 'sprejmi',
    'принять', 'принимаю', 'согласен', 'соглас', 'разрешить', 'прийняти', 'погоджуюсь',
    '接受', '同意', '允许', '許可', '同意する', '수락', '동의'
  ];
  const SELECTION_STEMS = [
    'select', 'selec', 'choice', 'choose', 'auswahl', 'ausgew', 'wybr', 'wyb', 'избр', 'избор', 'kies', 'gekozen',
    'vybr', 'vyber', 'valg', 'vald', 'valittu', 'scelt', 'elecc', 'escolh', 'alegeri', 'επιλογ'
  ];

  // ---------------------------------------------------------------- predicates

  const tooLong = (t) => !t || t.length > 90;

  function isAcceptLike(text) {
    const t = norm(text);
    if (!t) return false;
    if (CJK.test(t)) return ACCEPT_STEMS.some((s) => CJK.test(s) && t.includes(s));
    const tokens = t.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    return tokens.some((tok) =>
      ACCEPT_STEMS.some((s) => {
        const stem = norm(s);
        // very short stems must match the whole word; longer ones may be prefixes ("accepting")
        return stem.length <= 3 ? tok === stem : tok.startsWith(stem);
      })
    );
  }

  const ALL_WORDS = ['all', 'alle', 'alles', 'tout', 'tous', 'toutes', 'todo', 'todos', 'todas', 'tutto', 'tutti', 'tutte', 'wszystkie', 'toate', 'vse', 'vsechny', 'vsechna', 'всички', 'всё', 'все'];

  const mentionsSelection = (t) => SELECTION_STEMS.some((s) => t.includes(norm(s)));

  // "Reject all and subscribe" is the pay wall's way out, not a real "no".
  const PAYWALL = /(^|[^\p{L}])(subscri\p{L}*|abonn\p{L}*|abo|pay|paid|purchase|buy|premium|pur|sign in|log in|login)($|[^\p{L}])|подпиш|абонир|плати/u;

  function isReject(text) {
    const t = norm(text);
    if (tooLong(t) || PAYWALL.test(t)) return false;
    return EXACT_REJECT.includes(t) || anyPhrase(t, REJECT);
  }

  // "141 partners", "287 vendors": the link that opens the list of companies behind the dialog
  const PARTNER_COUNT = /^\d+\s+(partners?|vendors?|partenaires?|anbieter|socios|proveedores|partner[sz]?i?|fornitori|leveranciers|партньори|доставчици|dostawc\p{L}*)$/u;

  function isSettings(text) {
    const t = norm(text);
    if (tooLong(t) || t.length > 60) return false;
    if (isAcceptLike(t) && !mentionsSelection(t)) return false;
    return anyPhrase(t, SETTINGS) || PARTNER_COUNT.test(t);
  }

  function isSave(text) {
    const t = norm(text);
    if (tooLong(t) || t.length > 60) return false;
    if (isAcceptLike(t) && !mentionsSelection(t)) return false;
    const words = t.split(/[^\p{L}\p{N}]+/u);
    if (words.some((w) => ALL_WORDS.includes(w)) && !words.includes('save')) return false; // "confirm all" is not a save
    return anyPhrase(t, SAVE);
  }

  function isObject(text) {
    const t = norm(text);
    if (tooLong(t) || t.length > 60) return false;
    if (/withdraw|cancel|undo|remove|restore|заяви|отмени/.test(t) && !/legitimate/.test(t)) return false;
    return anyPhrase(t, OBJECT);
  }

  const isDisableAll = (text) => {
    const t = norm(text);
    return !tooLong(t) && t.length <= 60 && anyPhrase(t, DISABLE_ALL);
  };

  function isTabLabel(text) {
    const t = norm(text);
    if (!t || t.length > 40) return false;
    return TAB.includes(t) || TAB.some((p) => t.startsWith(p + ' ') || t.endsWith(' ' + p)) && t.split(' ').length <= 4;
  }

  // The "no" half of a per-purpose Accept / Reject button pair: a short label, never "reject ALL".
  function isChoiceNo(text) {
    const t = norm(text);
    if (!t || t.length > 24 || t.split(' ').length > 2) return false;
    if (t.split(/[^\p{L}\p{N}]+/u).some((w) => ALL_WORDS.includes(w))) return false;
    return isNegativeChoice(t);
  }

  const isAlwaysOn = (rowText) => {
    const t = norm(rowText);
    if (!t) return false;
    if (anyPhrase(t.slice(0, 70), ALWAYS_ON)) return true;
    return /always (active|on|enabled)|винаги активн|immer aktiv|toujours actif|siempre activ|sempre attiv|altijd actief|zawsze aktywn/.test(t);
  };

  const isKeep = (rowText) => anyPhrase(norm(rowText).slice(0, 120), KEEP);

  // A radio / button label that picks the "no" side of an Agree / Disagree pair.
  function isNegativeChoice(text) {
    const t = norm(text);
    if (!t || t.length > 40) return false;
    if (isReject(t) || isObject(t)) return true;
    return /^(off|disabled?|disagree|do not allow|block|opt out|object|withdraw|inactive|изключено|изключи|не|ne|nein|non|nee|aus|desactivado|disattivato|wylaczone)$/u.test(t);
  }

  // Does this text look like it belongs to a cookie / privacy consent dialog?
  const CONSENT_WORDS_STRONG = compile([
    'cookie', 'cookies', 'consent', 'gdpr', 'бисквитки', 'бисквитка', 'съгласие', 'einwilligung', 'zustimmung',
    'consentement', 'consentimiento', 'consenso', 'toestemming', 'zgoda', 'ciasteczka', 'consimtamant',
    'souhlas', 'soubory cookie', 'cookie-uri', 'piskotki', 'sutikimas', 'kolacici', 'sutik', 'cookiebot'
  ]);
  const CONSENT_WORDS_WEAK = compile([
    'privacy', 'tracking', 'personal data', 'personalised ads', 'personalized ads', 'legitimate interest', 'vendors',
    'partners', 'поверителност', 'лични данни', 'партньори', 'datenschutz', 'personenbezogene daten',
    'confidentialite', 'donnees personnelles', 'privacidad', 'datos personales', 'dati personali',
    'privacybeleid', 'persoonsgegevens', 'prywatnosc', 'dane osobowe', 'osobni udaje', 'ochrana soukromi'
  ]);

  function looksLikeConsentText(text) {
    const t = norm(text);
    if (!t) return false;
    if (CONSENT_WORDS_STRONG.some((w) => t.includes(w))) return true;
    let weak = 0;
    for (const w of CONSENT_WORDS_WEAK) if (t.includes(w) && ++weak >= 2) return true;
    return false;
  }

  DE.text = {
    norm,
    isReject,
    isSettings,
    isSave,
    isObject,
    isDisableAll,
    isTabLabel,
    isAcceptLike,
    isAlwaysOn,
    isKeep,
    isNegativeChoice,
    isChoiceNo,
    looksLikeConsentText
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DE.text;
})(typeof globalThis !== 'undefined' ? globalThis : this);
