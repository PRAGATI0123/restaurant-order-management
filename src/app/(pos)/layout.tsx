import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Every page inside the (pos) folder is wrapped by this layout.
// Right now it is only a plain list of links so we can click through all pages.
// In Step 32 it becomes the real sidebar + top bar, filtered by the user's role.
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tables", label: "Tables" },
  { href: "/orders", label: "Orders" },
  { href: "/kitchen", label: "Kitchen" },
  { href: "/menu", label: "Menu" },
  { href: "/billing", label: "Billing" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav aria-label="Main">
        <ul>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          <li>
            <Link href="/login">Log out</Link>
          </li>
        </ul>
        <ThemeToggle />
      </nav>
      <hr />
      {children}
    </div>
  );
}
