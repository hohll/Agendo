// Demo: create the calendar straight away, then load events.json into it.
// (fetch needs a local server — over file:// the calendar just starts empty.)
// The Customize sidebar changes the options: each change rebuilds the calendar with them,
// keeping its events, date, view and filter.

const toast = document.getElementById('log-toast');
let toastTimer;

function logAction(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.display = 'none'), 4000);
}

const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// --- Sample data ---

const RESOURCES = [
  { id: 'desk-1', title: 'Desk 1', color: '#3b82f6' },
  { id: 'desk-2', title: 'Desk 2', color: '#10b981' },
  { id: 'desk-3', title: 'Desk 3', color: '#f59e0b' }
];
const CALENDARS = [
  { id: 'work', title: 'Work', color: '#2563eb' },
  { id: 'personal', title: 'Personal', color: '#db2777' }
];
const CATEGORIES = [
  { id: 'meeting', title: 'Meeting', color: '#3b82f6' },
  { id: 'workshop', title: 'Workshop', color: '#f59e0b' },
  { id: 'social', title: 'Social', color: '#10b981' },
  { id: 'sport', title: 'Sport', color: '#ec4899' }
];
// The eventDataModel plugin's example: what an event holds, beyond the core fields.
const DEMO_MODEL = {
  fields: [
    { name: 'location', label: 'Location', type: 'text', placeholder: 'Room, address or link' },
    { name: 'priority', label: 'Priority', type: 'select', default: 'normal', popover: true,
      badge: v => ({ high: 'High', low: 'Low' })[v] ?? null,   // no badge for "normal"
      options: [{ value: 'low', label: 'Low', color: '#64748b' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High', color: '#dc2626' }] },
    { name: 'attendees', label: 'Attendees', type: 'number', min: 1, max: 50, popover: true,
      validate: (v, data) => (v > 20 && !data.online ? 'More than 20 attendees: make it an online meeting' : null) },
    { name: 'online', label: 'Online meeting', type: 'checkbox', badge: 'Online', popover: true },
    { name: 'description', label: 'Notes', type: 'textarea', help: 'Shown in the hover card' }
  ],
  order: ['title', 'location', 'priority']
};
// A value as JavaScript source, functions included, to show the example model as code.
function toCode(v, indent = '') {
  const inner = indent + '  ';
  if (typeof v === 'function') {
    // A function written over several lines: its body re-indented to where it now sits.
    const lines = v.toString().split('\n');
    const pad = Math.min(...lines.slice(1).filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
    return lines.map((l, i) => (i && Number.isFinite(pad) ? indent + l.slice(pad) : l)).join('\n');
  }
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
  if (v instanceof RegExp) return String(v);
  if (v instanceof Date) return `new Date('${v.toISOString()}')`;
  if (Array.isArray(v)) {
    if (v.every(x => typeof x !== 'object' || x === null)) return `[${v.map(x => toCode(x)).join(', ')}]`;
    return `[\n${v.map(x => inner + toCode(x, inner)).join(',\n')}\n${indent}]`;
  }
  if (v && typeof v === 'object') {
    const props = Object.entries(v).map(([k, x]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : toCode(k)}: ${toCode(x, inner)}`);
    const flat = `{ ${props.join(', ')} }`;
    return flat.length <= 90 && !flat.includes('\n') ? flat : `{\n${props.map(x => inner + x).join(',\n')}\n${indent}}`;
  }
  return String(v);
}

const TIMELINE_CUSTOM = { days: 3, slotMinutes: 30, labelMinutes: 60, label: '3 days' };
const ALL_VIEWS = ['day', 'workweek', 'week', 'month', 'year', 'list', 'resource', 'timeline'];

// --- Settings (what the sidebar edits) ---

const DEFAULTS = {
  theme: '',
  colorScheme: 'auto',
  views: ALL_VIEWS,
  locale: '',
  firstDayOfWeek: 1,
  use24Hour: false,
  weekNumbers: false,
  startHour: 7,
  endHour: 21,
  businessStart: 9,
  businessEnd: 18,
  slotsPerHour: 4,
  slotHeight: 22,
  showCurrentTime: true,
  allDaySlot: true,
  monthMaxEvents: 3,
  resources: true,
  resourceList: RESOURCES, // edited in the Resources section
  timelineCustom: true,
  filters: true,
  readonly: false,
  enableCreate: true,
  enableMove: true,
  enableResize: true,
  editPastEvents: true,
  daysOff: [],             // weekdays as strings ('0' = Sunday … '6' = Saturday)
  daysOffDates: '',        // 'YYYY-MM-DD' dates, separated by commas or spaces
  openEventOn: 'click',
  eventPopover: true,
  dialogExpand: true,
  enableAllDay: true,
  enableRecurring: true,
  // Plugins
  holidays: '',
  holidaysDisplay: 'background',
  conflicts: false,
  conflictsBlock: true,
  ical: false,
  timeProgress: false,
  dataModel: false,
  storage: false
};
const STORE = 'ago-demo-settings';

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    const s = { ...DEFAULTS, ...saved };
    if (s.theme && !['tabler', 'bootstrap', 'bulma'].includes(s.theme)) s.theme = '';  // a theme that was removed
    if (!['light', 'dark', 'auto'].includes(s.colorScheme)) s.colorScheme = DEFAULTS.colorScheme;
    const okRes = r => r && typeof r.id === 'string' && typeof r.title === 'string';
    if (!Array.isArray(s.resourceList) || !s.resourceList.every(okRes)) s.resourceList = DEFAULTS.resourceList;
    return s;
  } catch { return { ...DEFAULTS }; }
}

function saveSettings() {
  try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* storage unavailable */ }
}

let settings = loadSettings();

// The example model, shown under its switch.
document.getElementById('data-model-code').textContent = `Agendo.eventDataModel(${toCode(DEMO_MODEL)})`;

// The plugins the Plugins section turns on, with the code to show for each.
function pluginsOf(s) {
  return [
    s.holidays && [Agendo.holidays({ country: s.holidays, display: s.holidaysDisplay }),
      `Agendo.holidays({ country: '${s.holidays}'${s.holidaysDisplay === 'auto' ? ", display: 'auto'" : ''} })`],
    s.conflicts && [Agendo.conflicts({ by: 'resource', block: s.conflictsBlock }),
      `Agendo.conflicts({ by: 'resource'${s.conflictsBlock ? '' : ', block: false'} })`],
    s.ical && [Agendo.ical({ filename: 'agendo-demo.ics' }), "Agendo.ical({ filename: 'agendo-demo.ics' })"],
    s.timeProgress && [Agendo.timeProgress(), 'Agendo.timeProgress()'],
    s.dataModel && [Agendo.eventDataModel(DEMO_MODEL), `Agendo.eventDataModel(${toCode(DEMO_MODEL, '    ')})`],
    s.storage && [Agendo.restStorage({ url: 'api/events' }), "Agendo.restStorage({ url: '/api/events' })"]
  ].filter(Boolean).map(([plugin, code]) => Object.assign(plugin, { code }));
}

// The dates typed in "Other dates" that read as YYYY-MM-DD and exist, sorted, each once.
// A date that does not exist (2026-02-31, which Date.parse turns into 3 March) is dropped.
const realDate = x => { const [y, m, d] = x.split('-').map(Number), t = new Date(y, m - 1, d); return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d; };
const offDates = text => [...new Set(text.split(/[\s,;]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x) && realDate(x)))].sort();

// The daysOff option from the Days off section: Saturday and Sunday together read as 'weekend'.
function daysOffOf(s) {
  const weekdays = s.daysOff.map(Number).sort((a, b) => a - b);
  const weekend = weekdays.includes(0) && weekdays.includes(6);
  const list = [...(weekend ? ['weekend'] : []), ...weekdays.filter(d => !weekend || (d !== 0 && d !== 6)), ...offDates(s.daysOffDates)];
  return !list.length ? null : list.length === 1 && weekend ? 'weekend' : list;
}

// --- Sample data in the language of Customize → Locale (data/sample-texts.js) ---
// English is the data itself. A text is switched only while it is still one of the sample texts (in
// any language): an event you renamed keeps your text. Events from the database are left as stored.

const sampleLang = s => (s.locale || navigator.language).toLowerCase().split('-')[0];
const sampleTexts = s => SAMPLE_TEXTS[sampleLang(s)] ?? null;

// Calendars or categories with their names in the language.
const sampleNames = (list, kind, s) => list.map(x => ({ ...x, title: sampleTexts(s)?.[kind][x.id] ?? x.title }));

let sampleEnglish = null;   // id → { title, location?, description? } of events.json, kept at its first load

// What each sample text can read, per event id and field, in every language.
function sampleVariants() {
  const known = new Map();
  for (const [id, en] of Object.entries(sampleEnglish ?? {})) {
    for (const [field, text] of Object.entries(en)) {
      const all = [text, ...Object.values(SAMPLE_TEXTS).map(l => l.events[id]?.[field]).filter(Boolean)];
      known.set(`${id}:${field}`, new Set(all));
    }
  }
  return known;
}

// The sample events (and the performance test's) in the language of `s`; others are returned as is.
function localizeEvents(events, s = settings) {
  const lang = sampleTexts(s), known = sampleVariants();
  const generated = lang?.generated ?? generateEvents.TITLES;
  const anyGenerated = new Map([generateEvents.TITLES, ...Object.values(SAMPLE_TEXTS).map(l => l.generated)]
    .flatMap(list => list.map((t, i) => [t, i])));
  return events.map(ev => {
    // A sample event, or a part of a sample series split off by "This and following events" (id "1-2026-11-12").
    const id = String(ev.id).match(/^(\d+)(?:-\d{4}-\d{2}-\d{2})*$/)?.[1];
    if (id && sampleEnglish?.[id]) {
      const changes = {};
      for (const [field, en] of Object.entries(sampleEnglish[id])) {
        if (!known.get(`${id}:${field}`).has(ev[field])) continue;   // renamed: keep it
        const text = lang?.events[id]?.[field] ?? en;
        if (text !== ev[field]) changes[field] = text;
      }
      return Object.keys(changes).length ? { ...ev, ...changes } : ev;
    }
    // A performance test event: "<title> #<n>".
    const m = /^t\d+$/.test(ev.id) && /^(.*) #(\d+)$/.exec(ev.title ?? '');
    const i = m ? anyGenerated.get(m[1]) : undefined;
    return i === undefined || generated[i] === m[1] ? ev : { ...ev, title: `${generated[i]} #${m[2]}` };
  });
}

// Calendar options from the settings.
function toOptions(s) {
  return {
    theme: s.theme || null,
    colorScheme: s.colorScheme,
    views: s.views.length === ALL_VIEWS.length ? null : s.views,
    locale: s.locale || navigator.language,
    firstDayOfWeek: s.firstDayOfWeek,
    use24Hour: s.use24Hour,
    weekNumbers: s.weekNumbers,
    startHour: s.startHour,
    endHour: s.endHour,
    businessHours: { start: s.businessStart, end: s.businessEnd },
    slotsPerHour: s.slotsPerHour,
    slotHeight: s.slotHeight,
    showCurrentTime: s.showCurrentTime,
    allDaySlot: s.allDaySlot,
    monthMaxEvents: s.monthMaxEvents,
    resources: s.resources ? s.resourceList : [],
    timelineCustom: s.timelineCustom ? TIMELINE_CUSTOM : null,
    calendars: s.filters ? sampleNames(CALENDARS, 'calendars', s) : [],
    categories: s.filters ? sampleNames(CATEGORIES, 'categories', s) : [],
    readonly: s.readonly,
    enableCreate: s.enableCreate,
    enableMove: s.enableMove,
    enableResize: s.enableResize,
    editPastEvents: s.editPastEvents,
    daysOff: daysOffOf(s),
    openEventOn: s.openEventOn,
    eventPopover: s.eventPopover,
    dialogExpand: s.dialogExpand,
    enableAllDay: s.enableAllDay,
    enableRecurring: s.enableRecurring,
    plugins: pluginsOf(s)
  };
}

// --- Calendar ---

let calendar, builtWithStorage = null, builtLang = null;

function buildCalendar() {
  // Carry the current state over to the new calendar.
  const prev = calendar && {
    date: calendar.date,
    view: calendar.o.daysToShow,
    events: calendar.getEvents(),
    filter: calendar.getFilter(),
    calendars: calendar.getCalendars().map(c => c.id),
    categories: calendar.getCategories().map(c => c.id)
  };
  calendar?.destroy();
  // Database storage on or off: the events come from the database, or back from the samples.
  const storageChanged = builtWithStorage !== null && builtWithStorage !== settings.storage;
  if (prev && storageChanged) prev.events = [];
  // Another language: the sample events still showing a sample text switch to it (not the database's).
  if (prev && !settings.storage && builtLang !== null && builtLang !== sampleLang(settings)) prev.events = localizeEvents(prev.events);
  builtLang = sampleLang(settings);

  const opts = toOptions(settings);
  // Items unticked in the Filter menu stay unticked.
  const keepHidden = (list, known, shown) => list.map(x =>
    ({ ...x, visible: !known?.includes(x.id) || shown.includes(x.id) }));
  if (prev) {
    opts.calendars = keepHidden(opts.calendars, prev.calendars, prev.filter.calendars);
    opts.categories = keepHidden(opts.categories, prev.categories, prev.filter.categories);
  }

  calendar = new Agendo('#calendar-container', {
    ...opts,
    date: prev?.date ?? new Date(),
    daysToShow: prev?.view ?? 7,
    events: prev?.events ?? [],
    onFilterChange: f => logAction(`Filter: ${[...f.calendars, ...f.categories].join(', ') || 'nothing'} shown`),
    onEventChange: (ev, action, info) => { logAction(`${action}${info ? ` (${info.scope})` : ''}: "${ev.title}" ${fmt(ev.start)} – ${fmt(ev.end)}`); refreshDbSoon(); renderResList(); },
    onEventCreate: (ev, info) => { logAction(`Created "${ev.title}"${info ? ` (${info.scope})` : ''}`); refreshDbSoon(); renderResList(); },
    onEventDelete: (id, info) => { logAction(`Deleted event ${id}${info ? ` (${info.scope})` : ''}`); refreshDbSoon(); renderResList(); }
  });
  showCode(opts);
  renderLists();
  watchRenders();
  if (storageChanged && !settings.storage) loadSample();
  builtWithStorage = settings.storage;
  showStorageStatus();
}

// What each storage of the database API is called in the sidebar.
const STORAGE_NAMES = { sqlite: 'SQLite database', json: 'JSON file', browser: 'browser database (IndexedDB, this browser only)' };

// The restStorage plugin when "Database storage" is on.
const storage = () => calendar.getPlugin('restStorage');

function showStorageStatus() {
  showDbPanel();
  if (!settings.storage) document.getElementById('db-empty-status').textContent = '';
  const el = document.getElementById('storage-status');
  if (!storage()) {
    el.innerHTML = 'Saves to <code>node server/server.js</code> when it serves the page, otherwise to this browser';
    return;
  }
  el.textContent = 'Connecting…';
  storage().health()
    .then(h => { el.textContent = `Connected: ${STORAGE_NAMES[h.storage] ?? h.storage} · ${num(h.events)} events stored`; })
    .catch(err => { el.textContent = `Database not reachable: ${err.message}`; });
}

// --- Database panel: the rows server/server.js has stored (GET /api/rows), last changed first ---
// Rows added or changed since the previous refresh are highlighted; deleted ones are counted.

const DB_LIMIT = 100;
let dbSnapshot = null;   // id → updated_at (or the row's JSON for the JSON-file storage) at the last refresh
let dbTimer = 0;

// Whether the rows are on screen: storage on, sidebar open, content shown.
const dbShown = () => settings.storage && panel.classList.contains('is-open') && !document.getElementById('db-body').hidden;

// The Database section follows "Database storage"; its content is shown or hidden by its button
// (remembered in this browser).
const DB_OPEN_KEY = 'ago-demo-db-open';
function showDbPanel() {
  let open = false;
  try { open = localStorage.getItem(DB_OPEN_KEY) === '1'; } catch { /* storage unavailable */ }
  document.getElementById('db-panel').hidden = !settings.storage;
  showFoldAll();
  document.getElementById('db-body').hidden = !open;
  const btn = document.getElementById('db-toggle');
  btn.setAttribute('aria-expanded', open);
  btn.textContent = open ? 'Hide database content' : 'Show database content';
  if (dbShown()) refreshDb();
}

async function refreshDb() {
  if (!dbShown()) return;
  const status = document.getElementById('db-status'), list = document.getElementById('db-rows');
  let res;
  try {
    const r = await fetch('api/rows?limit=' + DB_LIMIT, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    res = await r.json();
  } catch {
    status.textContent = 'Could not read the database';
    list.replaceChildren();
    dbSnapshot = null;
    return;
  }
  const stamp = row => row.updated_at ?? JSON.stringify(row.data);
  const prev = dbSnapshot, next = new Map(res.rows.map(row => [row.id, stamp(row)]));
  const changed = new Set(prev ? res.rows.filter(row => prev.get(row.id) !== stamp(row)).map(row => row.id) : []);
  const deleted = prev ? [...prev.keys()].filter(id => !next.has(id)).length : 0;
  dbSnapshot = next;

  const time = iso => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' }) : '—');
  list.replaceChildren(...res.rows.map(row => {
    const li = document.createElement('li');
    li.classList.toggle('is-changed', changed.has(row.id));
    const det = document.createElement('details'), sum = document.createElement('summary');
    const title = document.createElement('span'), meta = document.createElement('span');
    title.className = 'db-title';
    title.textContent = row.data.title || '(no title)';
    meta.className = 'db-meta';
    meta.textContent = `id ${row.id}${row.recurring ? ' · recurring' : ''} · ${row.updated_at ? `updated ${time(row.updated_at)}` : 'no change time (JSON file)'}`;
    sum.append(title, meta);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify({ start_ms: `${row.start_ms} (${time(new Date(row.start_ms).toISOString())})`,
      end_ms: `${row.end_ms} (${time(new Date(row.end_ms).toISOString())})`, recurring: row.recurring, data: row.data }, null, 2);
    det.append(sum, pre);
    li.append(det);
    return li;
  }));
  if (!res.rows.length) list.innerHTML = '<li class="db-empty">No rows stored</li>';

  const diff = [changed.size && `${changed.size} changed`, deleted && `${deleted} deleted`].filter(Boolean).join(', ');
  status.textContent = `${STORAGE_NAMES[res.storage] ?? res.storage} · ${num(res.total)} rows` +
    (res.total > res.rows.length ? ` (last ${res.rows.length} shown)` : '') +
    (diff ? ` · ${diff}` : '') + ` · ${new Date().toLocaleTimeString()}`;
}

// After a change in the calendar: refresh once restStorage has sent it (sidebar open only).
function refreshDbSoon(tries = 30) {
  clearTimeout(dbTimer);
  if (!dbShown()) return;
  dbTimer = setTimeout(() => (storage()?.pending && tries > 0 ? refreshDbSoon(tries - 1) : refreshDb()), 150);
}

// --- Themes: load the CSS framework from the CDN ---
// The page's own light colour mode is pinned so a dark OS setting does not flip Bulma.
const FRAMEWORKS = {
  tabler: ['https://cdn.jsdelivr.net/npm/@tabler/core@1.7.5/dist/css/tabler.min.css',
    'sha384-BY4EnLpEeqBnDZno/u4SjmwHqbv1/U9as69Q0Jk/zeaDJ8iV10NK7FP+6fFEGW4i'],
  bootstrap: ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.9/dist/css/bootstrap.min.css',
    'sha384-yEPZ7jP9S0QKiUQ0m3jjsO4ProIW7wvR9gXkI7JOGa2XVsw53Yke2bsdkBbjmmiX'],
  bulma: ['https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css',
    'sha384-DCY3M8xLkMu6c9IKcKbe+jHKMjelnwC0p+SBaxfHxoBYZWdJF2X400UdBCgATtAB']
};

function loadFramework(name) {
  const link = document.getElementById('framework-css'), fw = FRAMEWORKS[name];
  if (fw) { link.integrity = fw[1]; link.href = fw[0]; } else { link.integrity = ''; link.removeAttribute('href'); }
}

// --- Customize sidebar ---

const panel = document.getElementById('customize');
const form = document.getElementById('customize-form');
const toggleBtn = document.getElementById('customize-btn');
document.getElementById('db-refresh').addEventListener('click', () => refreshDb());
// "Empty database": deletes every stored event (DELETE /api/events). A first click arms the button,
// a second one within 5 seconds empties the database; the calendar then reloads (now empty).
let emptyArmed = 0;
document.getElementById('db-empty').addEventListener('click', async () => {
  const btn = document.getElementById('db-empty'), note = document.getElementById('db-empty-status');
  const disarm = () => { clearTimeout(emptyArmed); emptyArmed = 0; btn.textContent = 'Empty database'; btn.classList.remove('is-armed'); };
  if (!emptyArmed) {
    btn.textContent = 'Click again to delete every event';
    btn.classList.add('is-armed');
    note.textContent = 'This cannot be undone.';
    emptyArmed = setTimeout(() => { disarm(); note.textContent = ''; }, 5000);
    return;
  }
  disarm();
  btn.disabled = true;
  try {
    const r = await fetch('api/events', { method: 'DELETE', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { deleted } = await r.json();
    note.textContent = `${num(deleted)} events deleted.`;
    logAction(`Database emptied: ${num(deleted)} events deleted`);
    storage()?.reload();
    renderLists();
    showStorageStatus();
  } catch (err) {
    note.textContent = `Could not empty the database: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('db-toggle').addEventListener('click', () => {
  const open = document.getElementById('db-body').hidden;
  try { localStorage.setItem(DB_OPEN_KEY, open ? '1' : '0'); } catch { /* storage unavailable */ }
  showDbPanel();
});

function setPanel(open) {
  panel.classList.toggle('is-open', open);
  panel.inert = !open;
  toggleBtn.setAttribute('aria-expanded', open);
  if (open) { panel.querySelector('[data-close]').focus(); refreshDb(); }
  else if (panel.contains(document.activeElement) || document.activeElement === document.body) toggleBtn.focus();
}

toggleBtn.addEventListener('click', () => setPanel(!panel.classList.contains('is-open')));
panel.querySelector('[data-close]').addEventListener('click', () => setPanel(false));
panel.addEventListener('keydown', e => {
  // Escape inside an open calendar dialog or menu is theirs; here it only closes the sidebar.
  if (e.key === 'Escape') { e.preventDefault(); setPanel(false); }
});

// --- Folding sections: each legend becomes a button that shows or hides the rest of its section ---
// The closed sections are remembered in this browser (all open by default). The button in the
// sidebar's head folds them all, or unfolds them all once every section shown is folded.

const FOLD_KEY = 'ago-demo-closed-sections';
let closedSections;
try { closedSections = new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || '[]')); } catch { closedSections = new Set(); }

const sections = [];   // { key, fieldset, show(open), isOpen() }
const foldAllBtn = document.getElementById('fold-all');

function saveClosed() {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...closedSections])); } catch { /* storage unavailable */ }
}

// "Collapse all" while a section in view is open, else "Expand all".
function showFoldAll() {
  const anyOpen = sections.some(s => !s.fieldset.hidden && s.isOpen());
  foldAllBtn.textContent = anyOpen ? 'Collapse all' : 'Expand all';
}

const CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

for (const legend of form.querySelectorAll('fieldset > legend')) {
  const fieldset = legend.parentElement;
  const key = legend.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const body = Object.assign(document.createElement('div'), { className: 'section-body', id: `section-${key}` });
  body.append(...[...fieldset.childNodes].filter(n => n !== legend));
  fieldset.append(body);
  const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'section-toggle', innerHTML: CHEVRON });
  btn.append(...legend.childNodes);
  btn.setAttribute('aria-controls', body.id);
  legend.append(btn);
  const show = open => {
    btn.setAttribute('aria-expanded', open);
    body.hidden = !open;
    closedSections[open ? 'delete' : 'add'](key);
  };
  sections.push({ key, fieldset, show, isOpen: () => !body.hidden });
  show(!closedSections.has(key));
  btn.addEventListener('click', () => { show(body.hidden); saveClosed(); showFoldAll(); });
}

foldAllBtn.addEventListener('click', () => {
  const open = foldAllBtn.textContent === 'Expand all';
  for (const s of sections) s.show(open);
  saveClosed();
  showFoldAll();
});
showFoldAll();

// Settings → form controls.
function fillForm(s) {
  for (const el of form.elements) {
    if (!el.name || !(el.name in s)) continue;
    const v = s[el.name];
    if (el.type === 'checkbox') el.checked = Array.isArray(v) ? v.includes(el.value) : !!v;
    else if (el.type === 'radio') el.checked = el.value === String(v);
    else el.value = v;
  }
  form.elements.slotHeightOut.value = `${s.slotHeight}px`;
  syncEditing();
}

// Form controls → settings, with the hours kept in range.
function readForm() {
  const f = form.elements, num = (name, min, max) => Math.min(max, Math.max(min, Math.round(+f[name].value || 0)));
  const s = {
    theme: f.theme.value,
    colorScheme: f.colorScheme.value,
    views: [...form.querySelectorAll('[name="views"]:checked')].map(b => b.value),
    locale: f.locale.value,
    firstDayOfWeek: +f.firstDayOfWeek.value,
    use24Hour: f.use24Hour.checked,
    weekNumbers: f.weekNumbers.checked,
    startHour: num('startHour', 0, 23),
    endHour: num('endHour', 1, 24),
    businessStart: num('businessStart', 0, 23),
    businessEnd: num('businessEnd', 1, 24),
    slotsPerHour: +f.slotsPerHour.value,
    slotHeight: +f.slotHeight.value,
    showCurrentTime: f.showCurrentTime.checked,
    allDaySlot: f.allDaySlot.checked,
    monthMaxEvents: num('monthMaxEvents', 1, 10),
    resources: f.resources.checked,
    resourceList: settings.resourceList,
    timelineCustom: f.timelineCustom.checked,
    filters: f.filters.checked,
    readonly: f.readonly.checked,
    enableCreate: f.enableCreate.checked,
    enableMove: f.enableMove.checked,
    enableResize: f.enableResize.checked,
    editPastEvents: f.editPastEvents.checked,
    daysOff: [...form.querySelectorAll('[name="daysOff"]:checked')].map(b => b.value),
    daysOffDates: offDates(f.daysOffDates.value).join(', '),
    openEventOn: f.openEventOn.value,
    eventPopover: f.eventPopover.checked,
    dialogExpand: f.dialogExpand.checked,
    enableAllDay: f.enableAllDay.checked,
    enableRecurring: f.enableRecurring.checked,
    holidays: f.holidays.value,
    holidaysDisplay: f.holidaysDisplay.value,
    conflicts: f.conflicts.checked,
    conflictsBlock: f.conflictsBlock.checked,
    ical: f.ical.checked,
    timeProgress: f.timeProgress.checked,
    dataModel: f.dataModel.checked,
    storage: f.storage.checked
  };
  if (s.endHour <= s.startHour) s.endHour = s.startHour + 1;
  if (s.businessEnd <= s.businessStart) s.businessEnd = Math.min(24, s.businessStart + 1);
  if (!s.views.length) s.views = ['week'];  // keep at least one view
  return s;
}

// Read-only turns the editing switches off; a plugin's own options follow the plugin.
function syncEditing() {
  const f = form.elements, ro = f.readonly.checked;
  for (const n of ['enableCreate', 'enableMove', 'enableResize', 'editPastEvents', 'enableAllDay', 'enableRecurring']) f[n].disabled = ro;
  for (const r of form.querySelectorAll('[name="holidaysDisplay"]')) r.disabled = !f.holidays.value;
  f.conflictsBlock.disabled = !f.conflicts.checked;
  const sat = form.querySelector('[name="daysOff"][value="6"]'), sun = form.querySelector('[name="daysOff"][value="0"]');
  document.getElementById('days-off-weekend').setAttribute('aria-pressed', sat.checked && sun.checked);
}

// "Week end": Saturday and Sunday on together, or off together when both were on.
document.getElementById('days-off-weekend').addEventListener('click', () => {
  const sat = form.querySelector('[name="daysOff"][value="6"]'), sun = form.querySelector('[name="daysOff"][value="0"]');
  sat.checked = sun.checked = !(sat.checked && sun.checked);
  sat.dispatchEvent(new Event('change', { bubbles: true }));
});

form.addEventListener('input', e => {
  if (e.target.name === 'slotHeight') form.elements.slotHeightOut.value = `${e.target.value}px`;
});

form.addEventListener('change', e => {
  const next = readForm();
  // Theme and colour scheme switch in place; any other option rebuilds the calendar.
  const inPlace = Object.keys(next).every(k =>
    k === 'theme' || k === 'colorScheme' || JSON.stringify(next[k]) === JSON.stringify(settings[k]));
  settings = next;
  saveSettings();
  fillForm(settings);  // shows any value that was corrected
  loadFramework(settings.theme);
  applyPageScheme();
  if (inPlace) {
    calendar.setTheme(settings.theme || null);
    calendar.setColorScheme(settings.colorScheme);
    showCode(toOptions(settings));
  } else buildCalendar();
});
form.addEventListener('submit', e => e.preventDefault());

panel.querySelector('[data-reset]').addEventListener('click', () => {
  settings = { ...DEFAULTS };
  saveSettings();
  fillForm(settings);
  loadFramework(settings.theme);
  applyPageScheme();
  buildCalendar();
  logAction('Options reset to defaults');
});

// The options that differ from Agendo.defaults, as code to paste.
function showCode(opts) {
  const lines = [];
  for (const [k, v] of Object.entries(opts)) {
    if (JSON.stringify(v) === JSON.stringify(Agendo.defaults[k])) continue;
    if (k === 'locale' && !settings.locale) continue;
    if (k === 'plugins') { lines.push(`  plugins: [\n    ${v.map(p => p.code).join(',\n    ')}\n  ]`); continue; }
    const val = Array.isArray(v) && v.length && typeof v[0] === 'object'
      ? `[ /* ${v.length} ${k} */ ]`
      : JSON.stringify(v).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ');
    lines.push(`  ${k}: ${val}`);
  }
  document.getElementById('customize-code').textContent =
    `new Agendo('#calendar', {\n${lines.join(',\n')}\n});`;
}

panel.querySelector('[data-copy]').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('customize-code').textContent);
    logAction('Options copied');
  } catch { logAction('Copy not available here'); }
});

// --- Background events: list, add, edit, delete (public API: addEvent / updateEvent / deleteEvent) ---
// They cannot be clicked in the calendar (clicks go through them), so the sidebar manages them.

const bgList = document.getElementById('bg-list');
const bgDialog = document.getElementById('bg-dialog');
const bgForm = document.getElementById('bg-form');
const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const isBgEvent = ev => ev.display === 'background' || ev.display === 'inverse-background';
const pad = n => String(n).padStart(2, '0');
const dayValue = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateTimeValue = d => `${dayValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const readDate = el => (el.type === 'date' ? new Date(`${el.value}T00:00`) : new Date(el.value));
let bgEditing = null;

// Which repeat choice a rule is ('keep' when it is none of them).
function repeatKind(r, start) {
  if (!r) return 'none';
  if (r.interval > 1 || r.until || r.count) return 'keep';
  const by = (r.byDay ?? []).join(',');
  if (r.freq === 'daily' && !by) return 'daily';
  if (r.freq === 'weekly' && by === 'MO,TU,WE,TH,FR') return 'weekdays';
  if (r.freq === 'weekly' && (!by || by === WEEKDAY_CODES[start.getDay()])) return 'weekly';
  return 'keep';
}

function repeatRule(kind, start) {
  switch (kind) {
    case 'daily': return { freq: 'daily' };
    case 'weekdays': return { freq: 'weekly', byDay: ['MO', 'TU', 'WE', 'TH', 'FR'] };
    case 'weekly': return { freq: 'weekly', byDay: [WEEKDAY_CODES[start.getDay()]] };
  }
  return null;
}

function bgWhen(ev) {
  const time = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = d => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const kind = repeatKind(ev.recurrence, ev.start);
  const when = { none: day(ev.start), daily: 'Every day', weekdays: 'Weekdays',
    weekly: `Every ${ev.start.toLocaleDateString([], { weekday: 'long' })}`, keep: `Repeats from ${day(ev.start)}` }[kind];
  const hours = ev.allDay ? 'all day' : `${time(ev.start)}–${time(ev.end)}`;
  const res = calendar.getResources().find(r => r.id === ev.resourceId);
  return `${when}, ${hours}${res ? ` · ${res.title}` : ''}${ev.display === 'inverse-background' ? ' · outside' : ''}`;
}

function renderBgList() {
  const items = calendar.getEvents().filter(isBgEvent).sort((a, b) => a.start - b.start);
  if (!items.length) {
    bgList.replaceChildren(Object.assign(document.createElement('li'), { className: 'bg-empty', textContent: 'None yet.' }));
    return;
  }
  bgList.replaceChildren(...items.map(ev => {
    const li = document.createElement('li');
    const swatch = Object.assign(document.createElement('span'), { className: 'bg-swatch' });
    swatch.style.setProperty('--c', ev.color || '#8fdf82');
    const text = document.createElement('div');
    text.append(
      Object.assign(document.createElement('div'), { className: 'bg-name', textContent: ev.title || '(no title)' }),
      Object.assign(document.createElement('div'), { className: 'bg-when', textContent: bgWhen(ev) }));
    const btn = (label, action) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'demo-btn small', textContent: label });
      b.dataset[action] = ev.id;
      b.setAttribute('aria-label', `${label} ${ev.title || 'background event'}`);
      return b;
    };
    li.append(swatch, text, btn('Edit', 'edit'), btn('Delete', 'delete'));
    return li;
  }));
}

function setBgDates(allDay, start, end) {
  const f = bgForm.elements;
  f.start.type = f.end.type = allDay ? 'date' : 'datetime-local';
  const last = new Date(end);
  last.setDate(last.getDate() - 1);   // all-day ends are exclusive; the form shows the last day
  f.start.value = allDay ? dayValue(start) : dateTimeValue(start);
  f.end.value = allDay ? dayValue(last < start ? start : last) : dateTimeValue(end);
}

function openBgDialog(ev) {
  bgEditing = ev;
  const f = bgForm.elements;
  const start = ev?.start ?? (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; })();
  const end = ev?.end ?? new Date(+start + 36e5);
  f.title.value = ev?.title ?? '';
  f.display.value = ev?.display ?? 'background';
  f.color.value = ev?.color ?? '#94a3b8';
  f.allDay.checked = !!ev?.allDay;
  setBgDates(f.allDay.checked, start, end);
  f.resourceId.replaceChildren(new Option('All resources', ''), ...calendar.getResources().map(r => new Option(r.title, r.id)));
  f.resourceId.value = ev?.resourceId ?? '';
  const kind = repeatKind(ev?.recurrence, start);
  f.repeat.querySelector('[value="keep"]').hidden = kind !== 'keep';
  f.repeat.value = kind;
  bgForm.querySelector('[value="delete"]').hidden = !ev;
  document.getElementById('bg-dialog-title').textContent = ev ? 'Edit background event' : 'New background event';
  bgDialog.showModal();
}

bgForm.elements.allDay.addEventListener('change', () => {
  const f = bgForm.elements, s = readDate(f.start), e = readDate(f.end);
  if (f.allDay.checked) {
    const end = new Date(e < s ? s : e);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    setBgDates(true, s, end);
  } else {
    const start = new Date(s), last = new Date(e);
    start.setHours(12, 0, 0, 0);
    last.setHours(13, 0, 0, 0);
    setBgDates(false, start, last < start ? new Date(+start + 36e5) : last);
  }
});

bgForm.addEventListener('submit', e => {
  const f = bgForm.elements, action = e.submitter?.value;
  if (action === 'delete' && bgEditing) {
    calendar.deleteEvent(bgEditing.id);
    storage()?.remove(bgEditing.id);
    refreshDbSoon();
    logAction(`Deleted background event "${bgEditing.title}"`);
  } else if (action === 'save') {
    const allDay = f.allDay.checked, start = readDate(f.start);
    let end = readDate(f.end);
    if (allDay) end.setDate(end.getDate() + 1);
    if (!(end > start)) end = allDay ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) : new Date(+start + 36e5);
    const data = {
      title: f.title.value.trim(), display: f.display.value, color: f.color.value, allDay, start, end,
      resourceId: f.resourceId.value || undefined,
      recurrence: f.repeat.value === 'keep' ? bgEditing?.recurrence : repeatRule(f.repeat.value, start)
    };
    if (bgEditing) {
      calendar.updateEvent(bgEditing.id, data);
      storage()?.save(calendar.getEvents().find(x => x.id === bgEditing.id));
      refreshDbSoon();
      logAction(`Updated background event "${data.title}"`);
    } else {
      storage()?.save(calendar.addEvent({ id: `bg-${Date.now()}`, ...data }));
      refreshDbSoon();
      logAction(`Added background event "${data.title}"`);
    }
  }
  renderLists();
});

// Enter saves (the browser would press the form's first button: Delete).
Agendo.enterSubmits(bgForm, bgForm.querySelector('[value="save"]'));

document.getElementById('bg-add').addEventListener('click', () => openBgDialog(null));
bgList.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const ev = calendar.getEvents().find(x => x.id === (btn.dataset.edit ?? btn.dataset.delete));
  if (!ev) return;
  if (btn.dataset.edit) return openBgDialog(ev);
  calendar.deleteEvent(ev.id);
  storage()?.remove(ev.id);
  refreshDbSoon();
  logAction(`Deleted background event "${ev.title}"`);
  renderLists();
});

// --- Resources: list, add, rename, recolour, reorder, delete (public API: setResources) ---
// The list is a setting (remembered in this browser, restored by Reset to defaults). Deleting a
// resource leaves its events alone: they keep their resourceId, so adding back a resource with
// that id shows them again; meanwhile they only show in the views without resources.

const resPanel = document.getElementById('res-panel');
const resList = document.getElementById('res-list');
const resDialog = document.getElementById('res-dialog');
const resForm = document.getElementById('res-form');
const RES_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];
let resEditing = null;

function renderLists() { renderBgList(); renderResList(); }

// The events (background events too) linked to each resource id, counted in one pass.
function resCounts() {
  const counts = new Map();
  for (const ev of calendar.getEvents()) if (ev.resourceId != null) counts.set(ev.resourceId, (counts.get(ev.resourceId) ?? 0) + 1);
  return counts;
}
const eventsLabel = n => `${num(n)} event${n === 1 ? '' : 's'}`;

function renderResList() {
  resPanel.hidden = !settings.resources;
  showFoldAll();
  if (!settings.resources) return;
  const list = settings.resourceList, counts = resCounts();
  document.getElementById('res-count').textContent = `(${list.length})`;
  if (!list.length) {
    resList.replaceChildren(Object.assign(document.createElement('li'), { className: 'bg-empty', textContent: 'None: the resource and timeline views are hidden.' }));
    return;
  }
  resList.replaceChildren(...list.map((r, i) => {
    const li = document.createElement('li');
    const swatch = Object.assign(document.createElement('span'), { className: 'bg-swatch' });
    swatch.style.setProperty('--c', r.color || '#94a3b8');
    const text = document.createElement('div');
    text.append(
      Object.assign(document.createElement('div'), { className: 'bg-name', textContent: r.title }),
      Object.assign(document.createElement('div'), { className: 'bg-when', textContent: eventsLabel(counts.get(r.id) ?? 0) }));
    const btn = (label, action, aria, disabled = false) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'demo-btn small', textContent: label, disabled });
      b.dataset[action] = r.id;
      b.setAttribute('aria-label', `${aria} ${r.title}`);
      if (label !== aria) b.title = aria;
      return b;
    };
    li.append(swatch, text, btn('↑', 'up', 'Move up', i === 0), btn('↓', 'down', 'Move down', i === list.length - 1),
      btn('Edit', 'edit', 'Edit'), btn('Delete', 'delete', 'Delete'));
    return li;
  }));
}

