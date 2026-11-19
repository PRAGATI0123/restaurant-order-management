"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { can, type Action } from "@/domain/auth/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { Staff } from "@/types/staff";

const persistApi = useAuthStore.persist;

/**
 * True once the browser has read back who is logged in (from sessionStorage).
 * Always false on the server and on the browser's first draw, so both draw the
 * same thing (a loading state), and there's no hydration error.
 */
export function useAuthReady(): boolean {
  const ready = useSyncExternalStore(
    (notify) => persistApi.onFinishHydration(notify),
    () => persistApi.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (!persistApi.hasHydrated()) void persistApi.rehydrate();
  }, []);
  return ready;
}

/** The staff member logged in on this device, or undefined. */
export function useCurrentStaff(): Staff | undefined {
  return useAuthStore((s) => s.staff.find((member) => member.id === s.currentStaffId));
}

/**
 * For hiding buttons a role can't use:  const can = useCan(); can("payment.take")
 * The store checks again when the action runs; this is only for a tidy screen.
 */
export function useCan(): (action: Action) => boolean {
  const role = useCurrentStaff()?.role;
  return useCallback((action: Action) => role !== undefined && can(role, action), [role]);
}
