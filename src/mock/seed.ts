import type {
  DaySchedule,
  Deposit,
  DepositStatus,
  Guest,
  GuestTag,
  MesaState,
  Occasion,
  PaymentMethod,
  Reservation,
  ReservationStatus,
  Restaurant,
  Schedule,
  Shift,
  Table,
  TableShape,
  User,
  Zone,
} from '../types';
import { addDaysISO, todayISO, weekdayOf } from '../format';

// Deterministic seed data. No Math.random — a tiny LCG drives all "randomness".
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const pick = <T>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

const RECEIPT_URI =
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80';
const HERO_BALISONG =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80';
const HERO_CASA =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&q=80';
const HERO_SALCEDO =
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80';

// --- Shifts -----------------------------------------------------------------
const LUNCH: Shift = { id: 'lunch', name: 'Lunch', start: '11:00', end: '14:30' };
const DINNER: Shift = { id: 'dinner', name: 'Dinner', start: '17:30', end: '22:00' };
const CASA_DINNER: Shift = { id: 'dinner', name: 'Dinner', start: '17:00', end: '23:00' };
const MALL: Shift = { id: 'all-day', name: 'All day', start: '11:00', end: '21:00' };

function zone(id: string, name: string, restaurantId: string): Zone {
  return { id, name, restaurantId };
}

function tbl(
  id: string,
  label: string,
  seats: number,
  minSeats: number,
  gridX: number,
  gridY: number,
  shape: TableShape,
  zoneId: string,
  combinableWith: string[] = [],
): Table {
  return { id, label, seats, minSeats, gridX, gridY, shape, zoneId, combinableWith };
}

// --- Balisong Kitchen + Bar (BGC) — the fully-modelled restaurant -----------
const BAL_ZONES: Zone[] = [
  zone('bal-z-main', 'Main Hall', 'bal'),
  zone('bal-z-fresco', 'Al Fresco', 'bal'),
  zone('bal-z-bar', 'The Bar', 'bal'),
  zone('bal-z-private', 'Private Room', 'bal'),
];

// Combinations reaching >=10 seats exist ONLY in the Private Room. That keeps
// the seeded edge cases (party 12/14 combos, party-10 unavailable) deterministic.
const BAL_TABLES: Table[] = [
  tbl('bal-mh1', 'T1', 2, 1, 0, 0, 'square', 'bal-z-main', ['bal-mh2']),
  tbl('bal-mh2', 'T2', 2, 1, 1, 0, 'square', 'bal-z-main', ['bal-mh1']),
  tbl('bal-mh3', 'T3', 4, 2, 0, 2, 'square', 'bal-z-main', ['bal-mh4']),
  tbl('bal-mh4', 'T4', 4, 2, 1, 2, 'square', 'bal-z-main', ['bal-mh3']),
  tbl('bal-mh5', 'T5', 4, 2, 3, 2, 'rect', 'bal-z-main'),
  tbl('bal-mh6', 'T6', 6, 3, 0, 4, 'rect', 'bal-z-main'),
  tbl('bal-af1', 'A1', 2, 1, 5, 0, 'round', 'bal-z-fresco'),
  tbl('bal-af2', 'A2', 4, 2, 6, 0, 'round', 'bal-z-fresco', ['bal-af3']),
  tbl('bal-af3', 'A3', 4, 2, 7, 0, 'round', 'bal-z-fresco', ['bal-af2']),
  tbl('bal-af4', 'A4', 6, 3, 5, 2, 'rect', 'bal-z-fresco'),
  tbl('bal-b1', 'B1', 2, 1, 9, 0, 'booth', 'bal-z-bar', ['bal-b2']),
  tbl('bal-b2', 'B2', 2, 1, 9, 1, 'booth', 'bal-z-bar', ['bal-b1']),
  tbl('bal-pr1', 'P1', 8, 4, 5, 5, 'rect', 'bal-z-private', ['bal-pr2', 'bal-pr3']),
  tbl('bal-pr2', 'P2', 10, 5, 7, 5, 'rect', 'bal-z-private', ['bal-pr1', 'bal-pr3']),
  tbl('bal-pr3', 'P3', 6, 3, 9, 5, 'round', 'bal-z-private', ['bal-pr1', 'bal-pr2']),
];

