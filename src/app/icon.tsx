import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/brand/logo-mark";

/**
 * THE APP ICONS, generated from the logo component (no image files).
 * Next.js serves each one at /icon/<id> and adds the <link rel="icon"> tags:
 *  - 32 px: the browser tab and bookmarks
 *  - 192 px and 512 px: "Add to home screen" on Android tablets (manifest.ts)
 * (docs: file-conventions/metadata/app-icons, functions/generate-image-metadata)
 */
const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const px = Number(await id);
  return new ImageResponse(<LogoMark size={px} />, { width: px, height: px });
}