// A new resource list: saved with the settings and applied to the calendar in place.
function setResourceList(list) {
  settings = { ...settings, resourceList: list };
  saveSettings();
  calendar.setResources(list);
  showCode(toOptions(settings));
  renderLists();
}

function deleteResource(r) {
  setResourceList(settings.resourceList.filter(x => x.id !== r.id));
  const n = resCounts().get(r.id) ?? 0;
  logAction(`Deleted resource "${r.title}"${n ? ` (its ${eventsLabel(n)} kept, out of the resource views)` : ''}`);
}

function openResDialog(r) {
  resEditing = r;
  const f = resForm.elements, used = new Set(settings.resourceList.map(x => x.color));
  f.title.value = r?.title ?? '';
  f.color.value = r?.color ?? RES_COLORS.find(c => !used.has(c)) ?? RES_COLORS[settings.resourceList.length % RES_COLORS.length];
  const n = r ? resCounts().get(r.id) ?? 0 : 0;
  document.getElementById('res-note').textContent = n
    ? `${eventsLabel(n)} on this resource. Deleting it keeps them; they then only show in the views without resources.` : '';
  resForm.querySelector('[value="delete"]').hidden = !r;
  document.getElementById('res-dialog-title').textContent = r ? 'Edit resource' : 'New resource';
  resDialog.showModal();
}

