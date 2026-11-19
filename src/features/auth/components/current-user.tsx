"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL } from "@/domain/auth/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useCurrentStaff } from "../hooks";

/** "Meera Kapoor" → "MK" */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** Who is logged in: initials, name and role. Empty until the login is known. */
export function CurrentUser() {
  const me = useCurrentStaff();
  if (!me) return <div className="h-10" />;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
        aria-hidden="true"
      >
        {initials(me.name)}
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold">{me.name}</span>
        <span className="text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</span>
      </span>
    </div>
  );
}

/** Logs out and goes back to the login screen (e.g. at the end of a shift). */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const me = useCurrentStaff();
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    toast(me ? `${me.name} logged out` : "Logged out");
    router.replace("/login");
  }

  return compact ? (
    <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
      <LogOut aria-hidden="true" />
    </Button>
  ) : (
    <Button variant="ghost" size="sm" className="justify-start" onClick={handleLogout}>
      <LogOut aria-hidden="true" /> Log out
    </Button>
  );
}

/** The restaurant's name from Settings, under the app name in the header. */
export function RestaurantName() {
  const name = useSettingsStore((s) => s.restaurant.name);
  return <span className="text-xs text-muted-foreground">{name}</span>;
}
