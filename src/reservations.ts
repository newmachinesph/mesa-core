import type { DepositPolicy, ReservationStatus, Tone } from './types';

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated: ['completed'],
  completed: [],
  no_show: [],
  cancelled: [],
};

const TONES: Record<ReservationStatus, Tone> = {
  pending: 'warn',
  confirmed: 'info',
  seated: 'brass',
  completed: 'ok',
  no_show: 'danger',
  cancelled: 'neutral',
};

const LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  seated: 'Seated',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

export function nextStatuses(status: ReservationStatus): ReservationStatus[] {
  return TRANSITIONS[status];
}

export function statusTone(status: ReservationStatus): Tone {
  return TONES[status];
}

export function statusLabel(status: ReservationStatus): string {
  return LABELS[status];
}

export function depositRequired(policy: DepositPolicy, partySize: number): boolean {
  return policy.required && partySize >= policy.requiredFromPartySize;
}

export function depositAmount(policy: DepositPolicy, partySize: number): number {
  if (!depositRequired(policy, partySize)) return 0;
  return policy.perHead ? policy.amount * partySize : policy.amount;
}
