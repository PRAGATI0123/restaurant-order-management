import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";

// Every page inside the (pos) folder gets the sidebar / top bar, and the
// AuthGate: you must be logged in, and the page must be part of your role.
// <Suspense> because the gate reads the URL (usePathname), which Next.js 16
// only knows in the browser for pages like /orders/[orderId].
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense fallback={<Skeleton className="h-[60vh] w-full" />}>
        <AuthGate>{children}</AuthGate>
      </Suspense>
    </AppShell>
  );
}
