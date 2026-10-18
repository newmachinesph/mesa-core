import type { Guest, GuestTag, Reservation } from './types';
import { toE164 } from './format';

export function deriveAutoTags(guest: Guest): GuestTag[] {
  const tags: GuestTag[] = [];
  if (guest.visitCount >= 5) {
    tags.push({ id: 'auto-frequent', label: 'Frequent', kind: 'auto', tone: 'info' });
  }
  if (guest.visitCount >= 10) {
    tags.push({ id: 'auto-vip', label: 'VIP', kind: 'auto', tone: 'brass' });
  }
  if (guest.noShowCount >= 2) {
    tags.push({ id: 'auto-noshow', label: 'No-show risk', kind: 'auto', tone: 'danger' });
  }
  if (guest.occasions.length >= 2) {
    tags.push({ id: 'auto-celebrator', label: 'Celebrator', kind: 'auto', tone: 'warn' });
  }
  return tags;
}

// Manual tags first, then derived — deduped by label so a manual tag wins.
export function tagsFor(guest: Guest): GuestTag[] {
  const out: GuestTag[] = [];
  const seen = new Set<string>();
  for (const tag of [...guest.tags, ...deriveAutoTags(guest)]) {
    if (seen.has(tag.label)) continue;
    seen.add(tag.label);
    out.push(tag);
  }
  return out;
}

// Dedupe by E.164 phone: bump the existing guest or append a fresh one. Immutable.
export function upsertGuestFromReservation(guests: Guest[], r: Reservation): Guest[] {
  const key = toE164(r.phone);
  const idx = guests.findIndex((g) => toE164(g.phone) === key);
  if (idx >= 0) {
    const g = guests[idx];
    const occasions =
      r.occasion && !g.occasions.includes(r.occasion) ? [...g.occasions, r.occasion] : g.occasions;
    const updated: Guest = { ...g, visitCount: g.visitCount + 1, lastVisit: r.dateISO, occasions };
    return guests.map((x, i) => (i === idx ? updated : x));
  }
  const fresh: Guest = {
    id: `guest-${key}`,
    name: r.name,
    phone: key,
    visitCount: 1,
    noShowCount: 0,
    tags: [],
    notes: '',
    occasions: r.occasion ? [r.occasion] : [],
    firstVisit: r.dateISO,
    lastVisit: r.dateISO,
  };
  return [...guests, fresh];
}
