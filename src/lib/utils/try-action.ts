import { toast } from "sonner";
import { DomainError } from "@/domain/errors";

/**
 * Runs a store action. If a business rule says no (DomainError), shows the
 * rule's own message as a red toast and returns false. Any other error is a
 * real bug, so it is NOT hidden: it's thrown again.
 *
 *   if (tryAction(() => moveOrderToTable(id, "t5"))) toast.success("Moved");
 */
export function tryAction(action: () => void): boolean {
  try {
    action();
    return true;
  } catch (error) {
    if (error instanceof DomainError) {
      toast.error(error.message);
      return false;
    }
    throw error;
  }
}
