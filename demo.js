// Demo: create the calendar straight away, then load events.json into it.
// (fetch needs a local server — over file:// the calendar just starts empty.)

const toast = document.getElementById('log-toast');
let toastTimer;

function logAction(msg) {
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.style.display = 'none'), 4000);
}

const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const calendar = new WeekCalendar('#calendar-container', {
  startHour: 7,
  endHour: 21,
  slotHeight: 22,
  onEventChange: (ev, action) => logAction(`${action}: "${ev.title}" ${fmt(ev.start)} – ${fmt(ev.end)}`),
  onEventCreate: ev => logAction(`Created "${ev.title}"`),
  onEventDelete: id => logAction(`Deleted event ${id}`)
});

// The sample data is for one fixed week; shift it to the current week.
function shiftToThisWeek(events) {
  const monday = s => { const d = new Date(s); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
  const days = Math.round((monday(new Date()) - monday(events[0].start)) / 864e5);
  const shift = s => { const d = new Date(s); d.setDate(d.getDate() + days); return d; };
  return events.map(e => ({ ...e, start: shift(e.start), end: shift(e.end) }));
}

fetch('events.json')
  .then(r => r.json())
  .then(data => calendar.setEvents(shiftToThisWeek(data)))
  .catch(err => console.warn('Could not load events.json (serve over HTTP):', err));