// --- Casa Herencia (Poblacion) & The Salcedo Room (Makati) ------------------
// Built with a small deterministic helper — they don't drive edge cases.
function buildZonedTables(
  prefix: string,
  zones: { id: string; count: number }[],
  rng: () => number,
): Table[] {
  const shapes: TableShape[] = ['round', 'square', 'rect', 'booth'];
  const seatPlan = [2, 2, 4, 4, 4, 6, 6, 8, 10];
  const out: Table[] = [];
  let n = 0;
  for (const z of zones) {
    let prev: string | null = null;
    for (let i = 0; i < z.count; i++) {
      const seats = pick(seatPlan, rng);
      const id = `${prefix}-t${n + 1}`;
      const shape: TableShape = seats <= 2 && rng() > 0.5 ? 'booth' : pick(shapes, rng);
      // Wire small adjacent same-zone pairs as combinable (never reaching 10).
      const combinable = prev && seats <= 4 ? [prev] : [];
      const t = tbl(id, `${z.id.slice(-1).toUpperCase()}${i + 1}`, seats, Math.max(1, seats - 2), n % 12, Math.floor(n / 12) % 8, shape, z.id, combinable);
      if (prev && seats <= 4) {
        const prevTable = out.find((x) => x.id === prev);
        if (prevTable) prevTable.combinableWith.push(id);
      }
      out.push(t);
      prev = seats <= 4 ? id : null;
      n++;
    }
  }
  return out;
}

const casaRng = makeRng(2024);
const CASA_ZONES: Zone[] = [
  zone('casa-z-hall', 'Main Hall', 'casa'),
  zone('casa-z-lanai', 'Lanai', 'casa'),
  zone('casa-z-function', 'Function Room', 'casa'),
];
const CASA_TABLES = buildZonedTables('casa', [
  { id: 'casa-z-hall', count: 6 },
  { id: 'casa-z-lanai', count: 5 },
  { id: 'casa-z-function', count: 3 },
], casaRng);

const salcedoRng = makeRng(7788);
const SALCEDO_ZONES: Zone[] = [
  zone('salc-z-hall', 'Main Hall', 'salc'),
  zone('salc-z-mezz', 'Mezzanine', 'salc'),
  zone('salc-z-bar', 'The Bar', 'salc'),
  zone('salc-z-garden', 'Garden Terrace', 'salc'),
];
const SALCEDO_TABLES = buildZonedTables('salc', [
  { id: 'salc-z-hall', count: 6 },
  { id: 'salc-z-mezz', count: 4 },
  { id: 'salc-z-bar', count: 4 },
  { id: 'salc-z-garden', count: 4 },
], salcedoRng);

const RESTAURANTS: Restaurant[] = [
  {
    id: 'bal',
    name: 'Balisong Kitchen + Bar',
    slug: 'balisong-kitchen-bar',
    cuisine: 'Modern Filipino',
    priceBand: '₱₱₱',
    address: '8th Ave cor 28th St, BGC, Taguig',
    heroImage: HERO_BALISONG,
    blurb: 'Live-fire Filipino cooking and a brass-lit bar in the heart of BGC.',
    zones: BAL_ZONES,
    tables: BAL_TABLES,
    depositPolicy: {
      required: true,
      perHead: true,
      amount: 500,
      requiredFromPartySize: 6,
      nonRefundable: true,
      methods: ['gcash', 'maya', 'instapay', 'bank_transfer'],
      gcashNumber: '0917 555 0181',
      gcashName: 'Balisong Hospitality Inc.',
    },
    scheduleId: 'sched-bal',
  },
  {
    id: 'casa',
    name: 'Casa Herencia',
    slug: 'casa-herencia',
    cuisine: 'Spanish-Filipino Heritage',
    priceBand: '₱₱₱₱',
    address: 'Felipe St, Poblacion, Makati',
    heroImage: HERO_CASA,
    blurb: 'Heritage recipes and long dinners in a restored Poblacion ancestral house.',
    zones: CASA_ZONES,
    tables: CASA_TABLES,
    depositPolicy: {
      required: true,
      perHead: false,
      amount: 2000,
      requiredFromPartySize: 6,
      nonRefundable: true,
      methods: ['gcash', 'bank_transfer'],
      gcashNumber: '0917 555 0244',
      gcashName: 'Casa Herencia Restaurant',
    },
    scheduleId: 'sched-casa',
  },
  {
    id: 'salc',
    name: 'The Salcedo Room',
    slug: 'the-salcedo-room',
    cuisine: 'Contemporary Grill',
    priceBand: '₱₱₱',
    address: 'Level 4, Salcedo Village Mall, Makati',
    heroImage: HERO_SALCEDO,
    blurb: 'All-day grill and cocktails inside Salcedo Village — mall hours, city view.',
    zones: SALCEDO_ZONES,
    tables: SALCEDO_TABLES,
    depositPolicy: {
      required: true,
      perHead: true,
      amount: 300,
      requiredFromPartySize: 8,
      nonRefundable: false,
      methods: ['gcash', 'maya', 'instapay'],
      gcashNumber: '0917 555 0399',
      gcashName: 'Salcedo Room Dining',
    },
    scheduleId: 'sched-salc',
  },
];

