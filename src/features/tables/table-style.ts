import type { TableStatus } from "@/types/table";

/**
 * How each status looks. One place, so the floor plan, list, legend and
 * badges always match. Colors come from the theme (Step 5).
 */
export const TABLE_STATUS_STYLE: Record<
  TableStatus,
  { dot: string; border: string; badge: "success" | "danger" | "accent" | "steel" }
> = {
  available: {
    dot: "bg-table-available",
    border: "border-table-available",
    badge: "success",
  },
  occupied: {
    dot: "bg-table-occupied",
    border: "border-table-occupied",
    badge: "danger",
  },
  reserved: {
    dot: "bg-table-reserved",
    border: "border-table-reserved",
    badge: "accent",
  },
  cleaning: { dot: "bg-table-cleaning", border: "border-table-cleaning", badge: "steel" },
};

/** The words on each status button: what the person is DOING, not the new status. */
export const STATUS_ACTION_LABEL: Partial<
  Record<`${TableStatus}>${TableStatus}`, string>
> = {
  "available>occupied": "Seat guests",
  "available>reserved": "Reserve",
  "reserved>occupied": "Guests arrived",
  "reserved>available": "Cancel reservation",
  "occupied>cleaning": "Guests left",
  "occupied>available": "Free the table",
  "cleaning>available": "Cleaning done",
};

export const STATUS_ORDER: TableStatus[] = [
  "available",
  "occupied",
  "reserved",
  "cleaning",
];
