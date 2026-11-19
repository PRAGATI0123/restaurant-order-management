import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PinEntry } from "@/features/auth/components/pin-entry";

export const metadata: Metadata = { title: "Enter PIN" };

// Route: /login/[userId]  e.g. /login/staff-waiter
// Step 2: the chosen person types their PIN.
// `params` is a Promise in Next.js 16: read inside <Suspense> (Cache Components).
export default function PinPage({ params }: PageProps<"/login/[userId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[34rem] w-full" />}>
      {params.then(({ userId }) => (
        <PinEntry staffId={userId} />
      ))}
    </Suspense>
  );
}
