import { describe, expect, it } from 'vitest';
import { slotEnd } from '../src/utils/slot.js';

describe('slotEnd — fin de creneau en heure de Kenitra', () => {
  it('convertit l\'heure locale (UTC+1 hors Ramadan) en instant UTC', () => {
    const day = new Date('2026-09-20T00:00:00.000Z');
    expect(slotEnd(day, '18:00-19:30').toISOString()).toBe('2026-09-20T18:30:00.000Z');
    expect(slotEnd(day, '08:00-09:30').toISOString()).toBe('2026-09-20T08:30:00.000Z');
  });

  it('un creneau tardif se termine le lendemain', () => {
    const day = new Date('2026-09-20T00:00:00.000Z');
    // 00:30 heure de Kenitra le 21 = 23:30 UTC le 20 (UTC+1).
    expect(slotEnd(day, '23:00-00:30').toISOString()).toBe('2026-09-20T23:30:00.000Z');
    expect(slotEnd(day, '22:30-00:00').toISOString()).toBe('2026-09-20T23:00:00.000Z');
    // La fin reste posterieure au debut.
    expect(slotEnd(day, '23:00-00:30').getTime()).toBeGreaterThan(new Date('2026-09-20T22:00:00.000Z').getTime());
  });

  it('accepte un fuseau explicite', () => {
    const day = new Date('2026-09-20T00:00:00.000Z');
    expect(slotEnd(day, '18:00-19:30', 'UTC').toISOString()).toBe('2026-09-20T19:30:00.000Z');
  });
});
