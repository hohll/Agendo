/* Agendo — italiano (core and plugins).
 *
 *   <script src="agendo.js"></script>
 *   <script src="locales/it.js"></script>
 *   new Agendo('#calendar', { locale: 'it-IT' });
 *
 * Keys: see Agendo.locales.en in agendo.js. Dates, weekdays and months come from Intl.
 */
(function () {
  // "il primo lunedì", "l'ultimo venerdì", but "la prima domenica": the ordinal agrees with the weekday
  // (weekdayIndex 0 = domenica, the only feminine one).
  const nth = ({ n, weekdayIndex, weekday }) => {
    const f = weekdayIndex === 0;
    if (n < 0) return `${f ? 'l’ultima' : 'l’ultimo'} ${weekday}`;
    const word = (f ? ['prima', 'seconda', 'terza', 'quarta', 'quinta'] : ['primo', 'secondo', 'terzo', 'quarto', 'quinto'])[n - 1];
    return `${f ? 'la' : 'il'} ${word} ${weekday}`;
  };

  Agendo.addLocale('it', {
    // Toolbar
    today: 'Oggi', previous: 'Precedente', next: 'Successivo',
    day: 'Giorno', workweek: 'Settimana lavorativa', week: 'Settimana', month: 'Mese', year: 'Anno',
    list: 'Elenco', resources: 'Risorse', timeline: 'Cronologia',
    timelineDays: { one: '{n} giorno', other: '{n} giorni' },
    filter: 'Filtro', filterHidden: { one: 'Filtro ({n} nascosto)', other: 'Filtro ({n} nascosti)' },
    calendars: 'Calendari', categories: 'Categorie',
    // Views
    allDayRow: 'tutto il giorno', allDayList: 'tutto il giorno', titleAllDay: '{title} (tutto il giorno)',
    noEvents: 'Nessun evento da visualizzare', more: '+{n} altri',
    dayEvents: { one: '{date}, {n} evento', other: '{date}, {n} eventi' },
    weekNumber: 'Settimana {n}', weekShort: 'S{n}', repeats: 'Si ripete',
    // Popover and event form
    allDay: 'Tutto il giorno', resource: 'Risorsa', calendar: 'Calendario', category: 'Categoria', location: 'Luogo',
    newEvent: 'Nuovo evento', editEvent: 'Modifica evento', close: 'Chiudi',
    title: 'Titolo', start: 'Inizio', end: 'Fine', repeat: 'Ripetizione',
    repeatEvery: 'Ripeti ogni', interval: 'Intervallo', unit: 'Unità',
    unitDays: 'giorno/i', unitWeeks: 'settimana/e', unitMonths: 'mese/i', unitYears: 'anno/i',
    onDays: 'Giorni', ends: 'Termina', endsNever: 'Mai', endsOn: 'Il', endDate: 'Data di fine',
    endsAfter: 'Dopo', occurrences: 'occorrenze', occurrenceCount: 'Numero di occorrenze',
    delete: 'Elimina', cancel: 'Annulla', save: 'Salva', ok: 'OK',
    // Repeat choices
    repeatNone: 'Non si ripete', repeatDaily: 'Ogni giorno', repeatWeekly: 'Ogni settimana di {weekday}',
    repeatWeekdays: 'Tutti i giorni feriali (dal lunedì al venerdì)', repeatMonthly: 'Ogni mese il giorno {day}',
    repeatMonthlyNth: v => `Ogni mese ${nth(v)}`, repeatYearly: 'Ogni anno il {date}', repeatCustom: 'Personalizzato…',
    nth1: 'primo', nth2: 'secondo', nth3: 'terzo', nth4: 'quarto', nth5: 'quinto', nthLast: 'ultimo',
    // A rule in words
    ruleDaily: 'Ogni giorno', ruleWeekly: 'Ogni settimana', ruleMonthly: 'Ogni mese', ruleYearly: 'Ogni anno',
    ruleEveryDays: 'Ogni {n} giorni', ruleEveryWeeks: 'Ogni {n} settimane',
    ruleEveryMonths: 'Ogni {n} mesi', ruleEveryYears: 'Ogni {n} anni',
    ruleOnWeekdays: '{rule} nei giorni feriali', ruleOnDays: '{rule} di {days}', ruleOnNth: v => `${v.rule} ${nth(v)}`,
    ruleOnDay: '{rule} il giorno {day}', ruleOnDate: '{rule} il {date}', ruleUntil: '{rule}, fino al {date}',
    ruleCount: { one: '{rule}, una volta', other: '{rule}, {n} volte' },
    // Recurring event
    scopeDelete: 'Elimina evento ricorrente', scopeEdit: 'Modifica evento ricorrente', scopeChange: 'Cambia evento ricorrente',
    scopeThis: 'Questo evento', scopeFollowing: 'Questo evento e i successivi', scopeAll: 'Tutti gli eventi',
    // Messages
    untitled: 'Evento senza titolo', endAfterStart: 'La fine deve essere successiva all’inizio',
    noPast: 'Gli eventi non possono essere spostati nel passato', dayOff: '{date}: giorno non lavorativo',

    // Plugins
    'conflicts.overlaps': 'Si sovrappone a {titles}',
    'conflicts.bookedResource': '{resource} è già prenotato: «{title}» ({when})',
    'conflicts.booked': 'Questo orario è già prenotato: «{title}» ({when})',
    'eventDataModel.yes': 'Sì', 'eventDataModel.no': 'No',
    'ical.imported': { one: '{n} evento importato', other: '{n} eventi importati' },
    'ical.exported': { one: '{n} evento esportato in {file}', other: '{n} eventi esportati in {file}' },
    'ical.export': 'Esporta in .ics', 'ical.import': 'Importa un file .ics',
    'restStorage.loadFailed': 'Impossibile caricare gli eventi',
    'restStorage.saveFailed': 'Impossibile salvare «{title}»',
    'restStorage.deleteFailed': 'Impossibile eliminare l’evento',
    'timeProgress.minutes': '{n} min', 'timeProgress.hours': '{h} h', 'timeProgress.hoursMinutes': '{h} h {m} min',
    'timeProgress.endsIn': 'Termina tra {time}', 'timeProgress.left': '· mancano {time}'
  });
})();
