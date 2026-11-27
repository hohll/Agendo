/* Agendo plugin: conflicts — no double booking of a resource.
 *
 *   <script src="plugins/conflicts.js"></script>
 *   new Agendo('#calendar', { plugins: [Agendo.conflicts({ by: 'resource' })] });
 *
 * Options:
 *   by      'resource' (default): events overlap only on the same resource; 'all': any two events
 *   block   true (default): saving or dropping an event onto another is refused with a message;
 *           false: allowed, only shown
 *   ignore  (event) => true for other events that never conflict; background events and the
 *           holidays plugin's events (holiday: true) never do
 *
 * Overlapping events get the class ago-conflict (a red outline and a ⚠ badge). Recurring events
 * count through their occurrences. Hooks: validate, beforeRenderEvents, eventContent.
 */
(function () {
  const STYLE = `
.ago-conflict { outline: 2px solid #dc2626; outline-offset: -2px; }
.ago-conflict-mark { margin-left: 4px; font-weight: 700; color: #fff; background: #dc2626; border-radius: 999px; padding: 0 5px; font-size: 0.7em; }
.ago-list-item.ago-conflict { outline-offset: -3px; }`;

  // English texts; locales/*.js translate them (calendar.t, see Agendo.locales).
  if (typeof Agendo !== 'undefined') Agendo.addLocale('en', {
    'conflicts.overlaps': 'Overlaps {titles}',
    'conflicts.bookedResource': '{resource} is already booked: "{title}" ({when})',
    'conflicts.booked': 'This time is already booked: "{title}" ({when})'
  });

  function conflicts({ by = 'resource', block = true, ignore = null } = {}) {
    const skip = ev => ev.display === 'background' || ev.display === 'inverse-background' || ev.holiday || (ignore && ignore(ev));
    const group = ev => (by === 'resource' ? ev.resourceId : 'all');
    let calendar, clashing = new Map();   // id → titles it overlaps

    // Overlapping pairs of `events`, per resource: sort by start, keep the events still running.
    function find(events) {
      const map = new Map(), groups = new Map();
      for (const ev of events) {
        if (skip(ev) || group(ev) == null) continue;
        const g = group(ev);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(ev);
      }
      for (const list of groups.values()) {
        list.sort((a, b) => a.start - b.start);
        let running = [];
        for (const ev of list) {
          running = running.filter(r => r.end > ev.start);
          for (const r of running) {
            if (!map.has(ev.id)) map.set(ev.id, []);
            if (!map.has(r.id)) map.set(r.id, []);
            map.get(ev.id).push(r.title);
            map.get(r.id).push(ev.title);
          }
          running.push(ev);
        }
      }
      return map;
    }

    return {
      name: 'conflicts',
      install(cal) {
        calendar = cal;
        if (!document.getElementById('ago-conflicts-style')) {
          document.head.append(Object.assign(document.createElement('style'), { id: 'ago-conflicts-style', textContent: STYLE }));
        }
      },

      beforeRenderEvents(events) { clashing = find(events); },

      eventContent(ev, el) {
        const with_ = clashing.get(ev.id);
        if (!with_) return;
        el.classList.add('ago-conflict');
        const host = el.querySelector('.ago-event-title, .ago-mevent-title, .ago-list-title') ?? el;
        const mark = Object.assign(document.createElement('span'), { className: 'ago-conflict-mark', textContent: '⚠' });
        mark.title = calendar.t('conflicts.overlaps', { titles: with_.join(', ') });
        host.append(mark);
      },

      validate(data, { event, scope }) {
        if (!block || skip(data) || group(data) == null) return null;
        // The event itself does not count, nor the other occurrences of its series when they move with
        // it ("This and following" / "All events", or before the scope is chosen; the core checks again
        // once it is). For "This event" they are bookings like any other.
        const self = event?.id;
        const series = scope === 'this' ? null : event?.recurringId ?? (event?.recurrence ? event.id : null);
        const other = calendar.getOccurrences(data.start, data.end).find(x =>
          x.id !== self && !(series && x.recurringId === series) && !skip(x) && group(x) === group(data) &&
          x.start < data.end && x.end > data.start);
        if (!other) return null;
        const t = d => d.toLocaleTimeString(calendar.o.locale, { hour: 'numeric', minute: '2-digit' });
        const res = by === 'resource' ? calendar.getResources().find(r => r.id === data.resourceId)?.title : null;
        const when = other.allDay ? calendar.t('allDayList') : `${t(other.start)}–${t(other.end)}`;
        return { start: calendar.t(res ? 'conflicts.bookedResource' : 'conflicts.booked', { resource: res, title: other.title, when }) };
      },

      // Ids of the events on screen that overlap another, with what they overlap.
      overlaps: () => new Map(clashing)
    };
  }

  if (typeof Agendo !== 'undefined') Agendo.conflicts = conflicts;
  if (typeof window !== 'undefined') window.AgendoConflicts = conflicts;
})();
