import { describe, it, expect } from 'vitest';
import { deriveAutoTags, tagsFor, upsertGuestFromReservation } from './guests';
import { seedState } from './mock/seed';
import type { Guest, Reservation } from './types';

const state = seedState();
const find = (id: string) => state.guests.find((g) => g.id === id) as Guest;

const labels = (g: Guest) => tagsFor(g).map((t) => t.label);

describe('auto tags', () => {
  it('flags a VIP (visitCount >= 10) — Maria Santos', () => {
    const maria = find('g-maria');
    expect(maria.visitCount).toBeGreaterThanOrEqual(10);
    expect(labels(maria)).toContain('VIP');
    expect(labels(maria)).toContain('Frequent'); // VIP implies Frequent
    expect(labels(maria)).toContain('Wine lover'); // manual tag preserved
  });

  it('flags a no-show risk (noShowCount >= 2) — Marco Ramos', () => {
    const marco = find('g-marco');
    expect(marco.noShowCount).toBeGreaterThanOrEqual(2);
    expect(labels(marco)).toContain('No-show risk');
    expect(labels(marco)).toContain('Problematic');
  });

  it('derives Celebrator from >= 2 distinct occasions', () => {
    const g: Guest = {
      id: 'x', name: 'Test', phone: '+639171234567', visitCount: 1, noShowCount: 0,
      tags: [], notes: '', occasions: ['birthday', 'anniversary'],
    };
    expect(deriveAutoTags(g).map((t) => t.label)).toContain('Celebrator');
  });

  it('tagsFor dedupes by label', () => {
    const g: Guest = {
      id: 'x', name: 'Test', phone: '+639171234567', visitCount: 12, noShowCount: 0,
      tags: [{ id: 'm', label: 'VIP', kind: 'manual', tone: 'brass' }],
      notes: '', occasions: [],
    };
    expect(labels(g).filter((l) => l === 'VIP')).toHaveLength(1);
  });
});

describe('upsertGuestFromReservation', () => {
  const r: Reservation = {
    id: 'r1', restaurantId: 'bal', guestId: 'g-new', name: 'New Guest',
    phone: '0917 123 9999', partySize: 2, dateISO: '2026-07-11', time: '19:00',
    status: 'confirmed', tableIds: ['bal-mh1'], source: 'online',
    createdAt: '2026-07-09T10:00:00+08:00',
  };

  it('appends a fresh guest when the phone is new', () => {
    const next = upsertGuestFromReservation([], r);
    expect(next).toHaveLength(1);
    expect(next[0].phone).toBe('+639171239999');
    expect(next[0].visitCount).toBe(1);
  });

  it('bumps the existing guest when the phone matches (any format)', () => {
    const existing: Guest = {
      id: 'g-old', name: 'Old', phone: '+639171239999', visitCount: 3, noShowCount: 0,
      tags: [], notes: '', occasions: [],
    };
    const next = upsertGuestFromReservation([existing], r);
    expect(next).toHaveLength(1); // deduped, not appended
    expect(next[0].visitCount).toBe(4);
    expect(existing.visitCount).toBe(3); // immutable — original untouched
  });
});
