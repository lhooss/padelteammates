// Les dates de match sont des jours a minuit UTC (voir l'API) : on les manipule en UTC.

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

// Lundi (minuit UTC) de la semaine contenant le jour local de `date`.
export function mondayOf(date: Date): Date {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// "2026-09-14"
export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// "lundi 14 septembre"
export function formatDay(date: string | Date): string {
  const d = new Date(date);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

// "14 septembre – 20 septembre"
export function formatWeek(monday: Date): string {
  const sunday = addDays(monday, 6);
  return `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]} – ${sunday.getUTCDate()} ${MONTHS[sunday.getUTCMonth()]}`;
}

// --- Planification ---

// Les `count` prochains jours locaux, a partir d'aujourd'hui ("AAAA-MM-JJ").
export function upcomingDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    toIsoDay(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + i))),
  );
}

// "Aujourd'hui", "Demain", puis "sam. 13"
export function dayChipLabel(isoDay: string, index: number): string {
  if (index === 0) return "Aujourd'hui";
  if (index === 1) return 'Demain';
  const d = new Date(isoDay);
  return `${DAYS_SHORT[d.getUTCDay()]} ${d.getUTCDate()}`;
}

// "18:00" + 90 -> "19:30" ; "23:00" + 90 -> "00:30" (on joue tard a Kenitra).
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number) as [number, number];
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Debuts de creneau possibles (08:00 -> `lastStart`, toutes les 30 min),
// sans ceux deja passes si le jour choisi est aujourd'hui.
export function slotStarts(isoDay: string, lastStart = '23:00', now = new Date()): string[] {
  const isToday = isoDay === upcomingDays(1, now)[0];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const starts: string[] = [];
  for (let t = '08:00'; t <= lastStart; t = addMinutesToTime(t, 30)) {
    const [h, m] = t.split(':').map(Number) as [number, number];
    if (!isToday || h * 60 + m > nowMinutes) starts.push(t);
  }
  return starts;
}
