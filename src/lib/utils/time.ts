import type { IsoDateTime } from "@/types/common";

/**
 * How long ago something happened, short enough for a table tile:
 * "just now", "12 min", "1 h 5 min". Returns "" until the clock is known.
 */
export function timeSince(since: IsoDateTime, now: number | null): string {
  if (now === null) return "";
  const minutes = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
