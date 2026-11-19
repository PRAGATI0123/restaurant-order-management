import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { verifyPin } from "@/domain/auth/login";
import { assertCan, type Action } from "@/domain/auth/permissions";
import { removeStaffMember, saveStaffMember } from "@/domain/auth/staff-rules";
import { DomainError } from "@/domain/errors";
import { newId } from "@/lib/utils/id";
import { sampleStaff } from "@/mocks/data/staff";
import type { Id } from "@/types/common";
import type { Staff } from "@/types/staff";

type AuthState = {
  staff: Staff[];
  /** Who is logged in on this device, if anyone. */
  currentStaffId?: Id;
  /**
   * True right after someone taps "Log out". Then the login screen starts
   * fresh, instead of offering to go back to the page the last person was on.
   */
  loggedOutByUser: boolean;

  /** Checks the PIN and logs in. Throws DomainError on a wrong PIN. */
  login: (staffId: Id, pin: string) => Staff;
  logout: () => void;
  /** Add (no id) or edit (with id) a staff member. Managers only. */
  saveStaff: (member: Omit<Staff, "id"> & { id?: Id }) => Staff;
  removeStaff: (staffId: Id) => void;
};

/**
 * THE AUTH STORE: the staff list and who is logged in.
 *
 * Only the login itself (currentStaffId) is remembered, in sessionStorage:
 * it survives a page refresh but not closing the browser tab, like a shift
 * at a shared till. The staff list is saved with everything else in Step 19.
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

      login: (staffId, pin) => {
        const member = verifyPin(get().staff, staffId, pin);
        set({ currentStaffId: member.id, loggedOutByUser: false });
        return member;
      },

      logout: () => set({ currentStaffId: undefined, loggedOutByUser: true }),

      saveStaff: ({ id, ...details }) => {
        requirePermission("settings.edit");
        const member: Staff = { id: id ?? newId("staff"), ...details };
        set({ staff: saveStaffMember(get().staff, member) });
        return member;
      },

      removeStaff: (staffId) => {
        requirePermission("settings.edit");
        set({ staff: removeStaffMember(get().staff, staffId, get().currentStaffId) });
      },
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
