/* The demo's database API in the browser, for hosts without the Node.js server (GitHub Pages, any
 * static server).
 *
 *   <script src="data/browser-api.js"></script>   (before demo.js)
 *
 * It wraps window.fetch for the demo's own api/… requests only. The first one asks api/health:
 * when server/server.js answers, every request goes to it as before; otherwise the same API
 * (GET/POST/PUT/DELETE api/events, GET api/health, GET api/rows) is answered from IndexedDB, in
 * this browser only. A new browser database gets the sample events of events.json, moved to the
 * current week, like the server's. The restStorage plugin and the demo's Database section do not
 * know the difference; health and rows report storage: 'browser'.
 */
(function () {
  const realFetch = window.fetch.bind(window);
  const API = new URL('api/', document.baseURI).pathname;   // e.g. /Agendo/api/ on GitHub Pages
  const DAY = 864e5;
  let mode = null;      // 'server' | 'browser' once decided for good
  let probing = null;   // the health request in flight

  const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body),
    { status, headers: body === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' } });
  const fail = (status, error) => Object.assign(new Error(error), { status });

  // The Node.js server answers api/health with JSON: 'server' for good. A static host answers 404 / 405
  // or an HTML page: 'browser' for good. Anything else (403, 5xx, the server restarting, no network)
  // decides nothing: the request goes to the server and fails visibly, and the next one asks again,
  // so a server that is briefly unavailable never sends the session's writes to the browser.
  function detect() {
    if (mode) return Promise.resolve(mode);
    return (probing ??= realFetch(API + 'health', { headers: { Accept: 'application/json' } })
      .then(r => {
        const json = (r.headers.get('content-type') ?? '').includes('json');
        if (r.ok && json) mode = 'server';
        else if (r.status === 404 || r.status === 405 || (r.ok && !json)) mode = 'browser';
        return mode ?? 'server';
      }, () => 'server')
      .finally(() => { probing = null; }));
  }

  // --- IndexedDB: one store of rows { id, start_ms, end_ms, recurring, data, updated_at } ---

  // Store 'meta' holds 'seeded' = true once the sample events are in, written in the same transaction
  // as them: a seed that failed (events.json not loaded, tab closed) is done again on the next open,
  // two tabs seeding at once write the same rows, and an emptied database stays empty.
  let dbPromise = null;
  function db() {
    return (dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open('agendo-demo', 2);
      req.onupgradeneeded = e => {
        const d = req.result;
        if (!d.objectStoreNames.contains('events')) d.createObjectStore('events', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('meta')) {
          d.createObjectStore('meta');
          // A version-1 database was seeded when it was created: keep its events as they are.
          if (e.oldVersion >= 1) req.transaction.objectStore('meta').put(true, 'seeded');
        }
      };
      req.onsuccess = () => {
        const d = req.result;
        d.onversionchange = () => d.close();   // let a newer page upgrade it
        resolve(run(d, 'meta', 'readonly', s => s.get('seeded')).then(done => (done ? d : seed(d).then(() => d))));
      };
      req.onerror = () => reject(req.error);
    }).catch(err => { dbPromise = null; throw err; }));   // e.g. blocked or unavailable: try again next time
  }
  const run = (d, stores, mode, fn) => new Promise((resolve, reject) => {
    const tx = d.transaction(stores, mode);
    const out = fn(...[].concat(stores).map(n => tx.objectStore(n)));
    tx.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });

  // Same rules as server/server.js: start (and end) must be dates; occurrences are never stored.
  const isDate = v => typeof v === 'string' && !isNaN(Date.parse(v));
  function clean(body, id) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'An event object is expected');
    const ev = { ...body, id: String(id ?? body.id ?? crypto.randomUUID()) };
    if (!isDate(ev.start)) throw fail(400, '"start" must be a date (ISO 8601)');
    if (ev.end != null && !isDate(ev.end)) throw fail(400, '"end" must be a date (ISO 8601)');
    if (ev.title != null) ev.title = String(ev.title).slice(0, 500);
    delete ev.recurringId;
    delete ev.occurrence;
    return ev;
  }
  function row(ev) {
    const start = Date.parse(ev.start), end = ev.end ? Date.parse(ev.end) : start + 36e5;
    return { id: ev.id, start_ms: start, end_ms: Math.max(end, start), recurring: ev.recurrence ? 1 : 0, data: ev, updated_at: new Date().toISOString() };
  }

  // The sample events, moved to the current week (as server/server.js does).
  async function seed(database) {
    let data;
    try { data = await (await realFetch(new URL('events.json', document.baseURI))).json(); } catch { return; }
    if (!Array.isArray(data) || !data.length) return;
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
    const events = data.map(e => clean({ ...e, start: shift(e.start, e.allDay), end: shift(e.end, e.allDay) }));
    await run(database, ['events', 'meta'], 'readwrite', (s, meta) => { for (const ev of events) s.put(row(ev)); meta.put(true, 'seeded'); });
  }

  // --- The API ---

  // Same answers as server/server.js (status codes, checks, row order and size).
  async function handle(method, url, body, contentType) {
    const database = await db();
    const all = () => run(database, 'events', 'readonly', s => s.getAll());
    const path = url.pathname.slice(API.length);   // 'health', 'rows', 'events', 'events/<id>'
    const m = /^events(?:\/([^/]+))?\/?$/.exec(path);
    let id;
    try { id = m?.[1] && decodeURIComponent(m[1]); } catch { return json(400, { error: 'Malformed URL' }); }
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);   // binary order, as SQLite sorts text

    if (path === 'health') {
      return json(200, { ok: true, storage: 'browser', events: await run(database, 'events', 'readonly', s => s.count()) });
    }
    if (path === 'rows' && method === 'GET') {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 100));
      const all_ = (await all()).sort((a, b) => cmp(b.updated_at, a.updated_at) || cmp(a.id, b.id));
      const rows = [];
      let size = 0, truncated = false;
      for (const r of all_.slice(0, limit)) {
        size += JSON.stringify(r).length;
        if (size > 5e6 && rows.length) { truncated = true; break; }
        rows.push(r);
      }
      return json(200, { storage: 'browser', total: all_.length, rows, truncated });
    }
    if (!m) return json(404, { error: 'Not found' });
    if ((method === 'POST' || method === 'PUT') && !/^application\/json\s*(;|$)/i.test(contentType ?? '')) {
      return json(415, { error: 'Content-Type must be application/json' });
    }

    switch (`${method} ${id ? 'item' : 'list'}`) {
      case 'GET list': {
        const from = url.searchParams.get('start'), to = url.searchParams.get('end');
        if ((from && !isDate(from)) || (to && !isDate(to))) return json(400, { error: 'start and end must be ISO dates' });
        let rows = await all();
        if (from && to) {
          // All-day dates read as UTC midnight: widen by a day on each side, as the server does.
          const a = Date.parse(from) - DAY, b = Date.parse(to) + DAY;
          rows = rows.filter(r => (r.start_ms < b && r.end_ms > a) || (r.recurring && r.start_ms < b));
        }
        return json(200, rows.map(r => r.data));
      }
      case 'GET item': {
        const r = await run(database, 'events', 'readonly', s => s.get(id));
        return r ? json(200, r.data) : json(404, { error: 'No such event' });
      }
      case 'POST list':
      case 'PUT item': {
        const ev = clean(typeof body === 'string' ? JSON.parse(body || 'null') : body, id);
        await run(database, 'events', 'readwrite', s => s.put(row(ev)));
        return json(id ? 200 : 201, ev);
      }
      case 'DELETE item': {   // count and delete in one transaction (two tabs cannot both delete it)
        const had = await run(database, 'events', 'readwrite', s => {
          const c = s.count(id);
          c.onsuccess = () => { if (c.result) s.delete(id); };
          return c;
        });
        return had ? json(204) : json(404, { error: 'No such event' });
      }
      case 'DELETE list': {
        const n = await run(database, 'events', 'readwrite', s => {
          const c = s.count();
          c.onsuccess = () => s.clear();
          return c;
        });
        return json(200, { deleted: n });
      }
      default:
        return json(405, { error: 'Method not allowed' });
    }
  }

  window.fetch = async function (input, init) {
    init ??= {};
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), document.baseURI);
    if (url.origin !== location.origin || !url.pathname.startsWith(API)) return realFetch(input, init);
    if ((await detect()) === 'server') return realFetch(input, init);
    const method = (init.method ?? req?.method ?? 'GET').toUpperCase();
    try {
      const contentType = new Headers(init.headers ?? req?.headers).get('content-type');
      return await handle(method, url, init.body ?? (req ? await req.text() : undefined), contentType);
    } catch (err) {
      if (err instanceof SyntaxError) return json(400, { error: 'Invalid JSON' });
      return json(err.status || 500, { error: err.status ? err.message : `Browser database unavailable: ${err.message ?? err}` });
    }
  };
})();