// --- Schedules --------------------------------------------------------------
function week(builder: (weekday: number) => DaySchedule): DaySchedule[] {
  return [0, 1, 2, 3, 4, 5, 6].map(builder);
}

const SCHEDULES: Schedule[] = [
  {
    id: 'sched-bal',
    restaurantId: 'bal',
    slotMinutes: 30,
    closedDates: [],
    // Split shift, closed Mondays (weekday 1).
    days: week((w) => ({ weekday: w, closed: w === 1, shifts: w === 1 ? [] : [LUNCH, DINNER] })),
  },
  {
    id: 'sched-casa',
    restaurantId: 'casa',
    slotMinutes: 30,
    closedDates: [],
    // Dinner-only, Tue–Sun (closed Monday).
    days: week((w) => ({ weekday: w, closed: w === 1, shifts: w === 1 ? [] : [CASA_DINNER] })),
  },
  {
    id: 'sched-salc',
    restaurantId: 'salc',
    slotMinutes: 30,
    // Mall hours, continuous, closed Sundays + one holiday.
    closedDates: ['2026-12-25'],
    days: week((w) => ({ weekday: w, closed: w === 0, shifts: w === 0 ? [] : [MALL] })),
  },
];

// First open Balisong date on/after `fromISO` (skips Mondays + closed dates).
function firstOpenBalisong(fromISO: string, skip: number): string {
  const sched = SCHEDULES[0];
  let d = fromISO;
  let found = 0;
  for (let i = 0; i < 21; i++) {
    const open = weekdayOf(d) !== 1 && !sched.closedDates.includes(d);
    if (open) {
      if (found === skip) return d;
      found++;
    }
    d = addDaysISO(d, 1);
  }
  return fromISO;
}

// --- Guest roster (reservations dedupe onto these by phone) ------------------
interface RosterEntry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  baseVisits: number;
  baseNoShow: number;
  tags: GuestTag[];
  notes: string;
}
const manual = (id: string, label: string, tone: GuestTag['tone']): GuestTag => ({ id, label, kind: 'manual', tone });

const ROSTER: RosterEntry[] = [
  { id: 'g-maria', name: 'Maria Santos', phone: '+639171234567', email: 'maria.santos@example.ph', baseVisits: 11, baseNoShow: 0, tags: [manual('m-wine', 'Wine lover', 'brass')], notes: 'Prefers the Private Room. Always orders the barrel-aged negroni.' },
  { id: 'g-jose', name: 'Jose Reyes', phone: '+639181234501', baseVisits: 3, baseNoShow: 0, tags: [], notes: 'Corporate account — books Friday dinners.' },
  { id: 'g-ana', name: 'Ana Cruz', phone: '+639191234502', baseVisits: 5, baseNoShow: 0, tags: [], notes: 'Celebrates most milestones here.' },
  { id: 'g-miguel', name: 'Miguel dela Cruz', phone: '+639951234503', baseVisits: 2, baseNoShow: 0, tags: [], notes: '' },
  { id: 'g-sofia', name: 'Sofia Mendoza', phone: '+639971234504', baseVisits: 4, baseNoShow: 0, tags: [], notes: 'Vegetarian, no pork.' },
  { id: 'g-juan', name: 'Juan Carlos Bautista', phone: '+639081234505', baseVisits: 1, baseNoShow: 0, tags: [], notes: '' },
  { id: 'g-katrina', name: 'Katrina Villanueva', phone: '+639091234506', baseVisits: 6, baseNoShow: 0, tags: [], notes: 'Big debut/anniversary bookings.' },
  { id: 'g-paolo', name: 'Paolo Aquino', phone: '+639201234507', baseVisits: 2, baseNoShow: 1, tags: [], notes: '' },
  { id: 'g-bea', name: 'Bea Gonzales', phone: '+639211234508', baseVisits: 3, baseNoShow: 0, tags: [], notes: '' },
  { id: 'g-marco', name: 'Marco Ramos', phone: '+639181234509', baseVisits: 1, baseNoShow: 3, tags: [manual('m-prob', 'Problematic', 'danger')], notes: 'Repeat no-shows. Require deposit before confirming.' },
  { id: 'g-isabel', name: 'Isabel Fernandez', phone: '+639171234510', baseVisits: 4, baseNoShow: 0, tags: [manual('m-shell', 'Allergy: shellfish', 'warn')], notes: 'Severe shellfish allergy — flag the kitchen.' },
  { id: 'g-carlo', name: 'Carlo Tan', phone: '+639951234511', baseVisits: 2, baseNoShow: 0, tags: [], notes: '' },
  { id: 'g-patricia', name: 'Patricia Lim', phone: '+639971234512', baseVisits: 3, baseNoShow: 0, tags: [], notes: '' },
  { id: 'g-rafael', name: 'Rafael Ocampo', phone: '+639081234513', baseVisits: 5, baseNoShow: 0, tags: [], notes: 'Wine club member.' },
];

