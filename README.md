# mesa-core

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6) ![Dependencies: none](https://img.shields.io/badge/dependencies-none-brightgreen)

Shared domain for **Mesa**, a restaurant reservation and floor-management system built for the Philippine market.

Plain TypeScript. No React, no React Native, no Next, no Node builtins, no dependencies — so the same module compiles into a Next.js server component and a React Native bundle.

## The vendoring contract

`mesa-core` is not published to npm. It is **copied** into each consuming app as `src/core`:

```
<parent>/
├── mesa-core/     ← source of truth
├── mesa-admin/    ← src/core is a generated copy
└── mesa-mobile/   ← src/core is a generated copy
```

Clone all three as siblings, then:

```bash
npm run sync                             # both apps
node scripts/sync-core.mjs mesa-admin    # just one
```

The sync wipes and rewrites `<app>/src/core` and drops a `VENDORED.md` marker. **Never edit `src/core` inside an app** — it is destroyed on the next sync. Fix the bug here, re-sync, commit both repos.

Apps import from the vendored copy: `import { checkAvailability } from '@/core'`.

## Modules

Everything is re-exported from `src/index.ts`.

| Module | What it owns |
|---|---|
| `types.ts` | Every domain type: `Reservation`, `Table`, `Schedule`, `Deposit`, `Guest`, `Restaurant`. |
| `availability.ts` | `checkAvailability()` — the engine. |
| `schedule.ts` | Split shifts, closed days, closed dates, bookable slot generation. |
| `reservations.ts` | Legal status transitions, deposit requirement rules. |
| `guests.ts` | Dedupe by mobile number, auto-derived tags. |
| `deposits.ts` | Deposit status labels and tones. |
| `rbac.ts` | `can(role, action)` and the role-gated nav. |
| `format.ts` | Peso, PH mobile numbers, Asia/Manila dates. |
| `tokens.ts` | Palette as plain objects, for React Native consumers. |
| `mock/seed.ts` | Deterministic seed data. |

## The availability engine

`checkAvailability()` answers one question: *can this restaurant seat a party of N at this date and time?* It resolves against three things at once — the floor plan's table capacities, the schedule's open shift windows, and the reservations already holding tables in that window.

A reservation occupies its tables for `[time, time + turnMinutes(partySize))` — 90 minutes for parties of 4 or fewer, 120 for larger ones. Cancelled and no-show reservations release their tables.

It returns a level, a human-readable reason, and — the useful part — a way forward when the answer is no:

```ts
const result = checkAvailability({ restaurant, schedule, reservations, dateISO, time, partySize });

result.level            // 'available' | 'tight' | 'unavailable'
result.closed           // 'none' | 'day' | 'date' | 'between_shifts' | 'outside_hours'
result.fittingTables    // free tables that seat this party
result.combination      // two+ tables to push together when none fit alone
result.alternativeTimes // up to 4 same-day slots that would work
```

`tight` means exactly one table fits — worth surfacing to a host before they lose it.

## Philippine market assumptions

Baked in deliberately, not incidentally.

**Split shifts are normal.** Lunch 11:00–14:30, kitchen closed, dinner 17:30–22:00. A 15:00 booking returns `closed: 'between_shifts'`, not a generic failure. Mall-based branches run one continuous shift capped by mall hours.

**Deposits run on GCash.** The real-world ritual is: send money to the restaurant's GCash number, screenshot the receipt, send the screenshot. `DepositPolicy` carries the GCash number and account name; `Deposit` carries the reference number and proof image. Status runs `awaiting_proof → pending_review → verified`, plus `forfeited` for the no-show case that justifies the whole mechanism.

**Time is fixed UTC+8.** Asia/Manila has never observed DST. Date math runs on `'YYYY-MM-DD'` and `'HH:mm'` strings directly — no timezone conversion, nothing to drift. `todayISO()` is the only function that reads the clock.

**Phone numbers are E.164 in, local out.** Stored `+639171234567`, displayed `0917 123 4567`. `isValidPhMobile()` checks real carrier prefixes — note DITO's `0813`/`0895` normalise to a leading `8`, so a naive `^9` rule wrongly rejects them.

**Occasions are a first-class field**, because function rooms and set menus attach to them: birthday, debut (18th), anniversary, christening, graduation, despedida, blowout.

The peso sign is a real `₱` (U+20B1) in source.

## Seed data

`seedState()` is deterministic — no `Math.random()` (a small LCG drives all variation), dates computed relative to `todayISO()`. It seeds four states on purpose so the UI has something true to render, and the tests assert all four:

- a slot where every fitting table is taken → `unavailable`
- a slot with exactly one table left → `tight`
- a party of 12 that no single table seats → returns a `combination`
- 15:00 on an open day → `between_shifts`

Guest `visitCount` is a lifetime total (a historical base plus seeded reservations), not a strict recount — otherwise a VIP would need ten seeded bookings.

## Tests

`*.test.ts` files live beside the source and run under **vitest inside `mesa-admin`** (they vendor in with the rest of `src/core`; `mesa-mobile`'s jest ignores that directory).

```bash
cd ../mesa-admin && npm test
```

A green suite is the proof the engine works.

## License

[MIT](LICENSE)
