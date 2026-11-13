"use client";

import { Banknote, ChefHat, LogIn, Store, Utensils, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumPad } from "@/components/ui/num-pad";
import { cn } from "@/lib/utils/cn";

type DemoStaff = { id: string; name: string; role: string; icon: LucideIcon };

// Sample staff, one per role. In Step 10 they come from the database and the
// PIN is checked; for now any 4-digit PIN opens the dashboard.
const demoStaff: DemoStaff[] = [
  { id: "cashier", name: "1st user", role: "Cashier", icon: Banknote },
  { id: "waiter", name: "2nd user", role: "Waiter", icon: Utensils },
  { id: "kitchen", name: "3rd user", role: "Kitchen", icon: ChefHat },
  { id: "manager", name: "4th user", role: "Manager", icon: Store },
];

const PIN_LENGTH = 4;

export function LoginPanel() {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string>();
  const [pin, setPin] = useState("");
  const selected = demoStaff.find((s) => s.id === staffId);
  const canLogIn = selected !== undefined && pin.length === PIN_LENGTH;

  function logIn() {
    if (!selected) return;
    toast.success(`Welcome, ${selected.name}`, {
      description: `Logged in as ${selected.role}`,
    });
    router.push("/dashboard");
  }

  return (
    <Card className="grid w-full max-w-4xl gap-8 p-6 sm:p-8 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Who&apos;s working?</h1>
          <p className="text-muted-foreground">Tap your name, then enter your PIN.</p>
        </div>
        <div
          role="radiogroup"
          aria-label="Staff member"
          className="grid grid-cols-2 gap-3"
        >
          {demoStaff.map(({ id, name, role, icon: Icon }) => {
            const isSelected = id === staffId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setStaffId(id);
                  setPin("");
                }}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-muted text-primary",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="block text-sm text-muted-foreground">{role}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          Demo: any 4-digit PIN works for now.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="flex h-16 items-center justify-center gap-4 rounded-xl border border-border bg-background"
          aria-live="polite"
          aria-label={`${pin.length} of ${PIN_LENGTH} PIN digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={cn(
                "size-4 rounded-full",
                i < pin.length ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
        <NumPad label="PIN" value={pin} onChange={setPin} maxLength={PIN_LENGTH} />
        <Button size="lg" fullWidth disabled={!canLogIn} onClick={logIn}>
          <LogIn aria-hidden="true" />
          {selected ? `Log in as ${selected.name}` : "Choose your name first"}
        </Button>
      </div>
    </Card>
  );
}
