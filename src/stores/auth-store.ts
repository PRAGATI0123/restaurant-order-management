import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { NO_ATTEMPTS, verifyPin, type LoginAttempts } from "@/domain/auth/login";
import { assertCan, type Action } from "@/domain/auth/permissions";
import { DomainError } from "@/domain/errors";
import { sampleStaff } from "@/mocks/data/staff";
import type { Id } from "@/types/common";
import type { Staff } from "@/types/staff";

type AuthState = {
  /** Everyone who can log in: User 1–4, one per role. */
  staff: Staff[];
  /** Who is logged in on this device, if anyone. */
  currentStaffId?: Id;
  /**
   * True right after someone taps "Log out". Then the login screen starts
   * fresh, instead of offering to go back to the page the last person was on.
   */
  loggedOutByUser: boolean;
  /**
   * Wrong PINs on this device (not saved). Kept here, not on the PIN screen,
   * so going back and choosing another user can't dodge the 30 s lockout.
   */
  pinAttempts: LoginAttempts;
  setPinAttempts: (attempts: LoginAttempts) => void;

  /** Checks the PIN and logs this user in. Throws DomainError on a wrong PIN. */
  login: (staffId: Id, pin: string) => Staff;
  logout: () => void;
};

/**
 * THE AUTH STORE: who is logged in.
 *
 * Four users, one per role (manager, cashier, waiter, kitchen), all with the
 * same demo PIN. Each role sees only its own pages and buttons, and every
 * store action checks the role again (requirePermission).
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
      staff: sampleStaff,
      currentStaffId: undefined,
      loggedOutByUser: false,
      pinAttempts: NO_ATTEMPTS,
      setPinAttempts: (pinAttempts) => set({ pinAttempts }),

      login: (staffId, pin) => {
        const user = get().staff.find((s) => s.id === staffId);
        if (!user) throw new DomainError("Choose who is logging in.");
        const member = verifyPin(user, pin);
        set({
          currentStaffId: member.id,
          loggedOutByUser: false,
          pinAttempts: NO_ATTEMPTS,
        });
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
