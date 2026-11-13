# providers/

React "providers": components that wrap the whole app once (in `app/layout.tsx`) and give
every page access to something shared.

- `theme-provider.tsx`: light / dark mode
- `query-provider.tsx`: TanStack Query (added in Step 9)
- `db-provider.tsx`: opens IndexedDB and loads sample data on first run (Step 9)
