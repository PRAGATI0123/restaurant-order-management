"use client";

import { Lock, LogIn } from "lucide-react";
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
import { OWNER_ACCOUNT } from "@/mocks/data/staff";
import { useAuthStore } from "@/stores/auth-store";
import type { Staff } from "@/types/staff";

/** "Pragati Gautam" → "PG" */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Where to go after logging in: back to the page that sent you here (?next=),
 * if it's a page of this app; else the start page. Read from the address bar
 * only when logging in, in the browser.
 */
function destinationFor(member: Staff): string {
  const next = new URLSearchParams(window.location.search).get("next");
  const safe = next !== null && next.startsWith("/") && !next.startsWith("//");
  return safe && canOpen(member.role, next) ? next : homeFor(member.role);
}

/**
 * LOGIN: one account, one PIN. It logs in as soon as the 4th digit is typed
 * (no extra button to find). 5 wrong PINs in a row lock the pad for 30
 * seconds (domain/auth/login.ts).
 */
export function LoginPanel() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const now = useNow(1000); // for the lock countdown

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [attempts, setAttempts] = useState<LoginAttempts>(NO_ATTEMPTS);
  const lockedFor = now === null ? 0 : secondsLocked(attempts, now);

  function tryLogin(fullPin: string) {
    try {
      const member = login(fullPin);
      setAttempts(NO_ATTEMPTS);
      toast.success(`Welcome, ${member.name}`);
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
    <Card className="flex w-full max-w-sm flex-col gap-5 p-6 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground"
          aria-hidden="true"
        >
          {initials(OWNER_ACCOUNT.name)}
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold">{OWNER_ACCOUNT.name}</h1>
          <p className="text-muted-foreground">{ROLE_LABEL[OWNER_ACCOUNT.role]}</p>
        </div>
      </div>

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
          (error ?? "Enter your 4-digit PIN.")
        )}
      </p>

      <NumPad
        label="PIN"
        value={pin}
        onChange={changePin}
        maxLength={PIN_LENGTH}
        className={cn(lockedFor > 0 && "pointer-events-none opacity-50")}
      />
      <Button
        size="lg"
        fullWidth
        disabled={pin.length !== PIN_LENGTH || lockedFor > 0}
        onClick={() => tryLogin(pin)}
      >
        <LogIn aria-hidden="true" /> Log in
      </Button>

      <p className="rounded-xl bg-surface-muted px-3 py-2 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Demo PIN:</span>{" "}
        {OWNER_ACCOUNT.pin}
      </p>
    </Card>
  );
}
