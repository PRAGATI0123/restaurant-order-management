import type { Id } from "@/types/common";
import type { Staff } from "@/types/staff";
import { DomainError } from "../errors";

/**
 * STAFF RULES — so the restaurant can never lock itself out:
 *  - There must always be at least one manager (only managers change settings).
 *  - Nobody can remove themselves (log in as another manager to do it).
 */

/** Throws if this list of staff has no manager left. */
export function assertHasManager(staff: Staff[]): void {
  if (!staff.some((s) => s.role === "manager")) {
    throw new DomainError("Keep at least one manager, or nobody can change settings.");
  }
}

/** Adds a new staff member, or replaces an existing one (same id). */
export function saveStaffMember(staff: Staff[], member: Staff): Staff[] {
  const next = staff.some((s) => s.id === member.id)
    ? staff.map((s) => (s.id === member.id ? member : s))
    : [...staff, member];
  assertHasManager(next);
  return next;
}

export function removeStaffMember(
  staff: Staff[],
  id: Id,
  currentId: Id | undefined,
): Staff[] {
  if (id === currentId) {
    throw new DomainError("You can't remove yourself. Ask another manager.");
  }
  const next = staff.filter((s) => s.id !== id);
  assertHasManager(next);
  return next;
}