resForm.addEventListener('submit', e => {
  const f = resForm.elements, action = e.submitter?.value;
  if (action === 'delete' && resEditing) deleteResource(resEditing);
  else if (action === 'save') {
    const data = { title: f.title.value.trim() || 'Resource', color: f.color.value };
    if (resEditing) {
      setResourceList(settings.resourceList.map(x => (x.id === resEditing.id ? { ...x, ...data } : x)));
      logAction(`Updated resource "${data.title}"`);
    } else {
      setResourceList([...settings.resourceList, { id: `res-${Date.now().toString(36)}`, ...data }]);
      logAction(`Added resource "${data.title}"`);
    }
  }
});

// Enter saves (the browser would press the form's first button: Delete).
Agendo.enterSubmits(resForm, resForm.querySelector('[value="save"]'));

document.getElementById('res-add').addEventListener('click', () => openResDialog(null));
resList.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const { up, down, edit, delete: del } = btn.dataset;
  const list = [...settings.resourceList], i = list.findIndex(x => x.id === (up ?? down ?? edit ?? del));
  if (i < 0) return;
  if (edit) return openResDialog(list[i]);
  if (del) return deleteResource(list[i]);
  const j = up ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  setResourceList(list);
  // Keep the focus on the row that moved: the same arrow, or the other one at the top / bottom.
  const id = CSS.escape(list[j].id);
  (resList.querySelector(`[data-${up ? 'up' : 'down'}="${id}"]:not(:disabled)`)
    ?? resList.querySelector(`[data-${up ? 'down' : 'up'}="${id}"]`))?.focus();
});