// --- Reservations -----------------------------------------------------------
const D_UN = firstOpenBalisong(todayISO(), 0); // party-10 event books out the Private Room
const D_TC = firstOpenBalisong(todayISO(), 1); // tight + combination probes land here
const D_BIG = firstOpenBalisong(todayISO(), 2);
const D_BIG2 = firstOpenBalisong(todayISO(), 3);

function deposit(
  id: string,
  amount: number,
  method: PaymentMethod,
  status: DepositStatus,
  ref?: string,
): Deposit {
  const base: Deposit = { id, amount, method, status };
  if (status === 'pending_review' || status === 'verified') {
    base.proofUri = RECEIPT_URI;
    base.uploadedAt = `${D_UN}T09:12:00+08:00`;
    base.reference = ref;
  }
  if (status === 'awaiting_proof') base.reference = ref;
  if (status === 'verified') {
    base.verifiedBy = 'Grace Domingo';
    base.verifiedAt = `${D_UN}T10:02:00+08:00`;
  }
  return base;
}

// Explicit edge-case reservations — the proof the availability engine works.
const EDGE_RESERVATIONS: Reservation[] = [
  {
    id: 'edge-unavail',
    restaurantId: 'bal',
    guestId: 'g-katrina',
    name: 'Katrina Villanueva',
    phone: '+639091234506',
    partySize: 10,
    dateISO: D_UN,
    time: '19:00',
    occasion: 'debut',
    notes: 'Debut — full Private Room buyout (P1+P2+P3).',
    status: 'confirmed',
    tableIds: ['bal-pr1', 'bal-pr2', 'bal-pr3'],
    deposit: deposit('dep-edge-un', 5000, 'gcash', 'verified', 'GC-8817263'),
    source: 'online',
    createdAt: `${todayISO()}T08:00:00+08:00`,
  },
  {
    id: 'edge-tight-block',
    restaurantId: 'bal',
    guestId: 'g-jose',
    name: 'Jose Reyes',
    phone: '+639181234501',
    partySize: 10,
    dateISO: D_TC,
    time: '19:00',
    occasion: 'blowout',
    notes: 'Company blowout on P2 — leaves exactly one big table (P1) free.',
    status: 'confirmed',
    tableIds: ['bal-pr2'],
    deposit: deposit('dep-edge-tight', 5000, 'gcash', 'pending_review', 'GC-5521904'),
    source: 'phone',
    createdAt: `${todayISO()}T08:05:00+08:00`,
  },
  {
    id: 'edge-combo-12',
    restaurantId: 'bal',
    guestId: 'g-ana',
    name: 'Ana Cruz',
    phone: '+639191234502',
    partySize: 12,
    dateISO: D_BIG,
    time: '19:00',
    occasion: 'anniversary',
    notes: 'Party of 12 — no single table fits; seated across P1+P3.',
    status: 'confirmed',
    tableIds: ['bal-pr1', 'bal-pr3'],
    deposit: deposit('dep-edge-12', 6000, 'gcash', 'verified', 'GC-3390014'),
    source: 'online',
    createdAt: `${todayISO()}T08:10:00+08:00`,
  },
  {
    id: 'edge-combo-14',
    restaurantId: 'bal',
    guestId: 'g-maria',
    name: 'Maria Santos',
    phone: '+639171234567',
    partySize: 14,
    dateISO: D_BIG2,
    time: '19:00',
    occasion: 'birthday',
    notes: 'Party of 14 — seated across P1+P2.',
    status: 'pending',
    tableIds: ['bal-pr1', 'bal-pr2'],
    deposit: deposit('dep-edge-14', 7000, 'gcash', 'awaiting_proof', undefined),
    source: 'online',
    createdAt: `${todayISO()}T08:15:00+08:00`,
  },
];

