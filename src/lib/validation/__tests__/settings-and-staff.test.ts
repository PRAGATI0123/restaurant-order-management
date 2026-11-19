import { describe, expect, it } from "vitest";
import {
  validateKitchenTiming,
  validateRestaurantDetails,
} from "@/lib/validation/settings";
import { validateStaff } from "@/lib/validation/staff";

const details = {
  name: "The Teal Chair",
  address: "12 Park Street, Kolkata 700016",
  phone: "+91 33 4000 1234",
  gstin: "19abcde1234f1z5",
};

describe("restaurant details", () => {
  it("accepts good details and upper-cases the GSTIN", () => {
    const result = validateRestaurantDetails(details);
    expect(result.ok && result.data.gstin).toBe("19ABCDE1234F1Z5");
  });

  it("explains each problem", () => {
    const result = validateRestaurantDetails({
      name: "T",
      address: "x",
      phone: "call me",
      gstin: "12345",
    });
    expect(result.ok ? {} : result.errors).toEqual({
      name: "Restaurant must be at least 2 characters.",
      address: "Enter the full address.",
      phone: "Enter a phone number, like +91 33 4000 1234.",
      gstin: "A GSTIN has 15 characters, like 19ABCDE1234F1Z5.",
    });
  });
});

describe("kitchen timing", () => {
  it("accepts whole minutes with 'late' after 'getting late'", () => {
    expect(
      validateKitchenTiming({ warningAfterMinutes: "8", lateAfterMinutes: "12" }),
    ).toEqual({
      ok: true,
      data: { warningAfterMinutes: 8, lateAfterMinutes: 12 },
    });
  });

  it("refuses 'late' before 'getting late', and odd values", () => {
    const backwards = validateKitchenTiming({
      warningAfterMinutes: "15",
      lateAfterMinutes: "10",
    });
    expect(backwards.ok ? {} : backwards.errors).toEqual({
      lateAfterMinutes: "'Late' must come after 'Getting late'.",
    });
    const odd = validateKitchenTiming({
      warningAfterMinutes: "2.5",
      lateAfterMinutes: "0",
    });
    expect(odd.ok).toBe(false);
  });
});

describe("staff form", () => {
  const existing = [{ id: "m", name: "Meera Kapoor" }];

  it("needs a name, a role and a 4-digit PIN", () => {
    const result = validateStaff({ name: "", role: "", pin: "12" }, existing);
    expect(result.ok ? {} : result.errors).toEqual({
      name: "Name must be at least 2 characters.",
      role: "Choose a role.",
      pin: "The PIN must be exactly 4 digits.",
    });
  });

  it("refuses a name that's already on the list (login picks by name)", () => {
    const result = validateStaff(
      { name: "meera  kapoor", role: "waiter", pin: "5678" },
      existing,
    );
    expect(result.ok ? {} : result.errors).toEqual({
      name: "Meera Kapoor is already on the staff list.",
    });
    expect(
      validateStaff({ name: "Meera Kapoor", role: "manager", pin: "5678" }, existing, "m")
        .ok,
    ).toBe(true);
  });
});
