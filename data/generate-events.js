/* Test data for the Agendo demo's performance test: deterministic pseudo-random events
 * (same count + seed = same events), generated in the browser.
 *
 *   <script src="data/generate-events.js"></script>
 *   generateEvents(1000, { days: 365, center: new Date() })  → events with Date objects
 *   generateEvents(1000, { isDayOff: d => calendar.isDayOff(d) })   no event on a day off
 *   generateEvents(1000, { titles: [...] })   titles in another language (generateEvents.TITLES' order)
 *
 * Events spread over `days` days centred on `center`: timed ones between 7:00 and 19:00 lasting
 * 15 minutes to 2 hours, about 4 % all-day (1 to 3 days), over 3 desks, 2 calendars, 4 categories.
 * With isDayOff, events start only on the other days and all-day ones stop before a day off;
 * when every day of the range is off, no event is generated.
 */
(function (root) {
  const TITLES = ['Team meeting', 'Client call', 'Code review', 'Design review', '1:1', 'Workshop', 'Training',
    'Sprint planning', 'Lunch', 'Interview', 'Demo', 'Support shift', 'Focus time', 'Budget review', 'Site visit'];
  const RESOURCES = ['desk-1', 'desk-2', 'desk-3'];
  const CATEGORIES = ['meeting', 'workshop', 'social', 'sport'];
  const DURATIONS = [15, 30, 30, 45, 60, 60, 60, 90, 120];

  // mulberry32: small, fast, seeded.
  function random(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateEvents(count, { days = 365, center = new Date(), seed = 42, isDayOff = null, titles = TITLES } = {}) {
    const r = random(seed + count), pick = list => list[Math.floor(r() * list.length)];
    const y = center.getFullYear(), m = center.getMonth(), d0 = center.getDate() - Math.floor(days / 2);
    // The days events may be on (offsets from d0), and whether a day is off.
    const off = n => !!isDayOff && !!isDayOff(new Date(y, m, n));
    const open = [];
    for (let k = 0; k < days; k++) if (!off(d0 + k)) open.push(k);
    if (!open.length) return [];
    const out = new Array(count);
    for (let i = 0; i < count; i++) {
      const day = d0 + pick(open);
      const ev = {
        id: `t${i}`,
        title: `${pick(titles)} #${i + 1}`,
        resourceId: pick(RESOURCES),
        calendarId: r() < 0.8 ? 'work' : 'personal',
        categoryId: pick(CATEGORIES)
      };
      let start, end;
      if (r() < 0.04) {
        ev.allDay = true;
        start = new Date(y, m, day);
        let len = 1 + Math.floor(r() * 3);
        for (let k = 1; k < len; k++) if (off(day + k)) { len = k; break; }   // stop before a day off
        end = new Date(y, m, day + len);
      } else {
        start = new Date(y, m, day, 7, Math.floor(r() * 48) * 15);   // 7:00 to 18:45
        end = new Date(+start + pick(DURATIONS) * 60000);
      }
      ev.start = start;
      ev.end = end;
      out[i] = ev;
    }
    return out;
  }

  generateEvents.TITLES = TITLES;
  root.generateEvents = generateEvents;
})(this);
