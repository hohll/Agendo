/* Agendo demo server: serves the demo and stores its events in a database (no dependencies).
 *
 *   node server/server.js                 http://localhost:8000, database server/agendo.db
 *   node server/server.js --port 3000 --db /tmp/agenda.db
 *   node server/server.js --reset         start from an empty database (then the sample events)
 *   node server/server.js --no-seed       do not add the sample events to a new database
 *
 * Storage: SQLite through Node's built-in node:sqlite (Node 22.13+ / 23.4+); on older versions,
 * a JSON file next to the database path (server/agendo.json).
 *
 * REST API (JSON):
 *   GET    /api/health                      { ok, storage, events }
 *   GET    /api/events?start=ISO&end=ISO    events overlapping [start, end), and recurring events
 *                                           starting before end (their occurrences can be anywhere)
 *   GET    /api/events/:id
 *   POST   /api/events                      create (or replace) an event → 201 + the event
 *   PUT    /api/events/:id                  replace an event → 200 + the event
 *   DELETE /api/events/:id                  → 204
 *   DELETE /api/events                      delete every event → 200 + { deleted }
 *   GET    /api/rows?limit=N                { storage, total, rows }: the stored rows, last changed
 *                                           first (for the demo's Database panel; limit 1–500, 100)
 * An event is stored whole (custom fields included) with its time span indexed for range queries.
 * Dates: ISO instants ('2026-11-20T08:00:00.000Z'), all-day events as 'YYYY-MM-DD'.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
const PORT = +(opt('--port', process.env.PORT || 8000));
const HOST = opt('--host', '127.0.0.1');
const DB_FILE = path.resolve(opt('--db', path.join(__dirname, 'agendo.db')));
const DAY = 864e5;

// --- Storage: the same small interface over SQLite or a JSON file ---

// Time span used for range queries. All-day dates ('YYYY-MM-DD') read as UTC midnight, so queries
// are widened by a day on each side to cover every time zone.
function span(ev) {
  const start = Date.parse(ev.start), end = ev.end ? Date.parse(ev.end) : start + 36e5;
  return { start, end: Math.max(end, start), recurring: ev.recurrence ? 1 : 0 };
}

function sqliteStore(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id         TEXT PRIMARY KEY,
      start_ms   INTEGER NOT NULL,
      end_ms     INTEGER NOT NULL,
      recurring  INTEGER NOT NULL DEFAULT 0,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_range ON events (start_ms, end_ms);
    CREATE INDEX IF NOT EXISTS events_recurring ON events (recurring, start_ms);`);
  const q = {
    all: db.prepare('SELECT data FROM events'),
    range: db.prepare('SELECT data FROM events WHERE (start_ms < ? AND end_ms > ?) OR (recurring = 1 AND start_ms < ?)'),
    get: db.prepare('SELECT data FROM events WHERE id = ?'),
    put: db.prepare(`INSERT INTO events (id, start_ms, end_ms, recurring, data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET start_ms = excluded.start_ms, end_ms = excluded.end_ms,
      recurring = excluded.recurring, data = excluded.data, updated_at = excluded.updated_at`),
    remove: db.prepare('DELETE FROM events WHERE id = ?'),
    clear: db.prepare('DELETE FROM events'),
    count: db.prepare('SELECT COUNT(*) AS n FROM events'),
    rows: db.prepare('SELECT id, start_ms, end_ms, recurring, data, updated_at FROM events ORDER BY updated_at DESC, id LIMIT ?')
  };
  const parse = rows => rows.map(r => JSON.parse(r.data));
  return {
    kind: 'sqlite',
    file,
    list(from, to) {
      if (from == null || to == null) return parse(q.all.all());
      return parse(q.range.all(to + DAY, from - DAY, to + DAY));
    },
    get(id) { const r = q.get.get(id); return r ? JSON.parse(r.data) : null; },
    put(ev) { const s = span(ev); q.put.run(ev.id, s.start, s.end, s.recurring, JSON.stringify(ev), new Date().toISOString()); },
    putMany(list) {
      db.exec('BEGIN');
      try { for (const ev of list) this.put(ev); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    remove(id) { return q.remove.run(id).changes > 0; },
    clear() { return Number(q.clear.run().changes); },
    count() { return q.count.get().n; },
    rows(limit) { return q.rows.all(limit).map(r => ({ ...r, data: JSON.parse(r.data) })); }
  };
}

function jsonStore(file) {
  let events = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  const save = () => fs.writeFileSync(file, JSON.stringify(events, null, 1));
  return {
    kind: 'json',
    file,
    list(from, to) {
      if (from == null || to == null) return events;
      return events.filter(ev => { const s = span(ev); return (s.start < to + DAY && s.end > from - DAY) || (s.recurring && s.start < to + DAY); });
    },
    get(id) { return events.find(e => e.id === id) ?? null; },
    put(ev) { events = events.filter(e => e.id !== ev.id).concat(ev); save(); },
    putMany(list) { const ids = new Set(list.map(e => e.id)); events = events.filter(e => !ids.has(e.id)).concat(list); save(); },
    remove(id) { const n = events.length; events = events.filter(e => e.id !== id); save(); return events.length < n; },
    clear() { const n = events.length; events = []; save(); return n; },
    count() { return events.length; },
    // No change time in a JSON file: the last stored event is at the end.
    rows(limit) {
      return events.slice(-limit).reverse().map(ev => {
        const s = span(ev);
        return { id: ev.id, start_ms: s.start, end_ms: s.end, recurring: s.recurring, data: ev, updated_at: null };
      });
    }
  };
}

// --reset deletes only the files of the storage actually used: the SQLite database and its side files
// (an unclean stop leaves -wal / -shm / -journal, which SQLite would apply to the new file), or the
// JSON fallback. A --db whose JSON fallback would be the demo's own events.json is refused.
function openStore() {
  const reset = args.includes('--reset'), jsonFile = DB_FILE.replace(/\.db$/, '') + '.json';
  if (path.resolve(jsonFile) === path.join(ROOT, 'events.json')) {
    console.error(`--db ${DB_FILE}: its JSON fallback would be the sample events file ${jsonFile}; choose another path`);
    process.exit(1);
  }
  let sqlite;
  try {
    // node:sqlite prints an "experimental" warning on load: drop that one only.
    const emit = process.emitWarning;
    process.emitWarning = (w, ...rest) => (/SQLite/.test(String(w?.message ?? w)) ? undefined : emit.call(process, w, ...rest));
    require('node:sqlite');
    sqlite = true;
  } catch (err) {
    if (err.code !== 'ERR_UNKNOWN_BUILTIN_MODULE' && !/sqlite/.test(err.message)) throw err;
    sqlite = false;
  }
  if (reset) for (const f of sqlite ? [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`, `${DB_FILE}-journal`] : [jsonFile]) fs.rmSync(f, { force: true });
  return sqlite ? sqliteStore(DB_FILE) : jsonStore(jsonFile);
}

// --- Events: checked before they are stored ---

const isDate = v => typeof v === 'string' && !isNaN(Date.parse(v));

function clean(body, id) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('An event object is expected'), { status: 400 });
  const ev = { ...body, id: String(id ?? body.id ?? crypto.randomUUID()) };
  if (!isDate(ev.start)) throw Object.assign(new Error('"start" must be a date (ISO 8601)'), { status: 400 });
  if (ev.end != null && !isDate(ev.end)) throw Object.assign(new Error('"end" must be a date (ISO 8601)'), { status: 400 });
  if (ev.title != null) ev.title = String(ev.title).slice(0, 500);
  delete ev.recurringId;   // occurrences are generated by the calendar, only series are stored
  delete ev.occurrence;
  return ev;
}

// The demo's sample events, moved to the current week (as the demo page does).
function sampleEvents() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'events.json'), 'utf8'));
  const parse = s => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00`) : new Date(s));
  const monday = s => { const d = parse(s); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
  const days = Math.round((monday(new Date()) - monday(data[0].start)) / DAY);
  const pad = n => String(n).padStart(2, '0');
  const shift = (s, allDay) => {
    if (s == null) return s;
    const d = parse(s);
    d.setDate(d.getDate() + days);
    return allDay ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : d.toISOString();
  };
  return data.map(e => ({ ...e, start: shift(e.start, e.allDay), end: shift(e.end, e.allDay) }));
}

// --- HTTP ---

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body === undefined ? undefined : type.startsWith('application/json') ? JSON.stringify(body) : body);
}

// The API answers the demo page only. A page of another site could otherwise send writes:
// a cross-origin POST with a text/plain body needs no preflight, so writes must be JSON (which
// does need one, and this server answers none) and must not come from another origin. While the
// server listens on 127.0.0.1, a Host other than this machine (DNS rebinding) is refused too.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
function checkRequest(req) {
  const refuse = (status, msg) => { throw Object.assign(new Error(msg), { status }); };
  const host = req.headers.host ?? '';
  if (HOST === '127.0.0.1' && !LOCAL_HOSTS.has(host.replace(/:\d+$/, ''))) refuse(403, 'Unknown host');
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.origin;
  if (origin) {
    let same = false;
    try { same = new URL(origin).host === host; } catch { /* "null" or malformed */ }
    if (!same) refuse(403, 'Cross-origin request refused');
  }
  if ((req.method === 'POST' || req.method === 'PUT') && !/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
    refuse(415, 'Content-Type must be application/json');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 1e6) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