// --- Performance: time of every render, load tests, benchmark of every view ---

const perfLine = document.getElementById('perf');
const perfResults = document.getElementById('perf-results');
const num = n => n.toLocaleString('en-US');
const ms = t => `${t < 10 ? t.toFixed(1) : Math.round(t)} ms`;
const nextPaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
const VIEW_NAMES = {
  1: 'Day', 5: 'Workweek', 7: 'Week', month: 'Month', year: 'Year',
  'list-day': 'List day', 'list-week': 'List week', 'list-month': 'List month',
  'resource-day': 'Resources day', 'resource-workweek': 'Resources workweek', 'resource-week': 'Resources week',
  'timeline-day': 'Timeline day', 'timeline-week': 'Timeline week', 'timeline-month': 'Timeline month', 'timeline-custom': 'Timeline 3 days'
};
let benchmarking = false, renderCount = 0;

// Events the view on screen works on (overlapping its dates; internal, for the demo only).
const inRange = () => calendar._occurrences().length;

// Every render (view change, previous / next, today…): time to build it, and until it is painted.
function watchRenders() {
  const render = calendar.render.bind(calendar);
  calendar.render = () => {
    const t0 = performance.now();
    render();
    const built = performance.now() - t0;
    if (benchmarking) return;
    const view = VIEW_NAMES[calendar.o.daysToShow] ?? calendar.o.daysToShow;
    const id = ++renderCount;
    perfLine.textContent = `⏱ ${view} · render ${ms(built)} · ${num(calendar.getEvents().length)} events loaded · ${num(inRange())} in range`;
    // Only the latest render reports its paint (two renders in a row would both append).
    nextPaint().then(() => { if (id === renderCount) perfLine.textContent += ` · painted ${ms(performance.now() - t0)}`; });
  };
}

