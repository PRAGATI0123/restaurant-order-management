"use client";

// This file lives next to page.tsx. Only files named page.tsx become routes,
// so keeping helper files beside the page they belong to is safe.

import { Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BottomSheet, Dialog, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/input";
import { NumPad } from "@/components/ui/num-pad";
import { Skeleton } from "@/components/ui/skeleton";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function UiPreview() {
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [itemName, setItemName] = useState("");
  const [nameError, setNameError] = useState<string>();

  function fakeSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Order placed", { description: "Table 4 · sent to kitchen" });
    }, 1200);
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-12 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">UI Preview</h1>
          <p className="text-muted-foreground">Every building block, in our theme.</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="danger">
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small 44px</Button>
          <Button size="md">Medium 48px</Button>
          <Button size="lg">Large 56px</Button>
          <Button size="icon" variant="secondary" aria-label="Add item">
            <Plus aria-hidden="true" />
          </Button>
          <Button loading={saving} onClick={fakeSave}>
            {saving ? "Placing order…" : "Place order (shows toast)"}
          </Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge variant="primary">Preparing</Badge>
          <Badge variant="accent">Reserved</Badge>
          <Badge variant="success">Available</Badge>
          <Badge variant="danger">Occupied</Badge>
          <Badge variant="steel">Cleaning</Badge>
          <Badge variant="outline">Takeaway</Badge>
        </div>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Table 4</CardTitle>
            <CardDescription>4 guests · seated 25 min ago</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Badge variant="danger">Occupied</Badge>
            <span className="text-lg font-semibold tabular-nums">₹1,240.00</span>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" size="sm">
              View order
            </Button>
            <Button size="sm">Checkout</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Form field">
        <form
          className="max-w-sm space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setNameError(itemName.trim() ? undefined : "Item name is required");
            if (itemName.trim()) toast.success(`Saved "${itemName.trim()}"`);
          }}
        >
          <Field
            label="Item name"
            hint="As it should appear on the bill"
            placeholder="e.g. Paneer Tikka"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            error={nameError}
          />
          <Button type="submit">Save (try it empty)</Button>
        </form>
      </Section>

      <Section title="Dialog and bottom sheet">
        <div className="flex flex-wrap gap-3">
          <Button variant="danger" onClick={() => setDialogOpen(true)}>
            Cancel order…
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Item options…
          </Button>
        </div>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Cancel this order?"
          description="Order #12 for Table 4 will be cancelled. The kitchen will be told."
        >
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialogOpen(false);
                toast.error("Order #12 cancelled");
              }}
            >
              Cancel order
            </Button>
          </DialogFooter>
        </Dialog>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Paneer Tikka"
          description="Choose size and spice level"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Half · ₹180</Badge>
            <Badge variant="primary">Full · ₹320</Badge>
            <Badge variant="outline">Mild</Badge>
            <Badge variant="accent">Medium</Badge>
            <Badge variant="outline">Hot</Badge>
          </div>
          <Button fullWidth size="lg" onClick={() => setSheetOpen(false)}>
            Add to order · ₹320
          </Button>
        </BottomSheet>
      </Section>

      <Section title="Num pad">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Cash received (allows 2 decimals)</p>
            <p className="rounded-xl border border-border bg-surface p-4 text-right text-3xl font-semibold tabular-nums">
              ₹{amount || "0"}
            </p>
            <NumPad
              label="Cash received"
              value={amount}
              onChange={setAmount}
              allowDecimal
            />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">PIN (4 digits, hidden)</p>
            <p
              className="flex h-[70px] items-center justify-center gap-3 rounded-xl border border-border bg-surface"
              aria-label={`${pin.length} of 4 digits entered`}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`size-4 rounded-full ${i < pin.length ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </p>
            <NumPad label="PIN" value={pin} onChange={setPin} maxLength={4} />
          </div>
        </div>
      </Section>

      <Section title="Loading skeleton">
        <Card className="max-w-sm space-y-3 p-5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={ReceiptText}
          title="No orders yet"
          description="Orders you take will show up here, newest first."
          action={
            <Button>
              <Plus aria-hidden="true" /> New order
            </Button>
          }
        />
      </Section>
    </main>
  );
}
