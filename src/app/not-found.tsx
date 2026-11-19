import { House, SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";

// Shown for any URL that has no matching page, e.g. /abc
// The way out is the login page, not the dashboard: not every role may open
// the dashboard, and the login page offers "Continue as …" to whoever is
// logged in, which takes them to their own start page.
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
          <ButtonLink href="/login">
            <House aria-hidden="true" /> Back to the start
          </ButtonLink>
        }
      />
    </main>
  );
}
