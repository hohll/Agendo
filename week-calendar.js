/**
 * Modern Week Calendar — zero-dependency week/day view with drag to create, move and resize.
 */

const minutesOf = d => d.getHours() * 60 + d.getMinutes();
const atMinutes = (day, min) => { const d = new Date(day); d.setHours(0, min, 0, 0); return d; };
const addDays = (day, n) => { const d = new Date(day); d.setDate(d.getDate() + n); return d; };
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const div = (className, text = '') => Object.assign(document.createElement('div'), { className, textContent: text });

class WeekCalendar {
  static defaults = {
    date: new Date(),
    daysToShow: 7,          // 7 = week, 5 = workweek, 1 = day
    firstDayOfWeek: 1,      // 0 = Sunday, 1 = Monday
    startHour: 0,
    endHour: 24,
    slotsPerHour: 4,        // 4 = 15-minute slots
    slotHeight: 24,         // px
    use24Hour: false,
    locale: navigator.language,
    businessHours: { start: 9, end: 18 },
    events: [],
    readonly: false,
    enableCreate: true,
    enableMove: true,
    enableResize: true,
    showCurrentTime: true,
    onEventClick: null,     // (event) => {}  — defaults to opening the edit dialog
    onEventChange: null,    // (event, 'move' | 'resize' | 'edit') => {}
    onEventCreate: null,    // (event) => {}
    onEventDelete: null     // (id) => {}
  };

  constructor(container, options = {}) {
    this.el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.el) throw new Error('WeekCalendar: container not found');

    const o = this.o = { ...WeekCalendar.defaults, ...options };
    this.date = new Date(o.date);
    this.slot = 60 / o.slotsPerHour;
    this.startMin = o.startHour * 60;
    this.endMin = o.endHour * 60;

    const hour12 = !o.use24Hour;
    this.fmt = {
      weekday: new Intl.DateTimeFormat(o.locale, { weekday: 'short' }),
      hour: new Intl.DateTimeFormat(o.locale, { hour: 'numeric', hour12 }),
      time: new Intl.DateTimeFormat(o.locale, { hour: 'numeric', minute: '2-digit', hour12 }),
      range: new Intl.DateTimeFormat(o.locale, { day: 'numeric', month: 'long', year: 'numeric' })
    };

