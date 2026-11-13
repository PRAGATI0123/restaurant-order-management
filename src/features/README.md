# features/

One folder per area of the restaurant. Each folder holds the screens' pieces and hooks for that area.

```
features/
├── auth/        login, PIN pad, role guard
├── dashboard/   KPI cards, status summary
├── tables/      floor plan, transfer and merge dialogs
├── menu/        menu grid, item form, modifier editor
├── orders/      order composer, cart, status badge
├── kitchen/     kitchen tickets, timers
├── billing/     bill summary, payments, invoice
└── reports/     date filters, report tables
```

Inside each feature: `components/` for React components and `hooks/` for data hooks
(e.g. `use-orders.ts`).

**Rule:** pages in `src/app/` stay thin. They import from `features/` and arrange things on
the screen. The real UI lives here.
