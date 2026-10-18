import { describe, it, expect } from 'vitest';
import { isClosedDay, isClosedDate, shiftForTime, shiftsForDate, slotsForDate, turnMinutes } from './schedule';
import { seedState } from './mock/seed';
import { addDaysISO, weekdayOf } from './format';
import type { Schedule } from './types';

const state = seedState();
const bal = state.schedules.find((s) => s.id === 'sched-bal') as Schedule;
const salc = state.schedules.find((s) => s.id === 'sched-salc') as Schedule;

// Find a concrete date for a given weekday (0=Sun) within the next fortnight.
function dateForWeekday(w: number): string {
  let d = '2026-07-06'; // a Monday
  for (let i = 0; i < 14; i++) {
    if (weekdayOf(d) === w) return d;
    d = addDaysISO(d, 1);
  }
  return d;
}

describe('schedule', () => {
  it('turnMinutes is 90 for <=4 and 120 above', () => {
    expect(turnMinutes(2)).toBe(90);
    expect(turnMinutes(4)).toBe(90);
    expect(turnMinutes(5)).toBe(120);
    expect(turnMinutes(12)).toBe(120);
  });

  it('Balisong is closed Mondays, open Tuesdays', () => {
    expect(isClosedDay(bal, dateForWeekday(1))).toBe(true); // Monday
    expect(isClosedDay(bal, dateForWeekday(2))).toBe(false); // Tuesday
  });

  it('slotsForDate respects split shifts and never runs past shift end', () => {
    const slots = slotsForDate(bal, dateForWeekday(2)); // Tuesday, Lunch + Dinner
    expect(slots).toContain('11:00');
    expect(slots).toContain('14:00'); // 14:00 + 30 = 14:30 == lunch end, allowed
    expect(slots).not.toContain('14:30'); // would end at 15:00, past lunch end
    expect(slots).not.toContain('15:00'); // dead time between shifts
    expect(slots).toContain('17:30');
    expect(slots).toContain('21:30'); // 21:30 + 30 = 22:00 == dinner end, allowed
    expect(slots).not.toContain('22:00');
  });

  it('shiftForTime finds the right service window, null between shifts', () => {
    const tue = dateForWeekday(2);
    expect(shiftForTime(bal, tue, '12:00')?.id).toBe('lunch');
    expect(shiftForTime(bal, tue, '19:00')?.id).toBe('dinner');
    expect(shiftForTime(bal, tue, '15:00')).toBeNull();
  });

  it('Salcedo honours its holiday closedDates entry', () => {
    expect(isClosedDate(salc, '2026-12-25')).toBe(true);
    expect(shiftsForDate(salc, '2026-12-25')).toHaveLength(0);
    expect(isClosedDay(salc, dateForWeekday(0))).toBe(true); // closed Sundays
  });
});
