"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { canOpen, homeFor } from "@/domain/auth/routes";
import { useDataReady } from "@/lib/persistence/load-saved-data";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthReady, useCurrentStaff } from "../hooks";

/**
 * GUARDS EVERY POS PAGE.
 *  - Nobody logged in → off to /login (and back here afterwards, unless they
 *    tapped "Log out" themselves).
 *  - Logged in, but this page isn't for your role → a friendly "not for your
 *    role" message with a button to your own start page.
 *  - Otherwise → the page, once the data saved on this device has loaded
 *    (IndexedDB). Until then: a loading screen, so nobody ever sees or edits
 *    the sample data for a moment before their own appears.
 *
 * This is about showing the right screens. The real protection is in the
 * stores: every action checks the role again (requirePermission).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const authReady = useAuthReady();
  const dataReady = useDataReady();
  const me = useCurrentStaff();
  const loggedOutByUser = useAuthStore((s) => s.loggedOutByUser);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || me) return;
    // Sent here by a link or an old tab: come back to this page after logging in.
    // Logged out on purpose (end of shift): the next person starts fresh.
    router.replace(
      loggedOutByUser ? "/login" : `/login?next=${encodeURIComponent(pathname)}`,
    );
  }, [authReady, me, loggedOutByUser, pathname, router]);

  if (!authReady || !me || !dataReady) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <span className="text-sm text-muted-foreground">
          Loading your restaurant data…
        </span>
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (!canOpen(me.role, pathname)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        titleAs="h1"
        title="This page isn't part of your role"
        description={`You're logged in as ${me.name} (${ROLE_LABEL[me.role]}). Ask a manager if you need it.`}
        className="bg-surface"
        action={<ButtonLink href={homeFor(me.role)}>Go to my start page</ButtonLink>}
      />
    );
  }
  return children;
}
