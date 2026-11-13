import type { IsoDateTime } from "@/types/common";
import type { OrderStatus } from "@/types/order";
import { DomainError } from "../errors";

/**
 * KITCHEN TIMING
 *
 *  - Every ticket's clock starts when the order is placed.
 *  - 0–9 min 59 s  → on time
 *  - 10–14 min 59 s → warning (amber): it's getting late
 *  - 15 min or more → late (red): someone should check on it
 *  - Only tickets still in the kitchen ("new" or "preparing") can be late.
 *
 * The minutes are defaults; Settings (Step 18) can change them.
 */
export type KitchenTiming = {
  warningAfterMinutes: number;
  lateAfterMinutes: number;
};

export const DEFAULT_KITCHEN_TIMING: KitchenTiming = {
  warningAfterMinutes: 10,
  lateAfterMinutes: 15,
};

export type TicketUrgency = "on-time" | "warning" | "late";

/** True while the kitchen still has work to do on this order. */
export function isInKitchen(status: OrderStatus): boolean {
  return status === "new" || status === "preparing";
}

/**
 * Whole seconds from `since` until `now`.
 * Never negative: if a tablet's clock is a little behind, we show 0:00, not -0:12.
 */
export function elapsedSeconds(since: IsoDateTime, now: Date): number {
  const start = Date.parse(since);
  if (Number.isNaN(start)) {
    throw new DomainError(`"${since}" is not a valid date and time.`);
  }
  return Math.max(0, Math.floor((now.getTime() - start) / 1000));
}

/** How worried the kitchen should be about a ticket that has waited this long. */
export function ticketUrgency(
  seconds: number,
  timing: KitchenTiming = DEFAULT_KITCHEN_TIMING,
): TicketUrgency {
  if (timing.warningAfterMinutes >= timing.lateAfterMinutes) {
    throw new DomainError("The warning time must be shorter than the late time.");
  }
  if (seconds >= timing.lateAfterMinutes * 60) return "late";
  if (seconds >= timing.warningAfterMinutes * 60) return "warning";
  return "on-time";
}

/** 65 → "1:05",  3725 → "1:02:05". The timer shown on each ticket. */
export function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const twoDigits = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${twoDigits(minutes)}:${twoDigits(secs)}`
    : `${minutes}:${twoDigits(secs)}`;
}
