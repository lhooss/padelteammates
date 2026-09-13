// Les clubs sont tous a Kenitra : les creneaux ("18:00-19:30") sont en heure locale marocaine.
export const CLUB_TIME_ZONE = 'Africa/Casablanca';

// Decalage (ms) du fuseau `timeZone` par rapport a UTC a l'instant `ts`.
function timeZoneOffsetMs(ts: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const v: Record<string, number> = {};
  for (const { type, value } of formatter.formatToParts(new Date(ts))) v[type] = Number(value);
  const wallClockAsUtc = Date.UTC(v.year!, v.month! - 1, v.day!, v.hour!, v.minute!, v.second!);
  return wallClockAsUtc - (ts - (ts % 1000));
}

// Instant (UTC) de la fin du creneau d'un match. `day` = jour du match a minuit UTC.
export function slotEnd(day: Date, slot: string, timeZone = CLUB_TIME_ZONE): Date {
  const [start, end] = slot.split('-') as [string, string];
  const [hours, minutes] = end.split(':').map(Number) as [number, number];
  // Creneau tardif : "23:00-00:30" se termine le lendemain. Sans cela, la fin
  // tomberait avant le debut et le score serait saisissable des le matin.
  const endsNextDay = end <= start ? 1 : 0;
  const wallClockAsUtc = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate() + endsNextDay,
    hours,
    minutes,
  );
  return new Date(wallClockAsUtc - timeZoneOffsetMs(wallClockAsUtc, timeZone));
}
