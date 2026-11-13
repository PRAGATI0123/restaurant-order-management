# components/

Shared React components that **any** feature can use. They know nothing about orders, tables or menus.

| Folder    | What goes here                            | Example                       |
| --------- | ----------------------------------------- | ----------------------------- |
| `ui/`     | Small building blocks (the design system) | `button.tsx`, `dialog.tsx`    |
| `layout/` | The app frame around every page           | `sidebar.tsx`, `theme-toggle` |
| `charts/` | Chart wrappers with our colors            | `sales-line-chart.tsx`        |

**Rule:** if a component mentions a business word (order, table, bill), it belongs in `features/`, not here.
