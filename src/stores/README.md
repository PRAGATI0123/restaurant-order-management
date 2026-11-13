# stores/

Zustand stores: shared data that every page can read and change.

| Store           | Holds                                     | Saved where (now → Step 19) |
| --------------- | ----------------------------------------- | --------------------------- |
| `menu-store.ts` | Categories and menu items                 | memory → IndexedDB          |
| (next steps)    | Tables, orders, payments, logged-in staff | memory → IndexedDB          |

**For now** the data lives in memory and starts from the sample data in `mocks/data/`,
so a page refresh resets it. **Step 19** saves it in IndexedDB so it survives refreshes
and browser restarts. Pages only use the store's actions (`addItem`, `setAvailability`…),
so they won't change when that happens.

**Rules:**

- Business rules stay in `domain/`. A store action calls them; it doesn't re-invent them.
- Never edit state in place. Always return new arrays and objects, so React notices.
- In a component, select only what you need: `useMenuStore((s) => s.items)`.
