import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

// Fonts are downloaded at build time and served from our own app, so no request
// goes to Google when someone opens the POS. Both are "variable" fonts: one file
// holds every weight (400, 500, 600, 700…).

// Body / interface font: clean, very readable on touch screens.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

// Display font for headings and the brand name: a warm serif with a bistro feel.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // "default" is used when a page sets no title.
  // "template" wraps every page's own title: "Kitchen" becomes "Kitchen · Restaurant POS".
  title: {
    default: "Restaurant POS",
    template: "%s · Restaurant POS",
  },
  description: "Touchscreen POS and table management for restaurants",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes adds class="dark" to <html> before React
    // starts, so the server HTML and the browser HTML differ on purpose here.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