// Static files of the demo only: no dot files (.git), nothing from server/ (the database).
function serveStatic(req, res, pathname) {
  const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const file = path.resolve(ROOT, `.${rel}`);
  const type = TYPES[path.extname(file)];
  if (!file.startsWith(ROOT + path.sep) || rel.split('/').some(p => p.startsWith('.')) ||
      file.startsWith(path.join(ROOT, 'server') + path.sep) || !type) return send(res, 404, { error: 'Not found' });
  fs.readFile(file, (err, data) => (err ? send(res, 404, { error: 'Not found' }) : send(res, 200, data, type)));
}

const store = openStore();
if (store.count() === 0 && !args.includes('--no-seed')) store.putMany(sampleEvents().map(e => clean(e)));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const match = /^\/api\/events(?:\/([^/]+))?\/?$/.exec(url.pathname);
  try {
    if (url.pathname.startsWith('/api/')) checkRequest(req);
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, storage: store.kind, events: store.count() });
    if (url.pathname === '/api/rows' && req.method === 'GET') {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 100));
      return send(res, 200, { storage: store.kind, total: store.count(), rows: store.rows(limit) });
    }
    if (!match) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      return serveStatic(req, res, url.pathname);
    }
    const id = match[1] && decodeURIComponent(match[1]);
    switch (`${req.method} ${id ? 'item' : 'list'}`) {
      case 'GET list': {
        const from = url.searchParams.get('start'), to = url.searchParams.get('end');
        if ((from && !isDate(from)) || (to && !isDate(to))) return send(res, 400, { error: 'start and end must be ISO dates' });
        return send(res, 200, store.list(from ? Date.parse(from) : null, to ? Date.parse(to) : null));
      }
      case 'GET item': {
        const ev = store.get(id);
        return ev ? send(res, 200, ev) : send(res, 404, { error: 'No such event' });
      }
      case 'POST list': {
        const ev = clean(await readBody(req));
        store.put(ev);
        return send(res, 201, ev);
      }
      case 'PUT item': {
        const ev = clean(await readBody(req), id);
        store.put(ev);
        return send(res, 200, ev);
      }
      case 'DELETE list':
        return send(res, 200, { deleted: store.clear() });
      case 'DELETE item':
        return store.remove(id) ? send(res, 204) : send(res, 404, { error: 'No such event' });
      default:
        return send(res, 405, { error: 'Method not allowed' });
    }
  } catch (err) {
    send(res, err.status || 500, { error: err.status ? err.message : 'Server error' });
    if (!err.status) console.error(err);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Agendo demo on http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Events stored in ${store.file} (${store.kind}, ${store.count()} events)`);
});