function showResults(title, rows, head) {
  const table = document.createElement('table');
  table.className = 'perf-table';
  const tr = (cells, tag = 'td') => {
    const row = document.createElement('tr');
    for (const c of cells) row.append(Object.assign(document.createElement(tag), { textContent: c }));
    return row;
  };
  if (head) table.createTHead().append(tr(head, 'th'));
  const body = table.createTBody();
  rows.forEach(r => body.append(tr(r)));
  perfResults.replaceChildren(Object.assign(document.createElement('div'), { className: 'perf-title', textContent: title }), table);
}

// Centre the calendar on the loaded events.
function gotoMiddle() {
  let min = Infinity, max = -Infinity;
  for (const ev of calendar.getEvents()) { const t = +ev.start; if (t < min) min = t; if (t > max) max = t; }
  if (min <= max) calendar.gotoDate(new Date((min + max) / 2));
}

async function loadTest() {
  const n = +document.getElementById('perf-count').value, days = +document.getElementById('perf-days').value;
  const rows = [];
  perfResults.textContent = `Generating ${num(n)} events…`;
  await nextPaint();
  const t0 = performance.now();
  let events = generateEvents(n, { days, isDayOff: d => calendar.isDayOff(d), titles: sampleTexts(settings)?.generated });   // none on the days off
  if (!events.length) {
    perfResults.textContent = 'No event generated: every day of that period is a day off (Customize → Days off).';
    return;
  }
  rows.push([`Generate ${num(n)} events`, ms(performance.now() - t0)]);
  const t2 = performance.now();
  calendar.setEvents(events);
  rows.push(['setEvents (normalize + render)', ms(performance.now() - t2)]);
  events = null;
  const t3 = performance.now();
  gotoMiddle();
  rows.push([`Render ${VIEW_NAMES[calendar.o.daysToShow] ?? 'view'} (${num(inRange())} in range)`, ms(performance.now() - t3)]);
  await nextPaint();
  rows.push(['Total, until painted', ms(performance.now() - t0)]);
  showResults(`${num(n)} events generated over ${days} days`, rows);
  renderLists();
  logAction(`Loaded ${num(n)} events`);
}

