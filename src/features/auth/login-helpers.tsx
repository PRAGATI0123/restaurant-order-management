import { Banknote, ChefHat, Store, Utensils, type LucideIcon } from "lucide-react";
import { mainNav } from "@/config/nav";
import { canOpen, homeFor } from "@/domain/auth/routes";
import { cn } from "@/lib/utils/cn";
import type { Role, Staff } from "@/types/staff";

/** Each role's icon and avatar colour, so people spot their own tile fast. */
export const ROLE_LOOK: Record<Role, { icon: LucideIcon; avatar: string }> = {
  manager: { icon: Store, avatar: "bg-primary text-primary-foreground" },
  cashier: { icon: Banknote, avatar: "bg-accent text-accent-foreground" },
  waiter: { icon: Utensils, avatar: "bg-success text-success-foreground" },
  kitchen: { icon: ChefHat, avatar: "bg-wood text-wood-foreground" },
};

/** "Pragati Gautam" → "PG" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** A round avatar with the person's initials, in their role's colour. */
export function Avatar({ member, size }: { member: Staff; size: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        ROLE_LOOK[member.role].avatar,
        size === "md" ? "size-12 text-lg" : "size-20 text-3xl shadow-lg",
      )}
    >
      {initials(member.name)}
    </span>
  );
}

/** The pages a role can open, in menu order ("Tables", "Orders"). */
export function pagesFor(role: Role): string[] {
  return mainNav.filter((item) => canOpen(role, item.href)).map((item) => item.label);
}

/**
 * Where to go after logging in: back to the page that sent you to login
 * (?next=), if it's a page of this app and your role may open it; else your
 * start page. Read from the address bar only when logging in, in the browser.
 */
export function destinationFor(member: Staff): string {
  const next = new URLSearchParams(window.location.search).get("next");
  const safe = next !== null && next.startsWith("/") && !next.startsWith("//");
  return safe && canOpen(member.role, next) ? next : homeFor(member.role);
}

/** "Good morning" before 12, "Good afternoon" before 5 pm, then "Good evening". */
export function greeting(now: number | null): string {
  if (now === null) return "Welcome";
  const hour = new Date(now).getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
