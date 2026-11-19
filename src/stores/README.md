# stores/

Zustand stores: shared data that every page can read and change.

| Store               | Holds                                         | Saved where                 |
| ------------------- | --------------------------------------------- | --------------------------- |
| `service-store.ts`  | Tables, orders, payments, invoices            | IndexedDB (`pos-service`)   |
| `menu-store.ts`     | Categories, dishes, add-ons, option groups    | IndexedDB (`pos-menu`)      |
| `settings-store.ts` | Restaurant details, GST rate, kitchen timers  | IndexedDB (`pos-settings`)  |
| `cart-store.ts`     | The order being built on the New order screen | IndexedDB (`pos-cart`)      |
| `sync-store.ts`     | The outbox (changes waiting for the server)   | IndexedDB (`pos-sync`)      |
| `auth-store.ts`     | The users and who is logged in                | sessionStorage (login only) |

**Offline-first:** every store saves itself on the device (IndexedDB, via
`lib/persistence`), so data survives refreshes and browser restarts and the till
works without internet. `AuthGate` waits until the saved data is loaded before
showing a page. The sync engine (`lib/sync`) watches the stores and sends every
change to the (mock) server through the outbox, retrying when the network is bad.

The first visit starts on a fresh day: the sample menu, floor plan and staff from
`mocks/data/`, and no orders or bills. `reset-demo.ts` holds the two Settings buttons:
**Load sample service** (a busy evening, timed from now) and **Start fresh** (back to the
first visit).

**Rules:**

- Business rules stay in `domain/`. A store action calls them; it doesn't re-invent them.
- Every action checks the logged-in role first (`requirePermission`).
- Never edit state in place. Always return new arrays and objects, so React notices
  (and so the sync engine can tell which records changed).
- In a component, select only what you need: `useMenuStore((s) => s.items)`.
