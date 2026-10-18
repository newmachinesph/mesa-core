// Shared domain types for Mesa. Framework-free, dependency-free.

export type Role = 'host' | 'manager' | 'finance';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export type DepositStatus =
  | 'none'
  | 'awaiting_proof'
  | 'pending_review'
  | 'verified'
  | 'forfeited';

export type PaymentMethod = 'gcash' | 'maya' | 'instapay' | 'bank_transfer';

export type Occasion =
  | 'birthday'
  | 'debut'
  | 'anniversary'
  | 'christening'
  | 'graduation'
  | 'despedida'
  | 'blowout'
  | 'other';

export type TableShape = 'round' | 'square' | 'rect' | 'booth';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'brass' | 'neutral';

export type PriceBand = '₱' | '₱₱' | '₱₱₱' | '₱₱₱₱';

export interface Zone {
  id: string;
  name: string;
  restaurantId: string;
}

export interface Table {
  id: string;
  label: string;
  seats: number;
  minSeats: number;
  gridX: number;
  gridY: number;
  shape: TableShape;
  zoneId: string;
  combinableWith: string[];
}

export interface DepositPolicy {
  required: boolean;
  perHead: boolean;
  amount: number;
  requiredFromPartySize: number;
  nonRefundable: boolean;
  methods: PaymentMethod[];
  gcashNumber: string;
  gcashName: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  priceBand: PriceBand;
  address: string;
  heroImage: string;
  blurb: string;
  zones: Zone[];
  tables: Table[];
  depositPolicy: DepositPolicy;
  scheduleId: string;
}

export interface Shift {
  id: string;
  name: string;
  start: string; // 'HH:mm'
  end: string; // 'HH:mm'
}

export interface DaySchedule {
  weekday: number; // 0 = Sunday
  closed: boolean;
  shifts: Shift[];
}

export interface Schedule {
  id: string;
  restaurantId: string;
  slotMinutes: number;
  closedDates: string[]; // 'YYYY-MM-DD'
  days: DaySchedule[];
}

export interface Deposit {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: DepositStatus;
  reference?: string;
  proofUri?: string;
  uploadedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  guestId: string;
  name: string;
  phone: string; // E.164
  partySize: number;
  dateISO: string;
  time: string; // 'HH:mm'
  occasion?: Occasion;
  notes?: string;
  status: ReservationStatus;
  tableIds: string[];
  deposit?: Deposit;
  source: 'online' | 'phone' | 'walk_in';
  createdAt: string;
}

export interface GuestTag {
  id: string;
  label: string;
  kind: 'auto' | 'manual';
  tone: Tone;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visitCount: number;
  noShowCount: number;
  tags: GuestTag[];
  notes: string;
  occasions: Occasion[];
  firstVisit?: string;
  lastVisit?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  restaurantIds: string[];
}

export interface MesaState {
  restaurants: Restaurant[];
  schedules: Schedule[];
  reservations: Reservation[];
  guests: Guest[];
  users: User[];
}
