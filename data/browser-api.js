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

  // The Node.js server answers api/health with JSON; a static host answers 404 (or an HTML page).
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

  let dbPromise = null;
  function db() {
    return (dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open('agendo-demo', 1);
      let fresh = false;
      req.onupgradeneeded = () => { req.result.createObjectStore('events', { keyPath: 'id' }); fresh = true; };
      req.onsuccess = () => resolve(fresh ? seed(req.result).then(() => req.result) : req.result);
      req.onerror = () => reject(req.error);
    }));
  }
  const run = (store, mode, fn) => new Promise((resolve, reject) => {
    const tx = store.transaction('events', mode), out = fn(tx.objectStore('events'));
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
    await run(database, 'readwrite', s => { for (const ev of events) s.put(row(ev)); });
  }

  // --- The API ---

  async function handle(method, url, body) {
    const database = await db();
    const all = () => run(database, 'readonly', s => s.getAll());
    const path = url.pathname.slice(API.length);   // 'health', 'rows', 'events', 'events/<id>'
    const m = /^events(?:\/([^/]+))?\/?$/.exec(path), id = m?.[1] && decodeURIComponent(m[1]);

    if (path === 'health' && method === 'GET') {
      return json(200, { ok: true, storage: 'browser', events: await run(database, 'readonly', s => s.count()) });
    }
    if (path === 'rows' && method === 'GET') {
      const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 100));
      const rows = (await all()).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
      return json(200, { storage: 'browser', total: rows.length, rows: rows.slice(0, limit) });
    }
    if (!m) return json(404, { error: 'Not found' });

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
        const r = await run(database, 'readonly', s => s.get(id));
        return r ? json(200, r.data) : json(404, { error: 'No such event' });
      }
      case 'POST list':
      case 'PUT item': {
        const ev = clean(typeof body === 'string' ? JSON.parse(body || 'null') : body, id);
        await run(database, 'readwrite', s => s.put(row(ev)));
        return json(id ? 200 : 201, ev);
      }
      case 'DELETE item': {
        const had = await run(database, 'readonly', s => s.count(id));
        if (!had) return json(404, { error: 'No such event' });
        await run(database, 'readwrite', s => s.delete(id));
        return json(204);
      }
      case 'DELETE list': {
        const n = await run(database, 'readonly', s => s.count());
        await run(database, 'readwrite', s => s.clear());
        return json(200, { deleted: n });
      }
      default:
        return json(405, { error: 'Method not allowed' });
    }
  }

  window.fetch = async function (input, init = {}) {
    const req = input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), document.baseURI);
    if (url.origin !== location.origin || !url.pathname.startsWith(API)) return realFetch(input, init);
    if ((await detect()) === 'server') return realFetch(input, init);
    const method = (init.method ?? req?.method ?? 'GET').toUpperCase();
    try {
      return await handle(method, url, init.body ?? (req ? await req.text() : undefined));
    } catch (err) {
      if (err instanceof SyntaxError) return json(400, { error: 'Invalid JSON' });
      return json(err.status || 500, { error: err.status ? err.message : `Browser database unavailable: ${err.message ?? err}` });
    }
  };
})();
