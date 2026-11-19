"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { useNow } from "@/lib/hooks/use-now";
import { SHARED_PIN } from "@/mocks/data/staff";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthReady, useCurrentStaff } from "../hooks";
import { Avatar, destinationFor, greeting } from "../login-helpers";

/**
 * LOGIN, STEP 1: who's working? Just the names (with their role underneath).
 * Tapping a name opens step 2, the PIN page for that person.
 * If someone is still logged in on this device, they can continue instead.
 */
export function UserPicker() {
  const router = useRouter();
  const staff = useAuthStore((s) => s.staff);
  const ready = useAuthReady();
  const me = useCurrentStaff();
  const now = useNow();

  // Keep "?next=/orders" (where they were going) on the way to the PIN page.
  const choose = (id: string) => router.push(`/login/${id}${window.location.search}`);

  return (
    <div className="flex flex-col gap-6 motion-safe:animate-[fade-up_0.4s_ease-out]">
      <div>
        <p className="font-semibold text-primary">{greeting(now)}</p>
        <h1 className="font-display text-4xl font-semibold">Who&apos;s working?</h1>
        <p className="mt-1 text-muted-foreground">Tap your name to log in.</p>
      </div>

      {ready && me && (
        <button
          type="button"
          onClick={() => router.replace(destinationFor(me))}
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-left font-semibold hover:bg-primary/15"
        >
          <span>
            Continue as {me.name}
            <span className="block text-sm font-normal text-muted-foreground">
              Still logged in on this device
            </span>
          </span>
          <ArrowRight className="size-5 text-primary" aria-hidden="true" />
        </button>
      )}

      <ul className="flex flex-col gap-3" aria-label="Staff">
        {staff.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => choose(member.id)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-surface p-3 pr-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:border-primary motion-reduce:hover:translate-y-0"
            >
              <Avatar member={member} size="md" />
              <span className="flex-1">
                <span className="block text-lg font-semibold">{member.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {ROLE_LABEL[member.role]}
                </span>
              </span>
              <ChevronRight
                className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-center text-sm text-muted-foreground">
        Demo: every user&apos;s PIN is{" "}
        <span className="font-semibold text-foreground">{SHARED_PIN}</span>
      </p>
    </div>
  );
}
