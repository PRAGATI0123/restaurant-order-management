import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types/staff";

/**
 * Logs a sample staff member of this role in, for store tests. Stores check
 * permissions on every action, so tests act as a real person would.
 */
export function loginAs(role: Role): void {
  const member = useAuthStore.getState().staff.find((s) => s.role === role);
  if (!member) throw new Error(`No sample staff member with role ${role}`);
  useAuthStore.setState({ currentStaffId: member.id });
}

/** Back to the sample staff list, nobody logged in. */
export function resetAuth(): void {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
}