// Filler reservations: volume + status/occasion/source spread. Never touch the
// Private Room, so they can't disturb the edge cases above.
const FILLER_TABLES = ['bal-mh1', 'bal-mh2', 'bal-mh3', 'bal-mh4', 'bal-mh5', 'bal-mh6', 'bal-af1', 'bal-af2', 'bal-af3', 'bal-af4', 'bal-b1', 'bal-b2'];
const FILLER_TIMES = ['11:00', '11:30', '12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
const STATUSES: ReservationStatus[] = ['pending', 'confirmed', 'seated', 'completed', 'no_show', 'cancelled'];
const OCCASIONS: (Occasion | undefined)[] = [undefined, undefined, 'birthday', 'anniversary', 'graduation', 'christening', 'despedida', 'other'];
const SOURCES: Reservation['source'][] = ['online', 'phone', 'walk_in'];
const DEP_STATUSES: DepositStatus[] = ['none', 'none', 'awaiting_proof', 'pending_review', 'verified', 'forfeited'];
const METHODS: PaymentMethod[] = ['gcash', 'gcash', 'gcash', 'maya', 'instapay', 'bank_transfer'];

function buildFiller(): Reservation[] {
  const rng = makeRng(4242);
  const today = todayISO();
  const out: Reservation[] = [];
  for (let i = 0; i < 26; i++) {
    const g = ROSTER[Math.floor(rng() * ROSTER.length)];
    const table = pick(FILLER_TABLES, rng);
    const seats = BAL_TABLES.find((t) => t.id === table)?.seats ?? 4;
    const partySize = 2 + Math.floor(rng() * Math.max(1, seats - 1)); // fits the chosen table
    const offset = -1 + Math.floor(rng() * 5); // yesterday .. +3
    const dateISO = addDaysISO(today, offset);
    // Balisong is closed Monday — nudge Monday bookings to Tuesday.
    const safeDate = weekdayOf(dateISO) === 1 ? addDaysISO(dateISO, 1) : dateISO;
    const status = pick(STATUSES, rng);
    const occasion = pick(OCCASIONS, rng);
    const depStatus = partySize >= 6 ? pick(DEP_STATUSES, rng) : 'none';
    const dep =
      depStatus === 'none'
        ? undefined
        : deposit(`dep-f${i}`, partySize * 500, pick(METHODS, rng), depStatus, `GC-${100000 + Math.floor(rng() * 899999)}`);
    out.push({
      id: `res-f${i}`,
      restaurantId: 'bal',
      guestId: g.id,
      name: g.name,
      phone: g.phone,
      partySize,
      dateISO: safeDate,
      time: pick(FILLER_TIMES, rng),
      occasion,
      notes: '',
      status,
      tableIds: [table],
      deposit: dep,
      source: pick(SOURCES, rng),
      createdAt: `${addDaysISO(safeDate, -2)}T10:00:00+08:00`,
    });
  }
  return out;
}

const RESERVATIONS: Reservation[] = [...EDGE_RESERVATIONS, ...buildFiller()];

// --- Guests (aggregated from reservations, deduped by phone) ----------------
function buildGuests(reservations: Reservation[]): Guest[] {
  return ROSTER.map((r): Guest => {
    const mine = reservations.filter((x) => x.guestId === r.id);
    const seatedVisits = mine.filter((x) => x.status === 'completed' || x.status === 'seated').length;
    const noShows = mine.filter((x) => x.status === 'no_show').length;
    const occasions = Array.from(
      new Set(mine.map((x) => x.occasion).filter((o): o is Occasion => Boolean(o))),
    );
    const dates = mine.map((x) => x.dateISO).sort();
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      // Lifetime totals = historical base + what the seeded window shows.
      visitCount: r.baseVisits + seatedVisits,
      noShowCount: r.baseNoShow + noShows,
      tags: r.tags,
      notes: r.notes,
      occasions,
      firstVisit: dates[0],
      lastVisit: dates[dates.length - 1],
    };
  });
}

const USERS: User[] = [
  { id: 'u-ligaya', name: 'Ligaya Bautista', role: 'manager', restaurantIds: ['bal', 'casa', 'salc'] },
  { id: 'u-miguel', name: 'Miguel dela Cruz', role: 'host', restaurantIds: ['bal'] },
  { id: 'u-grace', name: 'Grace Domingo', role: 'finance', restaurantIds: ['bal', 'casa', 'salc'] },
];

export function seedState(): MesaState {
  return {
    restaurants: RESTAURANTS,
    schedules: SCHEDULES,
    reservations: RESERVATIONS,
    guests: buildGuests(RESERVATIONS),
    users: USERS,
  };
}