// Each view in turn: build time, time until painted, events in range.
async function benchmark() {
  const view = calendar.o.daysToShow, date = new Date(calendar.date);
  const hasRes = calendar.getResources().length > 0;
  const views = Object.keys(VIEW_NAMES).map(v => (isNaN(v) ? v : +v))
    .filter(v => hasRes || !/^(resource|timeline)-/.test(v))
    .filter(v => v !== 'timeline-custom' || settings.timelineCustom);
  const rows = [];
  benchmarking = true;
  perfResults.textContent = 'Running…';
  await nextPaint();
  try {
    for (const v of views) {
      const t0 = performance.now();
      calendar.setView(v);
      const built = performance.now() - t0;
      await nextPaint();
      rows.push([VIEW_NAMES[v], ms(built), ms(performance.now() - t0), num(inRange())]);
    }
  } finally {
    benchmarking = false;
  }
  calendar.date = date;
  calendar.setView(view);
  showResults(`${num(calendar.getEvents().length)} events loaded`, rows, ['View', 'Render', 'Painted', 'In range']);
}

document.getElementById('perf-load').addEventListener('click', loadTest);
document.getElementById('perf-bench').addEventListener('click', benchmark);
document.getElementById('perf-restore').addEventListener('click', () => {
  // With database storage on, "restore" reloads the database's events.
  const done = () => { calendar.today(); renderLists(); perfResults.textContent = ''; logAction('Demo data restored'); };
  if (storage()) { storage().reload(); done(); } else loadSample().then(done);
});
// These controls are not calendar options: keep them out of the settings form.
document.getElementById('perf-test').addEventListener('change', e => e.stopPropagation());

