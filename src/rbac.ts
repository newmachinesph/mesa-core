import type { Role } from './types';

// Actions: reservation:create|edit|assignTable, floorplan:edit, schedule:edit,
// guest:edit, deposit:verify, deposit:view
export function can(role: Role, action: string): boolean {
  switch (role) {
    case 'manager':
      return true;
    case 'host':
      return action.startsWith('reservation:') || action === 'deposit:view';
    case 'finance':
      return action === 'deposit:view' || action === 'deposit:verify';
    default:
      return false;
  }
}

interface NavItem {
  href: string;
  label: string;
}

// '/' only redirects to the first real route, so it is never a nav entry.
// Settings carries the demo role switcher, so every role must be able to reach it.
const NAV: Record<Role, NavItem[]> = {
  manager: [
    { href: '/reservations', label: 'Reservations' },
    { href: '/floorplan', label: 'Floorplan' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/guests', label: 'Guests' },
    { href: '/deposits', label: 'Deposits' },
    { href: '/settings', label: 'Settings' },
  ],
  host: [
    { href: '/reservations', label: 'Reservations' },
    { href: '/guests', label: 'Guests' },
    { href: '/deposits', label: 'Deposits' },
    { href: '/settings', label: 'Settings' },
  ],
  finance: [
    { href: '/deposits', label: 'Deposits' },
    { href: '/settings', label: 'Settings' },
  ],
};

export function navFor(role: Role): NavItem[] {
  return NAV[role];
}
