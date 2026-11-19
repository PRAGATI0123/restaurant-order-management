# config/

Fixed settings the app reads at start-up.

- `nav.ts`: the sidebar links, in order. Which role may open each page is decided in
  `domain/auth/routes.ts`, so the menu and the page guard can never disagree.
- `constants.ts`: the default GST rate (in basis points) and the default restaurant details.

**Rule:** values a manager can change at runtime live in Settings (`stores/settings-store.ts`,
saved in IndexedDB). This folder holds the defaults.