// --- Dark / light ---
// The page follows the same scheme as the calendar. data-theme and data-bs-theme on <html> also
// switch the loaded framework (Bulma, Tabler, Bootstrap) and the demo's own colours.

const darkOS = matchMedia('(prefers-color-scheme: dark)');
const schemeBtn = document.getElementById('scheme-btn');
const resolvedScheme = () => settings.colorScheme === 'auto' ? (darkOS.matches ? 'dark' : 'light') : settings.colorScheme;

function applyPageScheme() {
  const mode = resolvedScheme(), root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.bsTheme = mode;
  const label = `Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`;
  schemeBtn.setAttribute('aria-label', label);
  schemeBtn.title = label;
}

darkOS.addEventListener('change', () => { if (settings.colorScheme === 'auto') applyPageScheme(); });

// The button picks the opposite of what is shown (leaving Auto); the sidebar can set Auto again.
schemeBtn.addEventListener('click', () => {
  settings = { ...settings, colorScheme: resolvedScheme() === 'dark' ? 'light' : 'dark' };
  saveSettings();
  fillForm(settings);
  applyPageScheme();
  calendar.setColorScheme(settings.colorScheme);
  showCode(toOptions(settings));
});

// --- Start ---

fillForm(settings);
applyPageScheme();
loadFramework(settings.theme);
buildCalendar();

// The sample data is for one fixed week; shift it to the current week.
// Recurring events shift too; their rules (weekdays, last Friday…) apply from the new start.
function shiftToThisWeek(events) {
  // 'YYYY-MM-DD' is a local date (new Date() would read it as UTC midnight).
  const parse = s => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00`) : new Date(s));
  const monday = s => { const d = parse(s); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  const days = Math.round((monday(new Date()) - monday(events[0].start)) / 864e5);
  const shift = s => { if (s == null) return s; const d = parse(s); d.setDate(d.getDate() + days); return d; };
  return events.map(e => ({ ...e, start: shift(e.start), end: shift(e.end) }));
}

// The sample events (with database storage on, the events come from the database instead).
function loadSample() {
  return fetch('events.json')
    .then(r => r.json())
    .then(data => {
      sampleEnglish ??= Object.fromEntries(data.map(e => [e.id, Object.fromEntries(
        ['title', 'location', 'description'].filter(k => e[k]).map(k => [k, e[k]]))]));
      calendar.setEvents(localizeEvents(shiftToThisWeek(data)));
      renderLists();
    })
    .catch(err => console.warn('Could not load events.json (serve over HTTP):', err));
}
if (!settings.storage) loadSample();
