"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { canOpen, homeFor } from "@/domain/auth/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthReady, useCurrentStaff } from "../hooks";

/**
 * GUARDS EVERY POS PAGE.
 *  - Nobody logged in → off to /login (and back here afterwards, unless they
 *    tapped "Log out" themselves).
 *  - Logged in, but this page isn't for your role → a friendly "not for your
 *    role" message with a button to your own start page.
 *  - Otherwise → the page.
 *
 * This is about showing the right screens. The real protection is in the
 * stores: every action checks the role again (requirePermission).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useAuthReady();
  const me = useCurrentStaff();
  const loggedOutByUser = useAuthStore((s) => s.loggedOutByUser);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready || me) return;
    // Sent here by a link or an old tab: come back to this page after logging in.
    // Logged out on purpose (end of shift): the next person starts fresh.
    router.replace(
      loggedOutByUser ? "/login" : `/login?next=${encodeURIComponent(pathname)}`,
    );
  }, [ready, me, loggedOutByUser, pathname, router]);

  if (!ready || !me) return <Skeleton className="h-[60vh] w-full" />;

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
