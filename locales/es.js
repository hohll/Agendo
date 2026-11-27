/* Agendo — español (core and plugins).
 *
 *   <script src="agendo.js"></script>
 *   <script src="locales/es.js"></script>
 *   new Agendo('#calendar', { locale: 'es-ES' });
 *
 * Keys: see Agendo.locales.en in agendo.js. Dates, weekdays and months come from Intl.
 */
Agendo.addLocale('es', {
  // Toolbar
  today: 'Hoy', previous: 'Anterior', next: 'Siguiente',
  day: 'Día', workweek: 'Semana laboral', week: 'Semana', month: 'Mes', year: 'Año',
  list: 'Lista', resources: 'Recursos', timeline: 'Cronología',
  timelineDays: { one: '{n} día', other: '{n} días' },
  filter: 'Filtro', filterHidden: { one: 'Filtro ({n} oculto)', other: 'Filtro ({n} ocultos)' },
  calendars: 'Calendarios', categories: 'Categorías',
  // Views
  allDayRow: 'todo el día', allDayList: 'todo el día', titleAllDay: '{title} (todo el día)',
  noEvents: 'No hay eventos para mostrar', more: '+{n} más',
  dayEvents: { one: '{date}, {n} evento', other: '{date}, {n} eventos' },
  weekNumber: 'Semana {n}', weekShort: 'S{n}', repeats: 'Se repite',
  // Popover and event form
  allDay: 'Todo el día', resource: 'Recurso', calendar: 'Calendario', category: 'Categoría', location: 'Ubicación',
  newEvent: 'Nuevo evento', editEvent: 'Editar evento', close: 'Cerrar',
  title: 'Título', start: 'Inicio', end: 'Fin', repeat: 'Repetición',
  repeatEvery: 'Repetir cada', interval: 'Intervalo', unit: 'Unidad',
  unitDays: 'día(s)', unitWeeks: 'semana(s)', unitMonths: 'mes(es)', unitYears: 'año(s)',
  onDays: 'Días', ends: 'Termina', endsNever: 'Nunca', endsOn: 'El', endDate: 'Fecha de fin',
  endsAfter: 'Después de', occurrences: 'repeticiones', occurrenceCount: 'Número de repeticiones',
  delete: 'Eliminar', cancel: 'Cancelar', save: 'Guardar', ok: 'Aceptar',
  // Repeat choices
  repeatNone: 'No se repite', repeatDaily: 'Cada día', repeatWeekly: 'Cada semana el {weekday}',
  repeatWeekdays: 'Todos los días laborables (de lunes a viernes)', repeatMonthly: 'Cada mes el día {day}',
  repeatMonthlyNth: 'Cada mes el {nth} {weekday}', repeatYearly: 'Cada año el {date}', repeatCustom: 'Personalizado…',
  nth1: 'primer', nth2: 'segundo', nth3: 'tercer', nth4: 'cuarto', nth5: 'quinto', nthLast: 'último',
  // A rule in words
  ruleDaily: 'Cada día', ruleWeekly: 'Cada semana', ruleMonthly: 'Cada mes', ruleYearly: 'Cada año',
  ruleEveryDays: 'Cada {n} días', ruleEveryWeeks: 'Cada {n} semanas',
  ruleEveryMonths: 'Cada {n} meses', ruleEveryYears: 'Cada {n} años',
  ruleOnWeekdays: '{rule} los días laborables', ruleOnDays: '{rule} el {days}', ruleOnNth: '{rule} el {nth} {weekday}',
  ruleOnDay: '{rule} el día {day}', ruleOnDate: '{rule} el {date}', ruleUntil: '{rule}, hasta el {date}',
  ruleCount: { one: '{rule}, una vez', other: '{rule}, {n} veces' },
  // Recurring event
  scopeDelete: 'Eliminar evento periódico', scopeEdit: 'Editar evento periódico', scopeChange: 'Cambiar evento periódico',
  scopeThis: 'Este evento', scopeFollowing: 'Este evento y los siguientes', scopeAll: 'Todos los eventos',
  // Messages
  untitled: 'Evento sin título', endAfterStart: 'El fin debe ser posterior al inicio',
  noPast: 'Los eventos no se pueden mover al pasado', dayOff: 'El {date} es un día no laborable',

  // Plugins
  'conflicts.overlaps': 'Se solapa con {titles}',
  'conflicts.bookedResource': '{resource} ya está reservado: «{title}» ({when})',
  'conflicts.booked': 'Esta franja ya está reservada: «{title}» ({when})',
  'eventDataModel.yes': 'Sí', 'eventDataModel.no': 'No',
  'ical.imported': { one: '{n} evento importado', other: '{n} eventos importados' },
  'ical.exported': { one: '{n} evento exportado a {file}', other: '{n} eventos exportados a {file}' },
  'ical.export': 'Exportar a .ics', 'ical.import': 'Importar un archivo .ics',
  'restStorage.loadFailed': 'No se pudieron cargar los eventos',
  'restStorage.saveFailed': 'No se pudo guardar «{title}»',
  'restStorage.deleteFailed': 'No se pudo eliminar el evento',
  'timeProgress.minutes': '{n} min', 'timeProgress.hours': '{h} h', 'timeProgress.hoursMinutes': '{h} h {m} min',
  'timeProgress.endsIn': 'Termina en {time}', 'timeProgress.left': '· quedan {time}'
});
