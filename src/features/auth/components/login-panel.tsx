"use client";

import {
  Banknote,
  ChefHat,
  Lock,
  LogIn,
  Store,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumPad } from "@/components/ui/num-pad";
import {
  NO_ATTEMPTS,
  PIN_LENGTH,
  afterWrongPin,
  secondsLocked,
  type LoginAttempts,
} from "@/domain/auth/login";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { canOpen, homeFor } from "@/domain/auth/routes";
import { DomainError } from "@/domain/errors";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { sampleStaff } from "@/mocks/data/staff";
import { useAuthStore } from "@/stores/auth-store";
import type { Id } from "@/types/common";
import type { Role, Staff } from "@/types/staff";

const ROLE_ICON: Record<Role, LucideIcon> = {
  manager: Store,
  cashier: Banknote,
  waiter: Utensils,
  kitchen: ChefHat,
};

/**
 * Where to go after logging in: back to the page that sent you here (?next=),
 * if it's a page of this app and your role may open it; else your start page.
 * Read from the address bar only when the button is pressed, in the browser.
 */
function destinationFor(member: Staff): string {
  const next = new URLSearchParams(window.location.search).get("next");
  const safe = next !== null && next.startsWith("/") && !next.startsWith("//");
  return safe && canOpen(member.role, next) ? next : homeFor(member.role);
}

/**
 * LOGIN: tap your name, type your 4-digit PIN. It logs in as soon as the 4th
 * digit is typed (no extra button to find). 5 wrong PINs in a row lock the
 * pad for 30 seconds (domain/auth/login.ts).
 */
export function LoginPanel() {
  const router = useRouter();
  const staff = useAuthStore((s) => s.staff);
  const login = useAuthStore((s) => s.login);
  const now = useNow(1000); // for the lock countdown

  const [staffId, setStaffId] = useState<Id>();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState<LoginAttempts>(NO_ATTEMPTS);

  const selected = staff.find((s) => s.id === staffId);
  const lockedFor = now === null ? 0 : secondsLocked(attempts, now);

  function tryLogin(fullPin: string) {
    if (!selected) return;
    try {
      const member = login(selected.id, fullPin);
      setAttempts(NO_ATTEMPTS);
      toast.success(`Welcome, ${member.name}`, {
        description: `Logged in as ${ROLE_LABEL[member.role]}`,
      });
      router.replace(destinationFor(member));
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      // The 1-second clock is exact enough for a 30-second lock (and keeps render pure).
      const next = afterWrongPin(attempts, now ?? 0);
      setAttempts(next);
      setPin("");
      setError(
        next.lockedUntil !== undefined
          ? "Too many wrong PINs. Wait 30 seconds, then try again."
          : e.message,
      );
    }
  }

  function changePin(value: string) {
    if (lockedFor > 0) return;
    setError(undefined);
    setPin(value);
    if (value.length === PIN_LENGTH) tryLogin(value);
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
          {staff.map((member) => {
            const Icon = ROLE_ICON[member.role];
            const isSelected = member.id === staffId;
            return (
              <button
                key={member.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setStaffId(member.id);
                  setPin("");
                  setError(undefined);
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
                  <span className="block font-semibold">{member.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {ROLE_LABEL[member.role]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="rounded-xl bg-surface-muted px-3 py-2 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Demo PINs: </span>
          {sampleStaff.map((s) => `${s.name.split(" ")[0]} ${s.pin}`).join(" · ")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="flex h-16 items-center justify-center gap-4 rounded-xl border border-border bg-background"
          aria-label={`${pin.length} of ${PIN_LENGTH} PIN digits entered`}
          role="img"
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

        <p
          role="alert"
          className={cn(
            "min-h-6 text-center text-sm font-semibold",
            error ? "text-danger" : "text-muted-foreground",
          )}
        >
          {lockedFor > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-danger">
              <Lock className="size-4" aria-hidden="true" /> Locked. Try again in{" "}
              {lockedFor} s.
            </span>
          ) : (
            (error ??
            (selected ? `Hello ${selected.name.split(" ")[0]}, enter your PIN.` : ""))
          )}
        </p>

        <NumPad
          label="PIN"
          value={pin}
          onChange={changePin}
          maxLength={PIN_LENGTH}
          className={cn((!selected || lockedFor > 0) && "pointer-events-none opacity-50")}
        />
        <Button
          size="lg"
          fullWidth
          disabled={!selected || pin.length !== PIN_LENGTH || lockedFor > 0}
          onClick={() => tryLogin(pin)}
        >
          <LogIn aria-hidden="true" />
          {selected ? `Log in as ${selected.name}` : "Choose your name first"}
        </Button>
      </div>
    </Card>
  );
}
