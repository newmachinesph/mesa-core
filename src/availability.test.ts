import { describe, it, expect } from 'vitest';
import { checkAvailability } from './availability';
import { seedState } from './mock/seed';
import type { Reservation, Restaurant, Schedule } from './types';

const state = seedState();
const restaurant = state.restaurants.find((r) => r.id === 'bal') as Restaurant;
const schedule = state.schedules.find((s) => s.id === 'sched-bal') as Schedule;
const reservations = state.reservations;
const byId = (id: string) => reservations.find((r) => r.id === id) as Reservation;

const base = { restaurant, schedule, reservations };

describe('checkAvailability — seeded edge cases', () => {
  it('reports UNAVAILABLE when the Private Room is fully booked out', () => {
    const ev = byId('edge-unavail'); // party of 10 holding P1+P2+P3
    const res = checkAvailability({ ...base, dateISO: ev.dateISO, time: ev.time, partySize: 10 });
    expect(res.level).toBe('unavailable');
    expect(res.closed).toBe('none');
    expect(res.fittingTables).toHaveLength(0);
    expect(res.combination).toHaveLength(0);
  });

  it('reports TIGHT when exactly one fitting table is left', () => {
    const ev = byId('edge-tight-block'); // party of 10 on P2, leaving only P1 for a big party
    const res = checkAvailability({ ...base, dateISO: ev.dateISO, time: ev.time, partySize: 8 });
    expect(res.level).toBe('tight');
    expect(res.fittingTables).toHaveLength(1);
    expect(res.fittingTables[0].id).toBe('bal-pr1');
  });

  it('takes the COMBINATION path when no single table fits a party of 12', () => {
    const ev = byId('edge-tight-block'); // same date/time; P2 taken, P1+P3 free
    const res = checkAvailability({ ...base, dateISO: ev.dateISO, time: ev.time, partySize: 12 });
    expect(res.level).toBe('available');
    expect(res.fittingTables).toHaveLength(0);
    expect(res.combination.length).toBeGreaterThanOrEqual(2);
    const seats = res.combination.reduce((sum, t) => sum + t.seats, 0);
    expect(seats).toBeGreaterThanOrEqual(12);
  });

  it('reports BETWEEN_SHIFTS at 15:00 on an open day (split shift)', () => {
    const ev = byId('edge-tight-block');
    const res = checkAvailability({ ...base, dateISO: ev.dateISO, time: '15:00', partySize: 2 });
    expect(res.level).toBe('unavailable');
    expect(res.closed).toBe('between_shifts');
  });

  it('offers same-day alternative times when the requested slot is full', () => {
    const ev = byId('edge-unavail');
    const res = checkAvailability({ ...base, dateISO: ev.dateISO, time: ev.time, partySize: 10 });
    expect(res.alternativeTimes.length).toBeGreaterThan(0);
    expect(res.alternativeTimes).not.toContain(ev.time);
  });

  it('ignores cancelled / no_show reservations when computing occupancy', () => {
    const ev = byId('edge-unavail');
    const cancelledClone: Reservation = { ...ev, id: 'test-cancelled', status: 'cancelled' };
    const res = checkAvailability({
      restaurant,
      schedule,
      reservations: [cancelledClone], // only a cancelled Private-Room hold exists
      dateISO: ev.dateISO,
      time: ev.time,
      partySize: 10,
    });
    // P2 is free again, so a party of 10 fits (its only fitting table).
    expect(res.level).not.toBe('unavailable');
  });
});
