import { describe, expect, it } from "vitest";
import {
  elapsedSeconds,
  formatElapsed,
  isInKitchen,
  ticketUrgency,
} from "@/domain/kitchen/delay-rules";

const placedAt = "2026-11-13T12:00:00.000Z";
const after = (seconds: number) => new Date(Date.parse(placedAt) + seconds * 1000);

describe("elapsedSeconds", () => {
  it("counts whole seconds since the order was placed", () => {
    expect(elapsedSeconds(placedAt, after(0))).toBe(0);
    expect(elapsedSeconds(placedAt, after(125.9))).toBe(125);
  });

  it("never goes negative when a device clock is behind", () => {
    expect(elapsedSeconds(placedAt, after(-30))).toBe(0);
  });

  it("rejects a broken date", () => {
    expect(() => elapsedSeconds("yesterday-ish", after(0))).toThrow(/not a valid date/);
  });
});

describe("ticketUrgency (warning at 10 min, late at 15 min)", () => {
  it.each([
    [0, "on-time"],
    [9 * 60 + 59, "on-time"],
    [10 * 60, "warning"], // exactly 10:00 is already a warning
    [14 * 60 + 59, "warning"],
    [15 * 60, "late"],
    [60 * 60, "late"],
  ] as const)("%i seconds → %s", (seconds, expected) => {
    expect(ticketUrgency(seconds)).toBe(expected);
  });

  it("uses custom times from Settings", () => {
    const timing = { warningAfterMinutes: 5, lateAfterMinutes: 8 };
    expect(ticketUrgency(6 * 60, timing)).toBe("warning");
    expect(ticketUrgency(8 * 60, timing)).toBe("late");
  });

  it("refuses a warning time that isn't before the late time", () => {
    expect(() =>
      ticketUrgency(0, { warningAfterMinutes: 15, lateAfterMinutes: 15 }),
    ).toThrow();
  });
});

describe("formatElapsed", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [65, "1:05"],
    [15 * 60, "15:00"],
    [3725, "1:02:05"],
  ])("%i seconds → %s", (seconds, expected) => {
    expect(formatElapsed(seconds)).toBe(expected);
  });
});

describe("isInKitchen", () => {
  it("only new and preparing orders are the kitchen's job", () => {
    expect(isInKitchen("new")).toBe(true);
    expect(isInKitchen("preparing")).toBe(true);
    expect(isInKitchen("ready")).toBe(false);
    expect(isInKitchen("paid")).toBe(false);
  });
});
