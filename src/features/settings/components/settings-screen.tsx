"use client";

import { RotateCcw, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/input";
import { useNow } from "@/lib/hooks/use-now";
import { tryAction } from "@/lib/utils/try-action";
import {
  GST_RATES_BASIS_POINTS,
  validateKitchenTiming,
  validateRestaurantDetails,
  type KitchenTimingValues,
} from "@/lib/validation/settings";
import { resetDemoData } from "@/stores/reset-demo";
import { useSettingsStore } from "@/stores/settings-store";
import type { RestaurantDetails } from "@/types/settings";

/**
 * SETTINGS (managers only): one card per topic, each saved on its own, so
 * changing the GST rate never needs the address form to be valid too.
 */
export function SettingsScreen() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Restaurant details, bills, kitchen timers and appearance."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <RestaurantCard />
        <div className="flex flex-col gap-6">
          <TaxCard />
          <KitchenCard />
        </div>
        <AppearanceCard />
        <DemoDataCard />
      </div>
    </>
  );
}

function RestaurantCard() {
  const restaurant = useSettingsStore((s) => s.restaurant);
  const updateRestaurant = useSettingsStore((s) => s.updateRestaurant);
  const [values, setValues] = useState<RestaurantDetails>(restaurant);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const changed = JSON.stringify(values) !== JSON.stringify(restaurant);

  function field(key: keyof RestaurantDetails, label: string, hint?: string) {
    return (
      <Field
        label={label}
        value={values[key]}
        onChange={(e) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          setErrors({});
        }}
        error={errors[key]}
        hint={hint}
        autoComplete="off"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Restaurant details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = validateRestaurantDetails(values);
            if (!result.ok) return setErrors(result.errors);
            if (tryAction(() => updateRestaurant(result.data))) {
              setValues(result.data);
              toast.success("Restaurant details saved", {
                description: "New invoices show them. Old invoices keep theirs.",
              });
            }
          }}
        >
          {field("name", "Name")}
          {field("address", "Address")}
          {field("phone", "Phone")}
          {field("gstin", "GSTIN", "15 characters, printed on every invoice.")}
          <Button type="submit" className="self-start" disabled={!changed}>
            <Save aria-hidden="true" /> Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TaxCard() {
  const taxRate = useSettingsStore((s) => s.taxRateBasisPoints);
  const setTaxRate = useSettingsStore((s) => s.setTaxRate);
  return (
    <Card>
      <CardHeader>
        <CardTitle>GST on bills</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChipGroup
          label="GST rate"
          value={String(taxRate)}
          onChange={(value) => {
            const rate = Number(value);
            if (tryAction(() => setTaxRate(rate))) {
              toast.success(`GST is now ${rate / 100}%`);
            }
          }}
          options={GST_RATES_BASIS_POINTS.map((bp) => ({
            value: String(bp),
            label: `${bp / 100}%`,
          }))}
        />
        <p className="text-sm text-muted-foreground">
          Most restaurants charge 5%. The new rate applies to every bill not paid yet;
          paid invoices keep the rate they were paid with.
        </p>
      </CardContent>
    </Card>
  );
}

function KitchenCard() {
  const timing = useSettingsStore((s) => s.kitchenTiming);
  const setKitchenTiming = useSettingsStore((s) => s.setKitchenTiming);
  const [values, setValues] = useState<KitchenTimingValues>({
    warningAfterMinutes: String(timing.warningAfterMinutes),
    lateAfterMinutes: String(timing.lateAfterMinutes),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kitchen timers</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const result = validateKitchenTiming(values);
            if (!result.ok) return setErrors(result.errors);
            if (tryAction(() => setKitchenTiming(result.data))) {
              toast.success("Kitchen timers saved");
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Amber after (minutes)"
              value={values.warningAfterMinutes}
              inputMode="numeric"
              onChange={(e) => {
                setValues((v) => ({ ...v, warningAfterMinutes: e.target.value }));
                setErrors({});
              }}
              error={errors.warningAfterMinutes}
              hint="Getting late"
            />
            <Field
              label="Red after (minutes)"
              value={values.lateAfterMinutes}
              inputMode="numeric"
              onChange={(e) => {
                setValues((v) => ({ ...v, lateAfterMinutes: e.target.value }));
                setErrors({});
              }}
              error={errors.lateAfterMinutes}
              hint="Late"
            />
          </div>
          <Button type="submit" variant="secondary" className="self-start">
            <Save aria-hidden="true" /> Save timers
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

type ThemeChoice = "light" | "dark" | "system";

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; before that, show none chosen.
  const inBrowser = useNow() !== null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChipGroup<ThemeChoice | "">
          label="Theme"
          value={inBrowser ? ((theme as ThemeChoice | undefined) ?? "system") : ""}
          onChange={(value) => value && setTheme(value)}
          options={[
            { value: "light", label: "Light (linen)" },
            { value: "dark", label: "Dark (charcoal)" },
            { value: "system", label: "Same as device" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Saved on this device only, so each till can have its own.
        </p>
      </CardContent>
    </Card>
  );
}

function DemoDataCard() {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Put tables, orders, payments, the menu and settings back to the sample data.
          Useful before a demo.
        </p>
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <RotateCcw aria-hidden="true" /> Reset demo data
        </Button>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset all demo data?"
        description="Every order, payment and change you made is replaced by the sample data. This can't be undone."
        confirmLabel="Reset everything"
        onConfirm={() => {
          if (tryAction(resetDemoData)) toast.success("Demo data reset");
        }}
      />
    </Card>
  );
}
