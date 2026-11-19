"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, mainNav } from "@/config/nav";
import { canOpen } from "@/domain/auth/routes";
import { useCurrentStaff } from "@/features/auth/hooks";
import { cn } from "@/lib/utils/cn";

type Variant = "sidebar" | "pills";

/**
 * The list of main links: only the pages the logged-in role may open (a waiter
 * never sees Billing or Reports). Nobody logged in yet → no links.
 * `pathname` decides which one is highlighted; null means "don't highlight
 * anything" (used while the URL is still unknown).
 */
export function NavLinks({
  pathname,
  variant,
}: {
  pathname: string | null;
  variant: Variant;
}) {
  const me = useCurrentStaff();
  const links = me ? mainNav.filter((item) => canOpen(me.role, item.href)) : [];
  return (
    <ul className={cn(variant === "sidebar" ? "flex flex-col gap-1" : "flex gap-2")}>
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && isActivePath(pathname, href);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              // aria-current tells screen readers "you are here"
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 font-semibold transition-colors",
                variant === "sidebar" && "h-12 rounded-xl px-4",
                variant === "pills" &&
                  "h-11 rounded-full border border-border px-4 text-sm",
                active
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Same list, but it reads the current URL to highlight the active page.
 *
 * With Cache Components on, the URL of a page like /orders/A-102 isn't known
 * while Next.js pre-builds the page, so usePathname() has to wait. The layout
 * wraps this in <Suspense> with <NavLinks pathname={null} /> as the fallback:
 * the links show at once, and the highlight appears a moment later.
 */
export function ActiveNavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} variant={variant} />;
}
