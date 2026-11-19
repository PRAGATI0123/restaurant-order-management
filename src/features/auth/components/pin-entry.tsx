"use client";

import { ArrowLeft, Lock, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/ui/num-pad";
import { PIN_LENGTH, afterWrongPin, secondsLocked } from "@/domain/auth/login";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { DomainError } from "@/domain/errors";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { SHARED_PIN } from "@/mocks/data/staff";
import { useAuthStore } from "@/stores/auth-store";
import type { Id } from "@/types/common";
import { Avatar, destinationFor, pagesFor } from "../login-helpers";

/** Back to step 1, keeping "?next=…" (read from the address bar when tapped). */
function BackToUsers() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/login${window.location.search}`)}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Not you? Choose another user
    </button>
  );
}

/**
 * LOGIN, STEP 2: the chosen person and their PIN. Logs in as soon as the 4th
 * digit is typed, on the pad or the keyboard. 5 wrong PINs in a row lock it
 * for 30 seconds (domain/auth/login.ts); the count lives in the auth store,
 * so going back and choosing someone else doesn't reset it.
 */
export function PinEntry({ staffId }: { staffId: Id }) {
  const router = useRouter();
  const member = useAuthStore((s) => s.staff.find((m) => m.id === staffId));
  const login = useAuthStore((s) => s.login);
  const attempts = useAuthStore((s) => s.pinAttempts);
  const setAttempts = useAuthStore((s) => s.setPinAttempts);
  const now = useNow(1000); // for the lock countdown

  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>();
  const [shakes, setShakes] = useState(0); // bump to replay the shake
  const lockedFor = now === null ? 0 : secondsLocked(attempts, now);

  function tryLogin(fullPin: string) {
    if (!member) return;
    try {
      const me = login(member.id, fullPin);
      toast.success(`Welcome, ${me.name}`, {
        description: `Logged in as ${ROLE_LABEL[me.role]}`,
      });
      router.replace(destinationFor(me));
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      // The 1-second clock is exact enough for a 30-second lock (and keeps render pure).
      const next = afterWrongPin(attempts, now ?? 0);
      setAttempts(next);
      setPin("");
      setShakes((n) => n + 1);
      // While locked, the countdown below says what to do; otherwise, why it failed.
      setError(next.lockedUntil !== undefined ? undefined : e.message);
    }
  }

  function changePin(value: string) {
    if (lockedFor > 0) return;
    setError(undefined);
    setPin(value);
    if (value.length === PIN_LENGTH) tryLogin(value);
  }

  // A keyboard works too: digits, Backspace, Enter.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (/^\d$/.test(event.key) && pin.length < PIN_LENGTH) changePin(pin + event.key);
      else if (event.key === "Backspace") changePin(pin.slice(0, -1));
      else if (event.key === "Enter" && pin.length === PIN_LENGTH) tryLogin(pin);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!member) {
    return (
      <div className="flex flex-col gap-4">
        <BackToUsers />
        <h1 className="font-display text-3xl font-semibold">User not found</h1>
        <p className="text-muted-foreground">
          This user isn&apos;t on the staff list. Go back and choose your name.
        </p>
      </div>
    );
  }

  const pages = pagesFor(member.role);

  return (
    <div className="flex flex-col gap-4 motion-safe:animate-[fade-up_0.4s_ease-out]">
      <BackToUsers />

      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar member={member} size="lg" />
        <div>
          <h1 className="font-display text-3xl font-semibold">{member.name}</h1>
          <p className="font-semibold text-primary">{ROLE_LABEL[member.role]}</p>
        </div>
        <ul
          className="flex flex-wrap justify-center gap-1.5"
          aria-label="Pages you'll see"
        >
          {pages.map((page) => (
            <li
              key={page}
              className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
            >
              {page}
            </li>
          ))}
        </ul>
      </div>

      <div
        key={shakes}
        role="img"
        aria-label={`${pin.length} of ${PIN_LENGTH} PIN digits entered`}
        className={cn(
          "flex h-16 items-center justify-center gap-4 rounded-2xl border border-border bg-surface",
          shakes > 0 && "motion-safe:animate-[shake_0.35s_ease-in-out]",
        )}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-4 rounded-full transition-colors",
              i < pin.length ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>

      <p
        role="alert"
        className={cn(
          "-my-1 min-h-6 text-center text-sm font-semibold",
          error ? "text-danger" : "text-muted-foreground",
        )}
      >
        {lockedFor > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-danger">
            <Lock className="size-4" aria-hidden="true" /> Locked. Try again in{" "}
            {lockedFor} s.
          </span>
        ) : (
          (error ?? "Enter your 4-digit PIN")
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

      <p className="text-center text-sm text-muted-foreground">
        Demo PIN: <span className="font-semibold text-foreground">{SHARED_PIN}</span>
      </p>
    </div>
  );
}
