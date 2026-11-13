# config/

Fixed settings the app reads at start-up.

- `nav.ts`: the sidebar links and which roles can see each one
- `constants.ts`: default tax rate, when a kitchen order counts as late, etc.

**Rule:** values a manager can change at runtime live in Settings (saved in IndexedDB).
This folder holds the defaults.
