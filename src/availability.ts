import type { Reservation, Restaurant, Schedule, Table } from './types';
import { formatTime12, minutesOf, weekdayOf } from './format';
import { isClosedDate, isClosedDay, shiftsForDate, shiftForTime, slotsForDate, turnMinutes } from './schedule';

export type AvailabilityLevel = 'available' | 'tight' | 'unavailable';

export interface AvailabilityResult {
  level: AvailabilityLevel;
  reason: string;
  closed: 'none' | 'day' | 'date' | 'between_shifts' | 'outside_hours';
  freeTables: Table[];
  fittingTables: Table[];
  combination: Table[];
  alternativeTimes: string[];
}

const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

interface Input {
  restaurant: Restaurant;
  schedule: Schedule;
  reservations: Reservation[];
  dateISO: string;
  time: string;
  partySize: number;
  ignoreReservationId?: string;
}

const fits = (t: Table, party: number): boolean => t.minSeats <= party && party <= t.seats;

// A reservation blocks its tables for [start, start + turn). Two intervals
// overlap when each starts before the other ends. Cancelled / no_show don't block.
function tablesFreeAt(input: Input, time: string): Table[] {
  const qStart = minutesOf(time);
  const qEnd = qStart + turnMinutes(input.partySize);
  const busy = new Set<string>();
  for (const r of input.reservations) {
    if (r.id === input.ignoreReservationId) continue;
    if (r.restaurantId !== input.restaurant.id) continue;
    if (r.dateISO !== input.dateISO) continue;
    if (r.status === 'cancelled' || r.status === 'no_show') continue;
    const rStart = minutesOf(r.time);
    const rEnd = rStart + turnMinutes(r.partySize);
    if (qStart < rEnd && rStart < qEnd) {
      for (const id of r.tableIds) busy.add(id);
    }
  }
  return input.restaurant.tables.filter((t) => !busy.has(t.id));
}

// Walk the combinable graph over FREE tables only, greedily taking the biggest
// tables in a connected component until they seat the party. Returns [] if none.
function findCombination(free: Table[], party: number): Table[] {
  const seen = new Set<string>();
  const isLinked = (a: Table, b: Table): boolean =>
    a.combinableWith.includes(b.id) || b.combinableWith.includes(a.id);

  for (const start of free) {
    if (seen.has(start.id)) continue;
    const component: Table[] = [];
    const stack: Table[] = [start];
    const local = new Set<string>([start.id]);
    while (stack.length) {
      const cur = stack.pop() as Table;
      component.push(cur);
      for (const other of free) {
        if (local.has(other.id)) continue;
        if (isLinked(cur, other)) {
          local.add(other.id);
          stack.push(other);
        }
      }
    }
    for (const id of local) seen.add(id);
    if (component.length < 2) continue;
    const sorted = [...component].sort((a, b) => b.seats - a.seats);
    const pick: Table[] = [];
    let sum = 0;
    for (const t of sorted) {
      pick.push(t);
      sum += t.seats;
      if (sum >= party) return pick;
    }
  }
  return [];
}

function wouldFit(input: Input, time: string): boolean {
  const free = tablesFreeAt(input, time);
  if (free.some((t) => fits(t, input.partySize))) return true;
  return findCombination(free, input.partySize).length > 0;
}

export function checkAvailability(input: Input): AvailabilityResult {
  const { schedule, dateISO, time, partySize } = input;

  const empty = { freeTables: [] as Table[], fittingTables: [] as Table[], combination: [] as Table[] };

  // Fully closed days / holidays: nothing to offer.
  if (isClosedDate(schedule, dateISO)) {
    return { level: 'unavailable', closed: 'date', reason: `Closed on ${dateISO} (holiday)`, alternativeTimes: [], ...empty };
  }
  if (isClosedDay(schedule, dateISO)) {
    return { level: 'unavailable', closed: 'day', reason: `Closed on ${WEEKDAYS_LONG[weekdayOf(dateISO)]}s`, alternativeTimes: [], ...empty };
  }

  // Same-day slots that would seat this party — useful for every non-fully-closed result.
  const alternativeTimes = slotsForDate(schedule, dateISO)
    .filter((s) => s !== time && wouldFit(input, s))
    .slice(0, 4);

  // Open day but the requested time sits outside any service window.
  if (!shiftForTime(schedule, dateISO, time)) {
    const shifts = shiftsForDate(schedule, dateISO);
    const t = minutesOf(time);
    const afterOne = shifts.some((s) => t >= minutesOf(s.end));
    const beforeAnother = shifts.some((s) => t < minutesOf(s.start));
    const betweenShifts = afterOne && beforeAnother;
    return {
      level: 'unavailable',
      closed: betweenShifts ? 'between_shifts' : 'outside_hours',
      reason: betweenShifts ? 'Kitchen is between service — try dinner' : 'Outside opening hours',
      alternativeTimes,
      ...empty,
    };
  }

  const freeTables = tablesFreeAt(input, time);
  const fittingTables = freeTables.filter((t) => fits(t, partySize));

  if (fittingTables.length >= 2) {
    return {
      level: 'available',
      closed: 'none',
      reason: `Can seat party of ${partySize} — ${fittingTables.length} tables free`,
      freeTables,
      fittingTables,
      combination: [],
      alternativeTimes,
    };
  }
  if (fittingTables.length === 1) {
    return {
      level: 'tight',
      closed: 'none',
      reason: `Only 1 table left for party of ${partySize}`,
      freeTables,
      fittingTables,
      combination: [],
      alternativeTimes,
    };
  }

  // No single table fits — try combining adjacent tables.
  const combination = findCombination(freeTables, partySize);
  if (combination.length) {
    return {
      level: 'available',
      closed: 'none',
      reason: `Party of ${partySize} seated across ${combination.length} combined tables`,
      freeTables,
      fittingTables,
      combination,
      alternativeTimes,
    };
  }

  return {
    level: 'unavailable',
    closed: 'none',
    reason: `Fully booked for party of ${partySize} at ${formatTime12(time)}`,
    freeTables,
    fittingTables,
    combination: [],
    alternativeTimes,
  };
}
