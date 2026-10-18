import type { Schedule, Shift } from './types';
import { minutesOf, timeFromMinutes, weekdayOf } from './format';

export function isClosedDate(schedule: Schedule, dateISO: string): boolean {
  return schedule.closedDates.includes(dateISO);
}

export function isClosedDay(schedule: Schedule, dateISO: string): boolean {
  const day = schedule.days.find((d) => d.weekday === weekdayOf(dateISO));
  return !day || day.closed;
}

export function shiftsForDate(schedule: Schedule, dateISO: string): Shift[] {
  if (isClosedDate(schedule, dateISO) || isClosedDay(schedule, dateISO)) return [];
  const day = schedule.days.find((d) => d.weekday === weekdayOf(dateISO));
  return day ? day.shifts : [];
}

export function shiftForTime(schedule: Schedule, dateISO: string, time: string): Shift | null {
  const t = minutesOf(time);
  const shift = shiftsForDate(schedule, dateISO).find(
    (s) => t >= minutesOf(s.start) && t < minutesOf(s.end),
  );
  return shift ?? null;
}

// Every bookable start time inside open shifts. A slot is bookable only if it
// ends before the shift ends (start + slotMinutes <= shift end).
export function slotsForDate(schedule: Schedule, dateISO: string): string[] {
  const out: string[] = [];
  for (const shift of shiftsForDate(schedule, dateISO)) {
    const end = minutesOf(shift.end);
    for (let t = minutesOf(shift.start); t + schedule.slotMinutes <= end; t += schedule.slotMinutes) {
      out.push(timeFromMinutes(t));
    }
  }
  return out;
}

// Standard table turn: quick for small parties, longer for big ones.
export function turnMinutes(partySize: number): number {
  return partySize <= 4 ? 90 : 120;
}
