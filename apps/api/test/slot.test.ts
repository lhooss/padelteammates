import { describe, expect, it } from 'vitest';
import { slotEnd } from '../src/utils/slot.js';

describe('slotEnd — fin de creneau en heure de Kenitra', () => {
  it('convertit l\'heure locale (UTC+1 hors Ramadan) en instant UTC', () => {
    const day = new Date('2026-09-20T00:00:00.000Z');
    expect(slotEnd(day, '18:00-19:30').toISOString()).toBe('2026-09-20T18:30:00.000Z');
    expect(slotEnd(day, '08:00-09:30').toISOString()).toBe('2026-09-20T08:30:00.000Z');
  });

  it('accepte un fuseau explicite', () => {
    const day = new Date('2026-09-20T00:00:00.000Z');
    expect(slotEnd(day, '18:00-19:30', 'UTC').toISOString()).toBe('2026-09-20T19:30:00.000Z');
  });
});
