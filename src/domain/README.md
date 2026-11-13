# domain/ ⭐ the business rules

Plain TypeScript functions that hold the restaurant's rules. **No React, no database, no
browser APIs.** Given the same input they always return the same output, which makes them
easy to test and easy to explain.

```
domain/
├── money.ts     amounts in paise (whole numbers), rounding
├── billing/     subtotal → discount → tax → total, split bills
├── orders/      order state machine, split order
├── tables/      table state machine, transfer order, merge tables
├── kitchen/     when an order counts as late
└── auth/        which role may do what
```

Tests live next to the code in `__tests__/` folders.

**Rule:** if you can describe it to a restaurant manager without saying "React" or
"IndexedDB", it belongs here.
