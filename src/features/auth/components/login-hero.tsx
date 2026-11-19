"use client";

import { CloudCheck, LayoutGrid, Receipt, ChefHat } from "lucide-react";
import Image from "next/image";
import { LogoMark } from "@/components/brand/logo-mark";
import { useNow } from "@/lib/hooks/use-now";
import { useSettingsStore } from "@/stores/settings-store";

/** Six of the sample dish photos, for the collage. */
const PHOTOS = [
  "/images/menu/butter-chicken.jpg",
  "/images/menu/paneer-tikka.jpg",
  "/images/menu/chicken-biryani.jpg",
  "/images/menu/garlic-naan.jpg",
  "/images/menu/gulab-jamun.jpg",
  "/images/menu/sweet-lassi.jpg",
];

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
 * THE LEFT SIDE OF LOGIN: a collage of the restaurant's dishes under a deep
 * teal veil, with the restaurant's name, today's date and what the POS does.
 * Fixed white-on-dark colours (not the theme's), because it sits on photos.
 * On phones it shrinks to a banner above the login.
 */
export function LoginHero() {
  const restaurant = useSettingsStore((s) => s.restaurant.name);
  const now = useNow(); // date and time: browser only (its clock and time zone)

  return (
    <section
      aria-label={`${restaurant} restaurant`}
      className="relative isolate flex min-h-56 overflow-hidden bg-[#0b3b3d] text-white lg:min-h-dvh"
    >
      {/* Photo collage */}
      <div className="absolute inset-0 -z-10 grid grid-cols-3 grid-rows-2 gap-1">
        {PHOTOS.map((src) => (
          <div key={src} className="relative overflow-hidden">
            <Image
              src={src}
              alt=""
              fill
              sizes="(min-width: 1024px) 20vw, 33vw"
              // All six are visible at once: load them straight away (Next.js LCP advice).
              loading="eager"
              className="scale-105 object-cover motion-safe:animate-[hero-zoom_24s_ease-in-out_infinite_alternate]"
            />
          </div>
        ))}
      </div>
      {/* Teal veil: strong at the bottom, where the text is */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06292b] via-[#0b3b3d]/80 to-[#0b3b3d]/35" />

      <div className="flex w-full flex-col justify-between gap-6 p-6 sm:p-10">
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <span className="font-display text-xl font-semibold">Restaurant POS</span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold tracking-widest text-[#f0b54d] uppercase">
            {now === null ? " " : `${dateFormat.format(now)} · ${timeFormat.format(now)}`}
          </p>
          <h2 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
            {restaurant}
          </h2>
          <p className="max-w-md text-lg text-white/85">
            Tables, orders, the kitchen and every bill, in one place — even when the
            internet isn&apos;t.
          </p>
          <ul className="hidden flex-wrap gap-2 sm:flex" aria-label="What this POS does">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold backdrop-blur"
              >
                <Icon className="size-4 text-[#f0b54d]" aria-hidden="true" /> {label}
              </li>
            ))}
          </ul>
          <p className="hidden text-xs text-white/60 lg:block">
            Food photos: Wikimedia Commons and Flickr contributors (CC licences) ·{" "}
            <a href="/images/menu/CREDITS.md" className="underline underline-offset-2">
              credits
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
