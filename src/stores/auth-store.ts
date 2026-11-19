import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { verifyPin } from "@/domain/auth/login";
import { assertCan, type Action } from "@/domain/auth/permissions";
import { DomainError } from "@/domain/errors";
import { OWNER_ACCOUNT } from "@/mocks/data/staff";
import type { Id } from "@/types/common";
import type { Staff } from "@/types/staff";

type AuthState = {
  /** Everyone who can act in the app. Today that's one account: the owner. */
  staff: Staff[];
  /** Who is logged in on this device, if anyone. */
  currentStaffId?: Id;
  /**
   * True right after someone taps "Log out". Then the login screen starts
   * fresh, instead of offering to go back to the page the last person was on.
   */
  loggedOutByUser: boolean;

  /** Checks the PIN and logs the owner in. Throws DomainError on a wrong PIN. */
  login: (pin: string) => Staff;
  logout: () => void;
};

/**
 * THE AUTH STORE: who is logged in.
 *
 * There is ONE account (the owner, Pragati Gautam, PIN 1234). The role and
 * permission checks still run on every action, so more staff with their own
 * roles can be added later without changing any screen.
 *
 * Only the login itself (currentStaffId) is remembered, in sessionStorage:
 * it survives a page refresh but not closing the browser tab.
 *
 * `skipHydration`: the server has no sessionStorage, so the login is read
 * back only in the browser, by <AuthGate> once the page has loaded. That
 * keeps the server's HTML and the browser's first draw identical.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      staff: [OWNER_ACCOUNT],
      currentStaffId: undefined,
      loggedOutByUser: false,

      login: (pin) => {
        const owner = get().staff.find((s) => s.id === OWNER_ACCOUNT.id) ?? OWNER_ACCOUNT;
        const member = verifyPin(owner, pin);
        set({ currentStaffId: member.id, loggedOutByUser: false });
        return member;
      },

      logout: () => set({ currentStaffId: undefined, loggedOutByUser: true }),
    }),
    {
      name: "restaurant-pos-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ currentStaffId: state.currentStaffId }),
      skipHydration: true,
    },
  ),
);

/** The staff member logged in right now, if any (outside React). */
export function currentStaff(): Staff | undefined {
  const { staff, currentStaffId } = useAuthStore.getState();
  return staff.find((s) => s.id === currentStaffId);
}

/**
 * Every store action that changes something calls this FIRST. It returns who
 * is doing it (for "by" in the order timeline), or throws a readable error:
 *   "A waiter can't take payments. Ask a manager."
 * Buttons are hidden for roles that can't use them; this is the real check.
 */
export function requirePermission(action: Action): Staff {
  const me = currentStaff();
  if (!me) throw new DomainError("Log in first.");
  assertCan(me.role, action);
  return me;
}
