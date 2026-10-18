import { describe, it, expect } from 'vitest';
import {
  addDaysISO,
  formatDateLong,
  formatPeso,
  formatPhoneLocal,
  formatTime12,
  isValidPhMobile,
  minutesOf,
  timeFromMinutes,
  toE164,
  weekdayOf,
} from './format';

describe('money', () => {
  it('formats pesos with the ₱ sign, commas and 2 decimals', () => {
    expect(formatPeso(1500)).toBe('₱1,500.00');
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso(1234567.5)).toBe('₱1,234,567.50');
    expect(formatPeso(-500)).toBe('-₱500.00');
  });
});

describe('phone', () => {
  it('normalises local input to E.164', () => {
    expect(toE164('09171234567')).toBe('+639171234567');
    expect(toE164('+63 917 123 4567')).toBe('+639171234567');
    expect(toE164('0917 123 4567')).toBe('+639171234567');
  });

  it('renders E.164 back to local display form', () => {
    expect(formatPhoneLocal('+639171234567')).toBe('0917 123 4567');
  });

  it('validates against real PH mobile prefixes', () => {
    expect(isValidPhMobile('09171234567')).toBe(true); // Globe
    expect(isValidPhMobile('+639081234567')).toBe(true); // Smart
    expect(isValidPhMobile('08131234567')).toBe(true); // DITO
    expect(isValidPhMobile('09001234567')).toBe(false); // not a real prefix
    expect(isValidPhMobile('12345')).toBe(false);
  });
});

describe('dates (fixed +08:00, no DST)', () => {
  it('formats a long date', () => {
    expect(formatDateLong('2026-07-11')).toBe('Sat, 11 Jul 2026');
  });

  it('addDaysISO crosses month boundaries without drift', () => {
    expect(addDaysISO('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysISO('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01'); // 2026 not a leap year
  });

  it('weekdayOf returns 0=Sunday', () => {
    expect(weekdayOf('2026-07-12')).toBe(0); // Sunday
    expect(weekdayOf('2026-07-13')).toBe(1); // Monday
  });
});

describe('time', () => {
  it('12-hour formatting', () => {
    expect(formatTime12('17:30')).toBe('5:30 PM');
    expect(formatTime12('00:00')).toBe('12:00 AM');
    expect(formatTime12('12:05')).toBe('12:05 PM');
  });

  it('minutes round-trip', () => {
    expect(minutesOf('17:30')).toBe(1050);
    expect(timeFromMinutes(1050)).toBe('17:30');
    expect(timeFromMinutes(0)).toBe('00:00');
  });
});
