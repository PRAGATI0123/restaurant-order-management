# mocks/

Stand-ins for the parts a real restaurant would have on a server.

| Folder  | What goes here                                                                                |
| ------- | --------------------------------------------------------------------------------------------- |
| `data/` | Sample data: the menu (with dish photos and their credits), tables, staff, and today's orders |
| `api/`  | The mock server: network delay, random failures, and its own checks (`server-rules.ts`)       |

The sample data fills the stores on the first visit; after that the app reads and writes
its own saved data (IndexedDB) only. **Settings → Reset demo data** brings the samples back.

Staff and the shared demo PIN (1234) are in `data/staff.ts`.
