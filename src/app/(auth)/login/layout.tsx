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
      {/* A faint teal and saffron glow in the far corners, so the right side
          feels part of the same room */}
      <section className="relative isolate flex flex-col bg-background bg-[radial-gradient(30rem_20rem_at_100%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_70%),radial-gradient(40rem_30rem_at_100%_100%,color-mix(in_oklab,var(--accent)_8%,transparent),transparent_70%)]">
        {/* The photo's warm brown carried over the join and softening into this
            side (its left edge; its top edge on phones) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-16 bg-gradient-to-b from-photo-shade via-photo-shade/25 to-transparent lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-24 lg:bg-gradient-to-r"
        />
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-8 sm:px-8 lg:items-center lg:pl-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
