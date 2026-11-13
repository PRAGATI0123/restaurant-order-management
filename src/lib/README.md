# lib/

Technical plumbing: how data is stored, fetched and checked.

| Folder        | What goes here                                                      |
| ------------- | ------------------------------------------------------------------- |
| `db/`         | IndexedDB setup (Dexie), sample data loader, repositories           |
| `api/`        | Mock API: fake network delay, fake errors, one file per resource    |
| `query/`      | TanStack Query client and query keys                                |
| `validation/` | Zod schemas, shared by forms and the mock API                       |
| `utils/`      | Small helpers: `cn()` for class names, date and currency formatting |

**Rule:** `lib/` may use `domain/`, but `domain/` never imports from `lib/`.
