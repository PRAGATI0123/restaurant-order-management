"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Wraps the app once (in app/layout.tsx) so every component can read and change
// the theme with `useTheme()`.
//
// - attribute="class": adds class="dark" to <html> in dark mode. globals.css
//   uses that class to swap the color variables.
// - defaultTheme="system": the first time, follow the device's own light/dark setting.
// - enableSystem: allow "system" as a choice.
// - disableTransitionOnChange: switch instantly, without every color fading at once.
//
// The user's choice is saved in localStorage, so it survives a refresh.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
