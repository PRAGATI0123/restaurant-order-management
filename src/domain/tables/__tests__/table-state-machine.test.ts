import { describe, expect, it } from "vitest";
import { makeTable } from "@/domain/__tests__/test-data";
import {
  canChangeTableStatus,
  changeTableStatus,
  nextTableStatuses,
} from "@/domain/tables/table-state-machine";
import type { TableStatus } from "@/types/table";

const ALL: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];

describe("table state machine: which moves are allowed", () => {
  const allowed = new Set([
    "available→occupied",
    "available→reserved",
    "reserved→occupied",
    "reserved→available",
    "occupied→cleaning",
    "occupied→available",
    "cleaning→available",
  ]);

  for (const from of ALL) {
    for (const to of ALL) {
      const expected = allowed.has(`${from}→${to}`);
      it(`${from} → ${to}: ${expected ? "allowed" : "blocked"}`, () => {
        expect(canChangeTableStatus(from, to)).toBe(expected);
      });
    }
  }

  it("a table being cleaned can only become available", () => {
    expect(nextTableStatuses("cleaning")).toEqual(["available"]);
  });
});

describe("changeTableStatus", () => {
  it("returns a new table with the new status", () => {
    const table = makeTable({ name: "T4", status: "cleaning" });
    const ready = changeTableStatus(table, "available");

    expect(ready.status).toBe("available");
    expect(table.status).toBe("cleaning"); // original untouched
  });

  it("explains a blocked move", () => {
    const dirty = makeTable({ name: "T4", status: "cleaning" });
    expect(() => changeTableStatus(dirty, "occupied")).toThrow(
      "T4 is Cleaning; it can't become Occupied.",
    );
  });

  it("won't change a table that is merged into another", () => {
    const joined = makeTable({ name: "T5", status: "occupied", mergedIntoId: "t4" });
    expect(() => changeTableStatus(joined, "cleaning")).toThrow(/Unmerge it first/);
  });
});
