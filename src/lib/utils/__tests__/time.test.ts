import { describe, expect, it } from "vitest";
import { timeSince } from "@/lib/utils/time";

const at = "2026-11-14T12:00:00.000Z";
const later = (minutes: number) => Date.parse(at) + minutes * 60_000;

describe("timeSince", () => {
  it.each([
    [0, "just now"],
    [0.9, "just now"],
    [12, "12 min"],
    [59, "59 min"],
    [60, "1 h"],
    [65, "1 h 5 min"],
    [-3, "just now"], // device clock behind
  ])("%s minutes later → %s", (minutes, label) => {
    expect(timeSince(at, later(minutes))).toBe(label);
  });

  it("shows nothing until the clock is known (avoids hydration mismatch)", () => {
    expect(timeSince(at, null)).toBe("");
  });
});
