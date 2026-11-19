import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginHero } from "@/features/auth/components/login-hero";

// Shared by both login pages (/login and /login/[userId]): the restaurant on the
// left, the login steps on the right. Because it's a layout, the photo side
// stays put while you move between choosing a user and typing the PIN.
// On phones and portrait tablets the photo side becomes a banner on top.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[1.15fr_1fr]">
      <LoginHero />
      <section className="flex flex-col bg-background">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-8 sm:px-8 lg:items-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
