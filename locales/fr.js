/* Agendo — français (core and plugins).
 *
 *   <script src="agendo.js"></script>
 *   <script src="locales/fr.js"></script>
 *   new Agendo('#calendar', { locale: 'fr-FR' });
 *
 * Keys: see Agendo.locales.en in agendo.js. Dates, weekdays and months come from Intl.
 */
(function () {
  // "le 1er", "le 2" ; "1er novembre" (Intl writes "1 novembre").
  const day = d => (+d === 1 ? '1er' : d);
  const date = d => String(d).replace(/(^|\s)1 /, '$11er ');   // also "jeudi 1 juillet"
  // "le lundi et le mercredi": the article before each weekday.
  const list = new Intl.ListFormat('fr', { type: 'conjunction' });
  const theDays = weekdays => list.format(weekdays.map(w => `le ${w}`));

  Agendo.addLocale('fr', {
    // Toolbar
    today: 'Aujourd’hui', previous: 'Précédent', next: 'Suivant',
    day: 'Jour', workweek: 'Semaine de travail', week: 'Semaine', month: 'Mois', year: 'Année',
    list: 'Liste', resources: 'Ressources', timeline: 'Chronologie',
    timelineDays: { one: '{n} jour', other: '{n} jours' },
    filter: 'Filtre', filterHidden: { one: 'Filtre ({n} masqué)', other: 'Filtre ({n} masqués)' },
    calendars: 'Agendas', categories: 'Catégories',
    // Views
    allDayRow: 'journée', allDayList: 'toute la journée', titleAllDay: '{title} (toute la journée)',
    noEvents: 'Aucun événement à afficher', more: '+{n} autres',
    dayEvents: { one: '{date}, {n} événement', other: '{date}, {n} événements' },
    weekNumber: 'Semaine {n}', weekShort: 'S{n}', repeats: 'Se répète',
    // Popover and event form
    allDay: 'Toute la journée', resource: 'Ressource', calendar: 'Agenda', category: 'Catégorie', location: 'Lieu',
    newEvent: 'Nouvel événement', editEvent: 'Modifier l’événement', close: 'Fermer',
    title: 'Titre', start: 'Début', end: 'Fin', repeat: 'Répétition',
    repeatEvery: 'Répéter tous les', interval: 'Intervalle', unit: 'Unité',
    unitDays: 'jour(s)', unitWeeks: 'semaine(s)', unitMonths: 'mois', unitYears: 'an(s)',
    onDays: 'Jours', ends: 'Fin', endsNever: 'Jamais', endsOn: 'Le', endDate: 'Date de fin',
    endsAfter: 'Après', occurrences: 'occurrences', occurrenceCount: 'Nombre d’occurrences',
    delete: 'Supprimer', cancel: 'Annuler', save: 'Enregistrer', ok: 'OK',
    // Repeat choices
    repeatNone: 'Ne se répète pas', repeatDaily: 'Tous les jours', repeatWeekly: 'Toutes les semaines le {weekday}',
    repeatWeekdays: 'Tous les jours ouvrés (du lundi au vendredi)', repeatMonthly: v => `Tous les mois le ${day(v.day)}`,
    repeatMonthlyNth: 'Tous les mois le {nth} {weekday}', repeatYearly: v => `Tous les ans le ${date(v.date)}`, repeatCustom: 'Personnalisé…',
    nth1: 'premier', nth2: 'deuxième', nth3: 'troisième', nth4: 'quatrième', nth5: 'cinquième', nthLast: 'dernier',
    // A rule in words
    ruleDaily: 'Tous les jours', ruleWeekly: 'Toutes les semaines', ruleMonthly: 'Tous les mois', ruleYearly: 'Tous les ans',
    ruleEveryDays: 'Tous les {n} jours', ruleEveryWeeks: 'Toutes les {n} semaines',
    ruleEveryMonths: 'Tous les {n} mois', ruleEveryYears: 'Tous les {n} ans',
    ruleOnWeekdays: '{rule} en semaine', ruleOnDays: v => `${v.rule} ${theDays(v.weekdays)}`, ruleOnNth: '{rule} le {nth} {weekday}',
    ruleOnDay: v => `${v.rule} le ${day(v.day)}`, ruleOnDate: v => `${v.rule} le ${date(v.date)}`, ruleUntil: v => `${v.rule}, jusqu’au ${date(v.date)}`,
    ruleCount: { one: '{rule}, une fois', other: '{rule}, {n} fois' },
    // Recurring event
    scopeDelete: 'Supprimer un événement récurrent', scopeEdit: 'Modifier un événement récurrent',
    scopeChange: 'Modifier un événement récurrent',
    scopeThis: 'Cet événement', scopeFollowing: 'Cet événement et les suivants', scopeAll: 'Tous les événements',
    // Messages
    untitled: 'Événement sans titre', endAfterStart: 'La fin doit être après le début',
    noPast: 'Un événement ne peut pas être déplacé dans le passé', dayOff: v => `Le ${date(v.date)} est un jour non travaillé`,

    // Plugins
    'conflicts.overlaps': 'Chevauche {titles}',
    'conflicts.bookedResource': '{resource} est déjà réservé : « {title} » ({when})',
    'conflicts.booked': 'Ce créneau est déjà réservé : « {title} » ({when})',
    'eventDataModel.yes': 'Oui', 'eventDataModel.no': 'Non',
    'ical.imported': { one: '{n} événement importé', other: '{n} événements importés' },
    'ical.exported': { one: '{n} événement exporté dans {file}', other: '{n} événements exportés dans {file}' },
    'ical.export': 'Exporter en .ics', 'ical.import': 'Importer un fichier .ics',
    'restStorage.loadFailed': 'Impossible de charger les événements',
    'restStorage.saveFailed': 'Impossible d’enregistrer « {title} »',
    'restStorage.deleteFailed': 'Impossible de supprimer l’événement',
    'timeProgress.minutes': '{n} min', 'timeProgress.hours': '{h} h', 'timeProgress.hoursMinutes': '{h} h {m}',
    'timeProgress.endsIn': 'Se termine dans {time}', 'timeProgress.left': '· encore {time}'
  });
})();
