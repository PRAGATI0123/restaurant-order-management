# providers/

React "providers": components that wrap the whole app once (in `app/layout.tsx`) and give
every page access to something shared.

- `theme-provider.tsx`: light / dark mode (`next-themes`)

That's the only one. Shared data lives in Zustand stores (`stores/`), which need no provider,
and loading saved data is done by `lib/persistence` before a page is shown.
