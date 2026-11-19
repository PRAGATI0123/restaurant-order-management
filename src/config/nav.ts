import {
  Armchair,
  ChartColumn,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * The main navigation, used by the sidebar (big screens) and the top bar
 * (phones and tablets in portrait). One list, so the two can never disagree.
 * Each role sees only the pages it may open (domain/auth/routes.ts).
 */
export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Tables", icon: Armchair },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** True when `pathname` is this link's page or any page under it. */
export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
