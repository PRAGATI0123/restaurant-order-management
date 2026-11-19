import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types/staff";

/**
 * Logs someone of this role in, for store tests. Stores check permissions on
 * every action, so tests act as a real person would. The owner is the only
 * real account (a manager); for other roles a test person is added.
 */
export function loginAs(role: Role): void {
  const { staff } = useAuthStore.getState();
  const member = staff.find((s) => s.role === role) ?? {
    id: `test-${role}`,
    name: `Test ${role}`,
    role,
    pin: "0000",
  };
  useAuthStore.setState({
    staff: staff.some((s) => s.id === member.id) ? staff : [...staff, member],
    currentStaffId: member.id,
  });
}

/** Back to the starting state: the owner account only, nobody logged in. */
export function resetAuth(): void {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
}
