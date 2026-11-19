# components/

Shared React components that **any** feature can use. They know nothing about orders, tables or menus.

| Folder / file        | What goes here                                            | Example                                              |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `ui/`                | Small building blocks (the design system)                 | `button.tsx`, `dialog.tsx`, `num-pad.tsx`            |
| `layout/`            | The app frame around every page                           | `app-shell.tsx`, `nav-links.tsx`, `theme-toggle.tsx` |
| `brand/`             | The logo, drawn in code (also used for the browser icons) | `logo-mark.tsx`                                      |
| `service-worker.tsx` | Registers `public/sw.js` in the production build          |                                                      |

Charts are not here: the only charts are on the Reports and Dashboard pages, so they live
in `features/reports/components/charts.tsx`.

**Rule:** if a component mentions a business word (order, table, bill), it belongs in `features/`, not here.
