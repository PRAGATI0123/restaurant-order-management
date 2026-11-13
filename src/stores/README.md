# stores/

Zustand stores for **screen state only**: things that are not saved business records.

| Store              | Holds                                          |
| ------------------ | ---------------------------------------------- |
| `session.store.ts` | Who is logged in and their role                |
| `cart.store.ts`    | The order being built, before it is placed     |
| `ui.store.ts`      | Small UI choices (e.g. sidebar open or closed) |

**Rule:** orders, tables, menu items and payments live in IndexedDB (see `lib/db/`), not
here. A store is for "what is happening on screen right now".
