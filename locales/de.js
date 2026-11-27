/* Agendo — Deutsch (core and plugins).
 *
 *   <script src="agendo.js"></script>
 *   <script src="locales/de.js"></script>
 *   new Agendo('#calendar', { locale: 'de-DE' });
 *
 * Keys: see Agendo.locales.en in agendo.js. Dates, weekdays and months come from Intl.
 */
Agendo.addLocale('de', {
  // Toolbar
  today: 'Heute', previous: 'Zurück', next: 'Weiter',
  day: 'Tag', workweek: 'Arbeitswoche', week: 'Woche', month: 'Monat', year: 'Jahr',
  list: 'Liste', resources: 'Ressourcen', timeline: 'Zeitleiste',
  timelineDays: { one: '{n} Tag', other: '{n} Tage' },
  filter: 'Filter', filterHidden: 'Filter ({n} ausgeblendet)', calendars: 'Kalender', categories: 'Kategorien',
  // Views
  allDayRow: 'ganztägig', allDayList: 'ganztägig', titleAllDay: '{title} (ganztägig)',
  noEvents: 'Keine Termine vorhanden', more: '+{n} weitere',
  dayEvents: { one: '{date}, {n} Termin', other: '{date}, {n} Termine' },
  weekNumber: 'Kalenderwoche {n}', weekShort: 'KW{n}', repeats: 'Wiederholt sich',
  // Popover and event form
  allDay: 'Ganztägig', resource: 'Ressource', calendar: 'Kalender', category: 'Kategorie', location: 'Ort',
  newEvent: 'Neuer Termin', editEvent: 'Termin bearbeiten', close: 'Schließen',
  title: 'Titel', start: 'Beginn', end: 'Ende', repeat: 'Wiederholung',
  repeatEvery: 'Wiederholen alle', interval: 'Intervall', unit: 'Einheit',
  unitDays: 'Tag(e)', unitWeeks: 'Woche(n)', unitMonths: 'Monat(e)', unitYears: 'Jahr(e)',
  onDays: 'Wochentage', ends: 'Endet', endsNever: 'Nie', endsOn: 'Am', endDate: 'Enddatum',
  endsAfter: 'Nach', occurrences: 'Terminen', occurrenceCount: 'Anzahl der Termine',
  delete: 'Löschen', cancel: 'Abbrechen', save: 'Speichern', ok: 'OK',
  // Repeat choices
  repeatNone: 'Wiederholt sich nicht', repeatDaily: 'Täglich', repeatWeekly: 'Wöchentlich am {weekday}',
  repeatWeekdays: 'Jeden Werktag (Montag bis Freitag)', repeatMonthly: 'Monatlich am {day}.',
  repeatMonthlyNth: 'Monatlich am {nth} {weekday}', repeatYearly: 'Jährlich am {date}', repeatCustom: 'Benutzerdefiniert…',
  nth1: 'ersten', nth2: 'zweiten', nth3: 'dritten', nth4: 'vierten', nth5: 'fünften', nthLast: 'letzten',
  // A rule in words
  ruleDaily: 'Täglich', ruleWeekly: 'Wöchentlich', ruleMonthly: 'Monatlich', ruleYearly: 'Jährlich',
  ruleEveryDays: 'Alle {n} Tage', ruleEveryWeeks: 'Alle {n} Wochen',
  ruleEveryMonths: 'Alle {n} Monate', ruleEveryYears: 'Alle {n} Jahre',
  ruleOnWeekdays: '{rule} an Werktagen', ruleOnDays: '{rule} am {days}', ruleOnNth: '{rule} am {nth} {weekday}',
  ruleOnDay: '{rule} am {day}.', ruleOnDate: '{rule} am {date}', ruleUntil: '{rule}, bis {date}',
  ruleCount: { one: '{rule}, einmal', other: '{rule}, {n}-mal' },
  // Recurring event
  scopeDelete: 'Wiederkehrenden Termin löschen', scopeEdit: 'Wiederkehrenden Termin bearbeiten',
  scopeChange: 'Wiederkehrenden Termin ändern',
  scopeThis: 'Dieser Termin', scopeFollowing: 'Dieser und alle folgenden Termine', scopeAll: 'Alle Termine',
  // Messages
  untitled: 'Termin ohne Titel', endAfterStart: 'Das Ende muss nach dem Beginn liegen',
  noPast: 'Termine können nicht in die Vergangenheit verschoben werden', dayOff: '{date} ist ein freier Tag',

  // Plugins
  'conflicts.overlaps': 'Überschneidet sich mit {titles}',
  'conflicts.bookedResource': '{resource} ist bereits gebucht: „{title}“ ({when})',
  'conflicts.booked': 'Diese Zeit ist bereits gebucht: „{title}“ ({when})',
  'eventDataModel.yes': 'Ja', 'eventDataModel.no': 'Nein',
  'ical.imported': { one: '{n} Termin importiert', other: '{n} Termine importiert' },
  'ical.exported': { one: '{n} Termin nach {file} exportiert', other: '{n} Termine nach {file} exportiert' },
  'ical.export': 'Als .ics exportieren', 'ical.import': '.ics-Datei importieren',
  'restStorage.loadFailed': 'Die Termine konnten nicht geladen werden',
  'restStorage.saveFailed': '„{title}“ konnte nicht gespeichert werden',
  'restStorage.deleteFailed': 'Der Termin konnte nicht gelöscht werden',
  'timeProgress.minutes': '{n} Min.', 'timeProgress.hours': '{h} Std.', 'timeProgress.hoursMinutes': '{h} Std. {m} Min.',
  'timeProgress.endsIn': 'Endet in {time}', 'timeProgress.left': '· noch {time}'
});
