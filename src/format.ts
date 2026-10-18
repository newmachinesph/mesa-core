// Formatting + date/time helpers. Asia/Manila is a FIXED +08:00 offset — no DST, ever.
// Date math is done on 'YYYY-MM-DD' and 'HH:mm' strings so nothing can drift.

export const MANILA_TZ = 'Asia/Manila';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Globe / Smart / DITO mobile prefixes (stored E.164, shown as 0917 123 4567).
const VALID_PH_PREFIXES = new Set([
  '0917', '0918', '0919', '0995', '0997', // Globe
  '0908', '0909', '0920', '0921', // Smart
  '0813', '0895', // DITO
]);

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function formatPeso(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const [int, dec] = Math.abs(amount).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${grouped}.${dec}`;
}

// '+639171234567' -> '0917 123 4567'
export function formatPhoneLocal(e164: string): string {
  let digits = e164.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = `0${digits.slice(2)}`;
  if (digits.length !== 11) return e164;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

// '09171234567' | '+63 917 123 4567' -> '+639171234567'
export function toE164(local: string): string {
  let digits = local.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `+63${digits}`;
}

export function isValidPhMobile(input: string): boolean {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  // 10 national digits after stripping 0/63; the prefix set is the real gate
  // (some DITO ranges begin 08xx, not the usual 09xx).
  if (!/^\d{10}$/.test(digits)) return false;
  return VALID_PH_PREFIXES.has(`0${digits.slice(0, 3)}`);
}

// 'YYYY-MM-DD' -> 'Sat, 12 Jul 2026'
export function formatDateLong(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  return `${WEEKDAYS_SHORT[weekdayOf(dateISO)]}, ${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

// '17:30' -> '5:30 PM'
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)} ${period}`;
}

// Asia/Manila calendar date, read from the real clock (allowed).
export function todayISO(): string {
  const now = new Date(Date.now() + MANILA_OFFSET_MS);
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

export function addDaysISO(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeFromMinutes(m: number): string {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
