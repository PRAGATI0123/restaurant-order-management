# 10-minute demo

A walkthrough that shows every part of the POS in the order a real service happens.
Each step says what to tap and what to point out.

## Before you start (1 minute)

1. `npm run dev`, open <http://localhost:3000>. It opens the login: the dining-room photo
   on one side, the staff names on the other.
2. Tap **Pragati Gautam (Manager)**; on her PIN page type **1234** (tap or keyboard).
3. The dashboard says **"A fresh day"**: the app starts with no orders, like a restaurant
   before opening. Tap **Load sample service** (also in Settings → Sample data). Six orders
   in progress and six bills paid earlier today appear, timed from now, so the kitchen
   timers look realistic (a 12-minute ticket, a 17-minute one already red).
4. Optional: a tablet-sized window shows the touch layout best.

## 1. The floor (1 minute): Waiter

1. **Log out**, log in as **Vikram Joshi (Waiter)**. Point out: only _Tables_ and _Orders_
   in the menu, and his PIN page listed exactly those pages.
2. **Tables:** round-cornered tables coloured by status, with the bill so far and minutes
   seated. Tap **T4** (occupied): its order, total, Move and status buttons. No Checkout
   (waiters don't take money).
3. Try **Billing** in the address bar: "This page isn't part of your role".

## 2. Take an order (1½ minutes): Waiter

1. Tap a free table (e.g. **T5**) → **Start order at T5**.
2. Add **Paneer Tikka**: choose **Full**, spice **Hot**, add **Extra cheese**; the price
   updates live. Add **Garlic Naan × 3** and a **Sweet Lassi** with a note ("less sugar").
3. **Send to kitchen.** T5 turns Occupied.

## 3. The kitchen (1½ minutes): Kitchen staff

1. Log in as **Farhan Qureshi (Kitchen)**.
2. **Kitchen:** the new ticket under _New_, oldest first in each column. Point out the
   live timers, the amber and red tickets, the note highlighted, and "To cook now"
   adding up naan across tickets.
3. **Start cooking** → **Mark ready.** On Ready it says "Waiting for a waiter to pick up":
   the kitchen can't mark it served.
4. **Sold out → Garlic Naan off.** (Back on afterwards, or the cashier's next order can't
   include it.)

## 4. Serve and pay (2 minutes): Waiter, then Cashier

1. As **Vikram**: open the order (Orders → it) → **Mark served**.
2. Log in as **Arushi Sharma (Cashier)** → **Billing**: the order is under _Ready to pay_.
3. **Checkout:** bill lines, subtotal, GST 5%. **Add discount → 10% → Regular guest.**
4. **Split equally: 2.** Guest 1 pays **Cash**, tap a quick note (e.g. ₹600): "Change to
   give" appears. **Add part.** Guest 2: **UPI** → **Take … and finish**.
5. Point out: the discount locked once the first guest paid; "Payment complete" shows the
   change and that T5 now needs cleaning.
6. **View invoice:** restaurant details, GSTIN, CGST + SGST, how it was paid. **Print**
   gives a clean black-on-white page.

## 5. The numbers (1½ minutes): Manager

1. Log in as **Pragati Gautam**.
2. **Dashboard:** today's sales include the bill you just took; sales by hour; kitchen and
   table status right now.
3. **Reports → Today:** totals, discounts, GST split, payment methods, dish sales.
   **Export CSV** opens in Excel.
4. **Billing → Transactions:** each payment, filter by Cash / Card / UPI.

## 6. Offline (1½ minutes)

1. Tap the **Synced** badge (bottom of the sidebar). Turn on **Pretend we're offline**.
2. Do anything, e.g. Tables → T6 → _Cleaning done_. It works; the badge says
   **Offline · 1 waiting**.
3. **Refresh the page.** Still logged in, the change is still there, still waiting.
4. Turn the network back on: the badge goes **Syncing…** → **Synced**.
5. Optional: set **Server errors: 1 in 2** and watch changes retry until they get through.
6. Optional (needs `npm run build && npm start`): stop the server and reload: the app still
   opens (service worker).

## Questions people ask

- **"What if two cashiers…?"** Every action is checked against the rules at the moment it
  runs; the mock server also rejects clashing order numbers from another till.
- **"Is the money exact?"** Amounts are whole paise; 200 random orders with discounts and
  split payments are tested to add up to the paisa (`npm test`).
- **"Where's the backend?"** Mocked in the browser, with delay, errors and validation, so a
  real API could replace `mocks/api/mock-server.ts` behind the same outbox.