    this._build();
    this.setEvents(o.events);
    this.scrollToHour(o.businessHours ? o.businessHours.start - 1 : 8);
    if (o.showCurrentTime) this.timer = setInterval(() => this._renderNow(), 60_000);
  }

  // --- Structure (built once) ---

  _build() {
    const o = this.o, hourPx = o.slotHeight * o.slotsPerHour, biz = o.businessHours;
    this.el.classList.add('modern-week-calendar');
    Object.entries({
      '--mwc-slot-h': `${o.slotHeight}px`,
      '--mwc-hour-h': `${hourPx}px`,
      '--mwc-hours': o.endHour - o.startHour,
      '--mwc-biz-top': `${biz ? (biz.start - o.startHour) * hourPx : 0}px`,
      '--mwc-biz-bottom': `${((biz ? biz.end : o.endHour) - o.startHour) * hourPx}px`
    }).forEach(([k, v]) => this.el.style.setProperty(k, v));

    this.el.innerHTML = `
      <div class="mwc-toolbar">
        <div class="mwc-group">
          <button type="button" class="mwc-btn" data-action="today">Today</button>
          <button type="button" class="mwc-btn" data-action="prev" title="Previous">&larr;</button>
          <button type="button" class="mwc-btn" data-action="next" title="Next">&rarr;</button>
        </div>
        <div class="mwc-title"></div>
        <div class="mwc-group">
          <button type="button" class="mwc-btn" data-days="1">Day</button>
          <button type="button" class="mwc-btn" data-days="5">Workweek</button>
          <button type="button" class="mwc-btn" data-days="7">Week</button>
        </div>
      </div>
      <div class="mwc-grid"></div>
      <dialog class="mwc-dialog">
        <form method="dialog">
          <header><span class="mwc-dialog-title"></span><button value="cancel" formnovalidate>&times;</button></header>
          <label>Title <input name="title" required></label>
          <label>Start <input name="start" type="datetime-local" required></label>
          <label>End <input name="end" type="datetime-local" required></label>
          <footer>
            <button class="mwc-btn mwc-btn-danger" value="delete" formnovalidate>Delete</button>
            <button class="mwc-btn" value="cancel" formnovalidate>Cancel</button>
            <button class="mwc-btn mwc-btn-primary" value="save">Save</button>
          </footer>
        </form>
      </dialog>`;

    const $ = sel => this.el.querySelector(sel);
    this.titleEl = $('.mwc-title');
    this.grid = $('.mwc-grid');
    this.dialog = $('dialog');
    this.form = $('form');
    this.nowEl = div('mwc-now');

    let gutter = '';
    for (let h = o.startHour; h < o.endHour; h++) {
      gutter += `<div><span>${this.fmt.hour.format(atMinutes(new Date(), h * 60))}</span></div>`;
    }
    this.gutterHtml = `<div class="mwc-gutter">${gutter}</div>`;

    $('.mwc-toolbar').addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (btn?.dataset.days) this.setView(+btn.dataset.days);
      else if (btn) this[btn.dataset.action]();
    });

    this.grid.addEventListener('pointerdown', e => this._onDown(e));
    this.grid.addEventListener('pointermove', e => this._onMove(e));
    this.grid.addEventListener('pointerup', e => this._onUp(e));
    this.grid.addEventListener('pointercancel', e => this._onUp(e));

    const { start, end } = this.form.elements;
    this._checkRange = () => end.setCustomValidity(
      new Date(end.value) > new Date(start.value) ? '' : 'End must be after start');
    start.addEventListener('input', this._checkRange);
    end.addEventListener('input', this._checkRange);
    this.form.addEventListener('submit', e => this._onSubmit(e));
  }

  // --- Rendering ---

  render() {
    const n = this.o.daysToShow;
    const first = n === 1 ? atMinutes(this.date, 0) : this._weekStart(this.date);
    this.dates = Array.from({ length: n }, (_, i) => addDays(first, i));

    this.titleEl.textContent = this.fmt.range.formatRange(this.dates[0], this.dates[n - 1]);
    this.el.querySelectorAll('[data-days]').forEach(b => b.classList.toggle('active', +b.dataset.days === n));

    const now = new Date();
    this.grid.style.setProperty('--mwc-days', n);
    this.grid.innerHTML =
      '<div class="mwc-corner"></div>' +
      this.dates.map(d => `
        <div class="mwc-day-head${sameDay(d, now) ? ' mwc-today' : ''}">
          <div class="mwc-day-name">${this.fmt.weekday.format(d)}</div>
          <div class="mwc-day-num">${d.getDate()}</div>
        </div>`).join('') +
      this.gutterHtml +
      this.dates.map((_, i) => `<div class="mwc-col" data-day="${i}"><div class="mwc-layer"></div></div>`).join('');

    this.cols = [...this.grid.querySelectorAll('.mwc-col')];
    this._renderEvents();
    this._renderNow();
  }

  _renderEvents() {
    const pct = min => ((clamp(min, this.startMin, this.endMin) - this.startMin) / (this.endMin - this.startMin)) * 100;
    const place = (el, s, e) => Object.assign(el.style, { top: `${pct(s)}%`, height: `${pct(e) - pct(s)}%` });
    const handles = !this.o.readonly && this.o.enableResize;
    const preview = this.drag?.mode === 'create' && this.drag.event;

    this.cols.forEach((col, i) => {
      const layer = col.firstElementChild;
      layer.replaceChildren();

      const items = this.events
        .filter(ev => sameDay(ev.start, this.dates[i]))
        .map(ev => ({ ev, s: minutesOf(ev.start), e: minutesOf(ev.end) || 1440 }))
        .sort((a, b) => a.s - b.s || b.e - a.e);
      this._assignColumns(items);

      for (const { ev, s, e, col: c, cols } of items) {
        const el = div('mwc-event' + (this.drag?.event === ev ? ' is-dragging' : ''));
        el.dataset.id = ev.id;
        const w = 100 / cols;
        place(el, s, Math.max(e, s + 15));
        Object.assign(el.style, {
          left: `calc(${c * w}% + 2px)`, width: `calc(${w}% - 4px)`,
          backgroundColor: ev.color ?? ''
        });
        if (handles) {
          el.append(div('mwc-handle'), div('mwc-handle'));
          el.children[0].dataset.edge = 'top';
          el.children[1].dataset.edge = 'bottom';
        }
        el.append(
          div('mwc-event-time', `${this.fmt.time.format(ev.start)} – ${this.fmt.time.format(ev.end)}`),
          div('mwc-event-title', ev.title));
        layer.append(el);
      }

      if (preview && sameDay(preview.start, this.dates[i])) {
        const p = div('mwc-preview');
        place(p, minutesOf(preview.start), minutesOf(preview.end) || 1440);
        layer.append(p);
      }
    });
  }

  // Side-by-side layout: within each cluster of overlapping events, put each event
  // in the first sub-column that's free, then give the whole cluster the same width.
  _assignColumns(items) {
    let cluster = [], colEnds = [], clusterEnd = -1;
    const flush = () => cluster.forEach(it => (it.cols = colEnds.length));
    for (const it of items) {
      if (it.s >= clusterEnd) { flush(); cluster = []; colEnds = []; }
      let c = colEnds.findIndex(end => end <= it.s);
      if (c < 0) c = colEnds.length;
      colEnds[c] = it.e;
      it.col = c;
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.e);
    }
    flush();
  }

  _renderNow() {
    const now = new Date(), min = minutesOf(now);
    const i = this.dates.findIndex(d => sameDay(d, now));
    if (i < 0 || min < this.startMin || min > this.endMin) return this.nowEl.remove();
    this.nowEl.style.top = `${((min - this.startMin) / (this.endMin - this.startMin)) * 100}%`;
    this.cols[i].append(this.nowEl);
  }

  // --- Pointer interaction (create / move / resize) ---

  _onDown(e) {
    const col = e.target.closest('.mwc-col');
    if (this.o.readonly || e.button !== 0 || !col) return;

    const evEl = e.target.closest('.mwc-event');
    const edge = e.target.closest('.mwc-handle')?.dataset.edge;
    const event = evEl && this.events.find(x => x.id === evEl.dataset.id);
    const mode = evEl ? (edge || 'move') : 'create';
    if (mode === 'create' && !this.o.enableCreate) return;

    const rect = col.getBoundingClientRect(), day = +col.dataset.day;
    this.drag = {
      mode, day, rect, x: e.clientX, y: e.clientY, moved: false,
      anchor: this._snap(this._yToMin(e.clientY, rect), Math.floor),
      event: event ?? { start: null, end: null },
      orig: event && { start: event.start, end: event.end }
    };
    this.grid.setPointerCapture(e.pointerId);
    if (mode === 'create') this._onMove(e, true);
  }

  _onMove(e, force = false) {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && !force && Math.hypot(dx, dy) < 4) return;
    d.moved = !force || d.moved;

    const ev = d.event, slot = this.slot, min = this._yToMin(e.clientY, d.rect);
    switch (d.mode) {
      case 'create': {
        const cur = this._snap(min, Math.floor);
        ev.start = atMinutes(this.dates[d.day], Math.min(d.anchor, cur));
        ev.end = atMinutes(this.dates[d.day], Math.max(d.anchor, cur) + slot);
        break;
      }
      case 'move': {
        if (!this.o.enableMove) return;
        const dur = (d.orig.end - d.orig.start) / 60_000;
        const day = clamp(d.day + Math.round(dx / d.rect.width), 0, this.dates.length - 1);
        const shift = this._snap((dy / d.rect.height) * (this.endMin - this.startMin));
        const start = clamp(minutesOf(d.orig.start) + shift, this.startMin, this.endMin - dur);
        ev.start = atMinutes(this.dates[day], start);
        ev.end = new Date(+ev.start + dur * 60_000);
        break;
      }
      case 'top':
        ev.start = atMinutes(ev.start, Math.min(this._snap(min), minutesOf(d.orig.end) - slot));
        break;
      case 'bottom':
        ev.end = atMinutes(ev.end, Math.max(this._snap(min), minutesOf(d.orig.start) + slot));
        break;
    }
    this._renderEvents();
  }

  _onUp(e) {
    const d = this.drag;
    if (!d) return;
    this.drag = null;

    if (e.type === 'pointercancel') {
      if (d.orig) Object.assign(d.event, d.orig);
    } else if (d.mode === 'create') {
      this.openCreateModal(d.event.start, d.event.end);
    } else if (!d.moved) {
      this.o.onEventClick ? this.o.onEventClick(d.event) : this.openEditModal(d.event);
    } else {
      this.o.onEventChange?.(d.event, d.mode === 'move' ? 'move' : 'resize');
    }
    this._renderEvents();
  }

  _yToMin(y, rect) {
    return this.startMin + (clamp(y - rect.top, 0, rect.height) / rect.height) * (this.endMin - this.startMin);
  }

  _snap(min, round = Math.round) {
    return round(min / this.slot) * this.slot;
  }

  _weekStart(date) {
    const d = atMinutes(date, 0);
    return addDays(d, -((d.getDay() - this.o.firstDayOfWeek + 7) % 7));
  }

  // --- Dialog ---

  _openDialog(title, event, start, end) {
    const pad = n => String(n).padStart(2, '0');
    const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const f = this.form.elements;
    this.editing = event;
    this.dialog.querySelector('.mwc-dialog-title').textContent = title;
    this.form.querySelector('[value="delete"]').hidden = !event;
    f.title.value = event?.title ?? '';
    f.start.value = local(start);
    f.end.value = local(end);
    this._checkRange();
    this.dialog.showModal();
  }

  openCreateModal(start, end) { this._openDialog('New Event', null, start, end); }
  openEditModal(event) { this._openDialog('Edit Event', event, event.start, event.end); }

  _onSubmit(e) {
    const ev = this.editing, f = this.form.elements;
    switch (e.submitter?.value) {
      case 'delete':
        this.deleteEvent(ev.id);
        this.o.onEventDelete?.(ev.id);
        break;
      case 'save': {
        const data = { title: f.title.value, start: new Date(f.start.value), end: new Date(f.end.value) };
        if (ev) {
          Object.assign(ev, data);
          this._renderEvents();
          this.o.onEventChange?.(ev, 'edit');
        } else {
          this.o.onEventCreate?.(this.addEvent(data));
        }
      }
    }
  }

  // --- Public API ---

  prev() { this.gotoDate(addDays(this.date, this.o.daysToShow === 1 ? -1 : -7)); }
  next() { this.gotoDate(addDays(this.date, this.o.daysToShow === 1 ? 1 : 7)); }
  today() { this.gotoDate(new Date()); }
  gotoDate(date) { this.date = new Date(date); this.render(); }
  setView(daysToShow) { this.o.daysToShow = daysToShow; this.render(); }

  scrollToHour(hour) {
    this.grid.scrollTop = Math.max(0, hour - this.o.startHour) * this.o.slotHeight * this.o.slotsPerHour;
  }

  getEvents() { return [...this.events]; }

  setEvents(events) {
    this.events = (events || []).map(WeekCalendar._normalize);
    this.render();
  }

  addEvent(event) {
    const ev = WeekCalendar._normalize(event);
    this.events.push(ev);
    this._renderEvents();
    return ev;
  }

  updateEvent(id, updates) {
    const ev = this.events.find(e => e.id === String(id));
    if (!ev) return;
    Object.assign(ev, WeekCalendar._normalize({ ...ev, ...updates }));
    this._renderEvents();
  }

  deleteEvent(id) {
    this.events = this.events.filter(e => e.id !== String(id));
    this._renderEvents();
  }

  destroy() {
    clearInterval(this.timer);
    this.el.replaceChildren();
    this.el.classList.remove('modern-week-calendar');
  }

  static _normalize(evt) {
    return {
      ...evt,
      id: String(evt.id ?? Math.random().toString(36).slice(2)),
      title: evt.title || 'Untitled Event',
      start: new Date(evt.start),
      end: new Date(evt.end)
    };
  }
}
