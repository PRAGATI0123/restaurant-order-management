# features/

One folder per area of the restaurant. Each folder holds the screens and their pieces for that area.

```
features/
├── auth/        login (user picker, PIN entry, photo side), role guard, current user
├── dashboard/   today's live summary
├── tables/      floor plan, table sheet, floor plan editor
├── menu/        menu, categories, add-ons and option groups, dish photos
├── orders/      new order (menu browser, cart), order details, split order
├── kitchen/     kitchen board, tickets, sold-out shortcut
├── billing/     bill, checkout and payments, discounts, invoice, transactions
├── reports/     reports screen and the hand-built charts
├── settings/    restaurant details, GST, kitchen timers, reset demo data
└── sync/        the sync badge in the header
```

Inside each feature: `components/` for React components. Small helpers that only that area
uses sit next to it (for example `orders/order-display.ts`, `auth/hooks.ts`).

**Rule:** pages in `src/app/` stay thin. They import a screen from `features/` and place it
on the page. The real UI lives here, and it changes data only through store actions.
