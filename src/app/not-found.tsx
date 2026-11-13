import Link from "next/link";

// Shown for any URL that has no matching page, e.g. /abc
export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>This page does not exist.</p>
      <Link href="/dashboard">Go to dashboard</Link>
    </main>
  );
}
