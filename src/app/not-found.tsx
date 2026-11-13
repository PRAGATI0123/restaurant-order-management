import { LayoutDashboard, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";

// Shown for any URL that has no matching page, e.g. /abc
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        titleAs="h1"
        description="This page doesn't exist. It may have been moved, or the link has a typo."
        className="w-full max-w-md bg-surface"
        action={
          <ButtonLink href="/dashboard">
            <LayoutDashboard aria-hidden="true" /> Go to dashboard
          </ButtonLink>
        }
      />
    </main>
  );
}
