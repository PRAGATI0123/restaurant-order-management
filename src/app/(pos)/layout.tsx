import { AppShell } from "@/components/layout/app-shell";

// Every page inside the (pos) folder gets the sidebar / top bar.
// In Step 10 this layout also checks that someone is logged in and that their
// role may open the page.
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
