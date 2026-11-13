import type { Metadata } from "next";
import { Brand } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginPanel } from "@/features/auth/components/login-panel";

export const metadata: Metadata = { title: "Login" };

// Route: /login
// "(auth)" is a route group: the brackets keep it OUT of the URL, and its pages
// don't get the POS sidebar, because nobody is logged in yet.
export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-5">
        <Brand />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">
        <LoginPanel />
      </div>
    </main>
  );
}
