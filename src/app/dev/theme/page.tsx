import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Theme Preview" };

// Route: /dev/theme
// A developer page that shows every theme color and font, so we can check the
// design in light and dark mode. It is hidden in the production build.

// Tailwind only creates classes it can find written out in full in our code.
// So each class is spelled out here; we never build names like `bg-${name}`.
const brandSwatches = [
  {
    name: "primary",
    note: "teal velvet chairs",
    className: "bg-primary text-primary-foreground",
  },
  {
    name: "accent",
    note: "mustard chairs",
    className: "bg-accent text-accent-foreground",
  },
  { name: "wood", note: "walnut floor", className: "bg-wood text-wood-foreground" },
  { name: "success", note: "plants", className: "bg-success text-success-foreground" },
  { name: "danger", note: "brick wall", className: "bg-danger text-danger-foreground" },
  { name: "steel", note: "steel frame", className: "bg-steel text-steel-foreground" },
];

const surfaceSwatches = [
  { name: "background", className: "bg-background" },
  { name: "surface", className: "bg-surface" },
  { name: "surface-muted", className: "bg-surface-muted" },
];

const tableStates = [
  { name: "Available", className: "bg-table-available" },
  { name: "Occupied", className: "bg-table-occupied" },
  { name: "Reserved", className: "bg-table-reserved" },
  { name: "Cleaning", className: "bg-table-cleaning" },
];

export default function ThemePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-10 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Theme Preview</h1>
          <p className="text-muted-foreground">
            Colors taken from the restaurant photo. Use the button to switch modes.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Brand colors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {brandSwatches.map((s) => (
            <div key={s.name} className={`rounded-xl p-4 ${s.className}`}>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Surfaces and text</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {surfaceSwatches.map((s) => (
            <div
              key={s.name}
              className={`rounded-xl border border-border p-4 ${s.className}`}
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-muted-foreground">muted text sample</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Table states</h2>
        <div className="flex flex-wrap gap-4">
          {tableStates.map((t) => (
            <div key={t.name} className="flex items-center gap-2">
              <span className={`size-4 rounded-full ${t.className}`} aria-hidden="true" />
              <span>{t.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Fonts</h2>
        <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
          <p className="font-display text-3xl">Fraunces: The Velvet Bistro</p>
          <p className="text-lg">Plus Jakarta Sans: Table 4 · 2 × Paneer Tikka</p>
          {/* tabular-nums: every digit has the same width, so prices line up */}
          <p className="text-lg tabular-nums">₹1,111.00 ₹ 999.50 ₹ 120.00</p>
        </div>
      </section>
    </main>
  );
}
