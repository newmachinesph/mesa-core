import type { DepositStatus, PaymentMethod, Tone } from './types';

const STATUS_TONES: Record<DepositStatus, Tone> = {
  none: 'neutral',
  awaiting_proof: 'warn',
  pending_review: 'info',
  verified: 'ok',
  forfeited: 'danger',
};

const STATUS_LABELS: Record<DepositStatus, string> = {
  none: 'No deposit',
  awaiting_proof: 'Awaiting proof',
  pending_review: 'Pending review',
  verified: 'Verified',
  forfeited: 'Forfeited',
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  instapay: 'InstaPay',
  bank_transfer: 'Bank transfer',
};

export function depositStatusTone(s: DepositStatus): Tone {
  return STATUS_TONES[s];
}

export function depositStatusLabel(s: DepositStatus): string {
  return STATUS_LABELS[s];
}

export function paymentMethodLabel(m: PaymentMethod): string {
  return METHOD_LABELS[m];
}
