import Link from "next/link";

// Route: /
// For now this is a simple start page. Later it will send users straight to /login.
export default function HomePage() {
  return (
    <main>
      <h1>Restaurant POS</h1>
      <p>Start page. Pick where to go:</p>
      <ul>
        <li>
          <Link href="/login">Login</Link>
        </li>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
      </ul>
    </main>
  );
}
