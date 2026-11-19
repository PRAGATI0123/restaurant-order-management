# domain/ ⭐ the business rules

Plain TypeScript functions that hold the restaurant's rules. **No React, no database, no
browser APIs.** Given the same input they always return the same output, which makes them
easy to test and easy to explain. When a rule says no, the function throws a
`DomainError` (`errors.ts`) with a message a person can read.

```
domain/
├── money.ts     amounts in paise (whole numbers), basis points, rounding, splitting
├── errors.ts    DomainError: "this isn't allowed, and here's why"
├── orders/      order state machine, cart, item choices, add/cancel/split, filters
├── billing/     bill maths (subtotal → discount → GST → total), payments and change,
│                split bills, checkout, invoices, transaction history
├── tables/      table state machine, move/join/separate, floor layout, guards
├── kitchen/     board columns, timers and when an order counts as late
├── menu/        menu and catalogue rules (sizes, add-ons, option groups, sold out)
├── auth/        PIN check and lockout, which role may do what, which pages each role opens
├── reports/     date ranges, sales totals, CSV export
└── sync/        the outbox: queueing changes, merging repeats, retry timing
```

Tests live next to the code in `__tests__/` folders.

**Rule:** if you can describe it to a restaurant manager without saying "React" or
"IndexedDB", it belongs here. `domain/` never imports from `lib/`, `stores/` or `features/`.
