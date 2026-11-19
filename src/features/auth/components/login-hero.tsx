"use client";

import { ChefHat, CloudCheck, LayoutGrid, Receipt } from "lucide-react";
import Image from "next/image";
import { LogoMark } from "@/components/brand/logo-mark";
import { useNow } from "@/lib/hooks/use-now";
import { useSettingsStore } from "@/stores/settings-store";

/** The dining room photo chosen by the project owner (see public/images/login/CREDITS.md). */
const PHOTO_SRC = "/images/login/restaurant-interior.jpg";

const HIGHLIGHTS = [
  { icon: LayoutGrid, label: "Live floor plan" },
  { icon: ChefHat, label: "Kitchen display" },
  { icon: Receipt, label: "GST billing" },
  { icon: CloudCheck, label: "Works offline" },
];

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Each line of text fades up a moment after the one before. `both` keeps it
 * hidden until its turn and visible after. Off for "reduce motion".
 */
const REVEAL = "motion-safe:animate-[fade-up_0.8s_ease-out_both]";
const delay = (step: number) => ({ animationDelay: `${0.15 + step * 0.12}s` });

/**
 * THE LEFT SIDE OF LOGIN: a warm dining room with the restaurant's name,
 * today's date and what the POS does.
 *  - A teal veil runs left to right: deep behind the text, clear on the right,
 *    then the photo deepens into its own warm brown, which softens into the
 *    other half, so the two blend instead of meeting at a hard line.
 *    (On phones, top to bottom.)
 *  - The photo drifts very slowly, like a camera panning across the room.
 *  - A small glass card floats in the corner with a "live" pulse.
 * Fixed white-on-dark text (not the theme's), because it sits on a photo.
 */
export function LoginHero() {
  const restaurant = useSettingsStore((s) => s.restaurant.name);
  const now = useNow(); // date and time: browser only (its clock and time zone)

  return (
    <section
      aria-label={`${restaurant} restaurant`}
      className="relative isolate flex min-h-72 overflow-hidden bg-[#0b3b3d] text-white lg:min-h-dvh"
    >
      {/* The photo, slowly drifting */}
      <Image
        src={PHOTO_SRC}
        alt=""
        fill
        preload
        // A bit wider than the box: the slow zoom enlarges it up to 14%
        sizes="(min-width: 1024px) 65vw, 115vw"
        className="-z-20 object-cover object-center motion-safe:animate-[ken-burns_32s_ease-in-out_infinite_alternate]"
      />
      {/* Teal veil, left to right: deep behind the text, clear towards the right
          (top to bottom on phones, where the text spans the whole width) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#04211f]/60 to-[#04211f]/85 lg:bg-gradient-to-r lg:from-[#04211f]/90 lg:via-[#04211f]/55 lg:to-transparent" />
      {/* The join: the photo deepens into its own warm brown at the edge (the
          bottom edge on phones). The login layout carries that brown a little
          into the other half, so the two meet without a line. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-photo-shade lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:h-auto lg:w-56 lg:bg-gradient-to-r lg:via-photo-shade/60" />

      {/* Floating "live" card (big screens) */}
      <div
        aria-hidden="true"
        className="absolute top-10 right-36 hidden items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-md motion-safe:animate-[float_6s_ease-in-out_infinite] xl:flex"
      >
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full rounded-full bg-[#6db35a] opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex size-3 rounded-full bg-[#6db35a]" />
        </span>
        <span className="text-sm leading-tight">
          <span className="block font-semibold">Kitchen open</span>
          <span className="text-white/70">Tables ready for service</span>
        </span>
      </div>

      <div className="flex w-full flex-col justify-between gap-6 p-6 pb-14 sm:p-10 lg:pr-28 lg:pb-10">
        <div className={`flex items-center gap-3 ${REVEAL}`} style={delay(0)}>
          <LogoMark size={44} />
          <span className="font-display text-xl font-semibold">Restaurant POS</span>
        </div>

        <div className="flex flex-col gap-4">
          <p
            className={`text-sm font-semibold tracking-widest text-[#f0b54d] uppercase ${REVEAL}`}
            style={delay(1)}
          >
            {now === null ? " " : `${dateFormat.format(now)} · ${timeFormat.format(now)}`}
          </p>
          <h2
            className={`font-display text-4xl leading-tight font-semibold sm:text-6xl ${REVEAL}`}
            style={delay(2)}
          >
            {restaurant}
            {/* A mustard line that draws itself under the name */}
            <span
              aria-hidden="true"
              className="mt-3 block h-1 w-24 origin-left rounded-full bg-[#f0b54d] motion-safe:animate-[grow-x_1s_ease-out_both]"
              style={{ animationDelay: "0.7s" }}
            />
          </h2>
          <p className={`max-w-md text-lg text-white/85 ${REVEAL}`} style={delay(3)}>
            Tables, orders, the kitchen and every bill, in one place — even when the
            internet isn&apos;t.
          </p>
          <ul className="hidden flex-wrap gap-2 sm:flex" aria-label="What this POS does">
            {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={`flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold backdrop-blur ${REVEAL}`}
                style={delay(4 + i)}
              >
                <Icon className="size-4 text-[#f0b54d]" aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
