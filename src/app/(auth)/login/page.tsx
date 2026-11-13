import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

// Route: /login
// "(auth)" is a route group: the brackets keep it OUT of the URL.
// It lets login pages have their own layout, without the POS sidebar.
export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <p>Pick a staff member and enter a 4-digit PIN. (Built in Step 31)</p>
    </main>
  );
}
