# mocks/

Stand-ins for the parts a real restaurant would have on a server.

| Folder  | What goes here                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------- |
| `data/` | Sample data: the menu (with dish photos and their credits), tables, staff, and the sample service |
| `api/`  | The mock server: network delay, random failures, and its own checks (`server-rules.ts`)           |

A first visit gets the menu, floor plan and staff, and **no orders**: a fresh day. The
sample service (`data/orders.ts`: orders in progress and bills paid earlier today) is only
loaded when a manager taps **Load sample service**, and it's built from the current time
each time, so its tickets and bills are never days old. After that the app reads and
writes its own saved data (IndexedDB) only.

Staff and the shared demo PIN (1234) are in `data/staff.ts`.
