import { describe, expect, it } from "vitest";
import { validateTable } from "@/lib/validation/table";
import { sampleTables } from "@/mocks/data/tables";

describe("validateTable", () => {
  it("accepts a good table and turns seats into a number", () => {
    expect(
      validateTable({ name: " Patio 1 ", seats: "6", shape: "round" }, sampleTables),
    ).toEqual({
      ok: true,
      data: { name: "Patio 1", seats: 6, shape: "round" },
    });
  });

  it.each([
    [{ name: "" }, "name", "Table name is required."],
    [{ seats: "" }, "seats", "Enter a whole number of seats."],
    [{ seats: "2.5" }, "seats", "Enter a whole number of seats."],
    [{ seats: "0" }, "seats", "Seats must be from 1 to 12."],
    [{ seats: "13" }, "seats", "Seats must be from 1 to 12."],
  ])("rejects %j", (change, field, message) => {
    const result = validateTable(
      { name: "T20", seats: "4", shape: "square", ...change },
      [],
    );
    expect(result).toMatchObject({ ok: false, errors: { [field]: message } });
  });

  it("refuses a name that's taken, but lets a table keep its own", () => {
    expect(
      validateTable({ name: "t4", seats: "4", shape: "square" }, sampleTables),
    ).toMatchObject({
      errors: { name: "There's already a table called T4." },
    });
    expect(
      validateTable({ name: "T4", seats: "4", shape: "square" }, sampleTables, "t4").ok,
    ).toBe(true);
  });
});
