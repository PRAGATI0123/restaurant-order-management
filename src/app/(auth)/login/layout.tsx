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
      {/* A faint teal and saffron glow, so the right side feels part of the same
          room. Both sit away from the left edge, which must stay the plain page
          colour: that's the colour the photo fades into, so there's no seam. */}
      <section className="relative flex flex-col bg-background bg-[radial-gradient(30rem_20rem_at_100%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_70%),radial-gradient(40rem_30rem_at_100%_100%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_70%)]">
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
