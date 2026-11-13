import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UiPreview } from "./ui-preview";

export const metadata: Metadata = { title: "UI Preview" };

// Route: /dev/ui
// Shows every component from components/ui so we can try them by hand.
// Hidden in production, like /dev/theme.
export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiPreview />;
}
