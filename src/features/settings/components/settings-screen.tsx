"use client";

import { RotateCcw, Save, Sparkles } from "lucide-react";
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
import { loadSampleService, resetDemoData } from "@/stores/reset-demo";
import { useServiceStore } from "@/stores/service-store";
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

/**
 * The app opens on a fresh day (no orders). For a demo, a manager can fill
 * today with a sample service, and later clear everything again.
 */
function DemoDataCard() {
  const hasOrders = useServiceStore((s) => s.orders.length > 0);
  const [confirming, setConfirming] = useState<"load" | "reset" | null>(null);

  const load = () => {
    if (tryAction(loadSampleService)) {
      toast.success("Sample service loaded", {
        description: "Tables, kitchen tickets and today's bills are filled in.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample data</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Sample service.</span> Fill
            today with a busy evening: orders at tables and in the kitchen, and bills paid
            earlier, all timed from now. Handy for showing the app to someone.
          </p>
          <Button
            variant="secondary"
            onClick={() => (hasOrders ? setConfirming("load") : load())}
          >
            <Sparkles aria-hidden="true" /> Load sample service
          </Button>
        </div>
        <div className="flex flex-col items-start gap-3 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Fresh start.</span> Clear
            every order, bill and payment, free all tables, and put the menu and settings
            back to how they came.
          </p>
          <Button variant="danger" onClick={() => setConfirming("reset")}>
            <RotateCcw aria-hidden="true" /> Start fresh
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirming === "load"}
        onClose={() => setConfirming(null)}
        title="Replace today's orders?"
        description="Today's tables, orders, payments and bills are replaced by the sample service, and two dishes are marked sold out. The rest of the menu and the settings stay as they are. This can't be undone."
        confirmLabel="Load sample service"
        onConfirm={load}
      />
      <ConfirmDialog
        open={confirming === "reset"}
        onClose={() => setConfirming(null)}
        title="Start fresh?"
        description="Every order, bill, payment and change you made is removed, and the menu and settings go back to how they came. This can't be undone."
        confirmLabel="Clear everything"
        onConfirm={() => {
          if (tryAction(resetDemoData)) toast.success("Fresh start: no orders yet");
        }}
      />
    </Card>
  );
}
