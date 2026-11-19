# lib/

Technical plumbing: how data is saved, synced and checked.

| Folder         | What goes here                                                                            |
| -------------- | ----------------------------------------------------------------------------------------- |
| `persistence/` | IndexedDB storage for the Zustand stores, and loading saved data at start-up              |
| `sync/`        | The sync engine: watches the stores, sends the outbox to the (mock) server, retries       |
| `validation/`  | Zod schemas for forms (menu item, table, order, settings, …)                              |
| `hooks/`       | Small React hooks, e.g. `use-now` (a clock that ticks only in the browser)                |
| `utils/`       | Helpers: `cn()` for class names, ids, time formatting, `tryAction` (rule errors → toasts) |

**Rule:** `lib/` may use `domain/`, but `domain/` never imports from `lib/`.
